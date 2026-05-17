# Protection Device Database

A web application for managing protection relays in electrical power systems — built for Contact Energy's engineering team. Tracks device metadata, KKS identifiers, maintenance history, master settings revisions, protection element configurations, and standalone protection reports.

Multi-user with role-based access (user / admin). Deployed on a Raspberry Pi and accessible over Tailscale Funnel.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Runtime | Bun |
| Language | TypeScript |
| Styling | TailwindCSS v4 |
| Database | SQLite via better-sqlite3 (no ORM, raw SQL) |
| Auth | better-auth (email/password, session cookies) |
| Deployment | Raspberry Pi + Tailscale Funnel |

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.1+
- Node is not required — Bun handles everything

### First-time setup

```bash
bun install

# Initialise the database and seed ANSI device number library
bun run init-db

# Create the first admin user
bun run seed-admin

# Start the dev server
bun --bun run dev
```

> **Important:** Always start with `bun --bun run dev` (not `bun run dev`). The `--bun` flag ensures better-sqlite3's native bindings are resolved correctly under Bun's runtime.

Open [http://localhost:3000](http://localhost:3000) and sign in with the admin credentials you set in `seed-admin`.

### Environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
BETTER_AUTH_SECRET=<random 32+ character string>
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:3000
```

For production (Raspberry Pi), replace `localhost:3000` with your network IP or Tailscale address.

---

## Database Migrations

Migrations are idempotent TypeScript scripts in `scripts/`. Run them with:

```bash
npx tsx scripts/<migration-name>.ts
```

Available migrations (apply in order if setting up a fresh database after `init-db`):

| Script | Purpose |
|---|---|
| `migrate-add-parts.ts` | Add relay type catalog (parts + manuals) |
| `migrate-part-enhancements.ts` | Additional fields on parts table |
| `migrate-ansi-elements.ts` | ANSI device numbers and protection elements |
| `migrate-add-maintenance-period.ts` | Maintenance period and EIPC flag on devices |
| `migrate-add-data-reports.ts` | Analytics / saved report definitions |

> `init-db.ts` is the baseline. If starting fresh, run it first — it creates all tables and seeds the ANSI device number library.

---

## Production Build

```bash
bun --bun run build
bun --bun run start
```

---

## Project Structure

```
app/
  (protected)/          ← all authenticated page routes (wrapped in sidebar layout)
    dashboard/          ← device tree
    devices/[id]/       ← device detail, edit, settings, elements, maintenance
    reports/            ← protection report library
    analytics/          ← run / save data reports
    parts/              ← relay type catalog (admin)
    form-templates/     ← dynamic form schema editor (admin)
    ansi-device-numbers/ ← ANSI code library
    users/              ← user management (admin)
    admin/database/     ← backup / restore / clear (admin)
  api/                  ← all REST endpoints
  page.tsx              ← login / landing page

components/             ← reusable React components
lib/                    ← server-side data layer (db, queries, files)
scripts/                ← one-off db init & migration scripts
data/                   ← SQLite database file (app.db)
public/uploads/         ← compressed file storage (reports, settings, test results)
```

See `manual.md` for the user manual — written for engineers using the app day-to-day.

See `spec.md` for the full technical specification including database schema, all API endpoints, and architectural decisions.

See `deploy.md` for step-by-step Raspberry Pi deployment instructions.

# CLAUDE.md

Read @spec.md for the full application spec, data model, API routes, and page structure.

Keep replies short and concise.

Use mcp context7 for up-to-date, version-specific library docs.

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun install` instead of `npm install`
- Use `bun run <script>` instead of `npm run <script>`
- Use `bunx <package>` instead of `npx <package>`
- Bun automatically loads .env — do not use dotenv

## CRITICAL: Dev & prod startup

Always start with `--bun` so Bun's runtime is used server-side (required for `bun:sqlite`):

```bash
bun --bun run dev    # development
bun --bun run start  # production
```

Running `bun run dev` without `--bun` causes "Cannot find module 'bun:sqlite'" errors.

## Network access

App is accessed from network IP 192.168.10.64:3000.
`.env.local` BETTER_AUTH_URL must match the IP used in the browser.
`next.config.ts` allowedDevOrigins must include the IP.

## APIs

- `bun:sqlite` for SQLite. Do not use `better-sqlite3`.
- `Bun.file` over `node:fs` readFile/writeFile
- `Bun.$` instead of execa

## Testing

Use `bun test`.

## Architecture rules

- `lib/db.ts` — query/get/run helpers only
- `lib/*.ts` — one repository file per domain entity (devices, reports, maintenance, etc.)
- Route handlers are thin — delegate all DB work to lib/ repositories
- Always `export const dynamic = "force-dynamic"` on every route handler
- Always check session before any DB work in route handlers
- `bun:sqlite` must never be imported at module level in Next.js files — use lazy/dynamic import (build-time failure otherwise)
- All file uploads: receive → compress to .gz → store → save path in DB
- All file downloads: read .gz → decompress → stream to client
- Path traversal: always `path.basename()` on user-supplied filenames before file ops
- KKS full string assembled from parts in lib/devices.ts, stored as kks_full (UNIQUE)

## Roles

- `user` — default, full access to devices/maintenance/reports
- `admin` — additionally can manage form templates (`/form-templates`)
- Role stored on better-auth user via `additionalFields`

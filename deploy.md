# Deploying to Raspberry Pi

This guide covers a complete first-time deployment of the Protection Device Database on a Raspberry Pi, including keeping it running as a system service and exposing it securely over the internet via Tailscale Funnel.

---

## Hardware requirements

| | Minimum | Recommended |
|---|---|---|
| Model | Raspberry Pi 4 — 4 GB RAM | Raspberry Pi 4 — 8 GB / Pi 5 |
| SD card | 16 GB | 32 GB |
| OS | Raspberry Pi OS Lite (64-bit) | Raspberry Pi OS Lite (64-bit) |

> **RAM is the critical constraint.** The Next.js production build peaks at ~1.5 GB. A 2 GB Pi may OOM during `bun run build`. A 1 GB Pi will not work.
>
> **Why 64-bit OS?** `better-sqlite3` is a native C++ module compiled during `bun install`. It must match the OS architecture. The 64-bit (aarch64) OS is required — the 32-bit (armhf) variant will not produce a working binary.

---

## Disk footprint on the Pi

| | Size |
|---|---|
| Source code (cloned from GitHub) | ~14 MB |
| `node_modules` (after `bun install`) | ~700 MB |
| `.next` build output | ~1.3 GB |
| Database + uploads (grows over time) | varies |
| **Total at first install** | **~2 GB** |

A 32 GB SD card leaves comfortable headroom as the database and uploaded files grow.

---

## Step 1 — Prepare the Pi

SSH into your Pi and install the required system packages:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git build-essential python3
```

> `build-essential` and `python3` are required to compile `better-sqlite3` from source during `bun install`. Without them the install will fail.

---

## Step 2 — Install Bun

```bash
curl -fsSL https://bun.sh/install | bash

# Add Bun to the current shell session
source ~/.bashrc
```

Verify the install:

```bash
bun --version
```

---

## Step 3 — Clone the repository

```bash
cd ~
git clone https://github.com/<your-username>/protection-device-db.git
cd protection-device-db
```

---

## Step 4 — Create runtime directories

These folders are excluded from git and must be created manually:

```bash
mkdir -p data
mkdir -p public/uploads
```

---

## Step 5 — Configure environment variables

```bash
cp .env.example .env.local
nano .env.local
```

Fill in all four variables. Replace `<pi-ip>` with your Pi's local network IP address (e.g. `192.168.1.50`):

```bash
BETTER_AUTH_SECRET=<paste a long random string here>
BETTER_AUTH_URL=http://<pi-ip>:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://<pi-ip>:3000
BETTER_AUTH_TRUSTED_ORIGINS=http://<pi-ip>:3000
```

To generate a secure secret:

```bash
openssl rand -hex 32
```

> If you later set up Tailscale Funnel (Step 9), you will need to update these values to your Tailscale URL and rebuild.

---

## Step 6 — Install dependencies

This step compiles `better-sqlite3` for the Pi's ARM64 architecture. It will take a few minutes:

```bash
bun install
```

---

## Step 7 — Initialise the database

Run once to create all tables and seed the ANSI device number library:

```bash
bun run init-db
```

If you are migrating from a previous version of the app, also run the migration scripts in order:

```bash
bun run migrate
```

---

## Step 8 — Create the first admin account

```bash
bun run seed-admin
```

Follow the prompts to set the admin email and password. Additional users can be created from the app once it is running.

---

## Step 9 — Build the application

The `--bun` flag is required so that Bun uses its own runtime rather than Node.js mode — this is necessary for `better-sqlite3`'s native bindings to resolve correctly:

```bash
bun --bun run build
```

This will take several minutes on a Pi 4. You should see output ending with:

```
✓ Compiled successfully
✓ Generating static pages
```

---

## Step 10 — Test the server

Before setting up the system service, confirm the app runs:

```bash
bun --bun run start
```

Open `http://<pi-ip>:3000` in a browser on your local network and sign in with the admin account. If it works, press `Ctrl+C` to stop it and proceed to set up the service.

---

## Step 11 — Set up a systemd service

A systemd service keeps the app running in the background and restarts it automatically if it crashes or if the Pi reboots.

Create the service file (replace `pi` with your actual Pi username if different):

```bash
sudo nano /etc/systemd/system/protection-db.service
```

Paste the following — replace `pi` with your username throughout:

```ini
[Unit]
Description=Protection Device Database
Documentation=https://github.com/<your-username>/protection-device-db
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/protection-device-db
ExecStart=/home/pi/.bun/bin/bun --bun run start
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

# Give the process time to shut down cleanly
TimeoutStopSec=10

[Install]
WantedBy=multi-user.target
```

Save and close (`Ctrl+X`, `Y`, `Enter`), then enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable protection-db
sudo systemctl start protection-db
```

Check it is running:

```bash
sudo systemctl status protection-db
```

You should see `Active: active (running)`. The app will now start automatically every time the Pi boots.

Useful service management commands:

```bash
sudo systemctl restart protection-db   # restart after an update
sudo systemctl stop protection-db      # stop the service
sudo journalctl -u protection-db -f    # tail the logs in real time
```

---

## Step 12 — Expose over the internet with Tailscale Funnel

Tailscale Funnel gives you a public HTTPS URL with TLS handled automatically — no router port forwarding, no SSL certificates to manage.

### Install Tailscale

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

Follow the authentication link printed in the terminal to connect the Pi to your Tailscale network.

### Enable Funnel

```bash
sudo tailscale funnel 3000
```

Tailscale will print your public URL — it will look like `https://your-pi-name.your-tailnet.ts.net`. Note this down.

### Update environment variables

Stop the service, update `.env.local` with your Tailscale URL, and rebuild:

```bash
sudo systemctl stop protection-db

nano .env.local
# Update all four variables to use your Tailscale URL, e.g.:
# BETTER_AUTH_URL=https://your-pi-name.your-tailnet.ts.net
# NEXT_PUBLIC_BETTER_AUTH_URL=https://your-pi-name.your-tailnet.ts.net
# BETTER_AUTH_TRUSTED_ORIGINS=https://your-pi-name.your-tailnet.ts.net

bun --bun run build
sudo systemctl start protection-db
```

The app is now accessible at your Tailscale URL from anywhere.

---

## Updating the application

When new changes are pushed to GitHub, update the Pi with:

```bash
cd ~/protection-device-db
git pull
bun install                   # only needed if package.json changed
bun --bun run build
sudo systemctl restart protection-db
```

If the update includes database migrations:

```bash
bun run migrate               # run between build and restart
```

---

## Backup and restore

Backups are managed from within the app at **Admin → Database Administration**.

### Taking a backup

Click **Download Backup**. This downloads a single `.zip` file containing:
- `app.db` — the complete SQLite database
- `uploads/` — all uploaded files (reports, master settings, test results, manuals)

Store this zip file somewhere safe (network drive, USB stick, cloud storage). It is your complete recovery point.

### Restoring a backup

1. Go to **Admin → Database Administration**
2. Under **Restore from Backup**, choose your `.zip` backup file
3. Click **Restore from Backup**
4. The app will restore both the database and all uploaded files, then redirect to the dashboard

> **This overwrites all current data.** Take a fresh backup first if you want to preserve the current state.

### Scheduled backups (optional)

To automate backups on a schedule, add a cron job on the Pi. This example downloads a backup every night at 2 AM and keeps the last 14 days:

```bash
crontab -e
```

Add:

```
0 2 * * * cd /home/pi && curl -s -b "$(cat /home/pi/.protection-db-session)" http://localhost:3000/api/admin/db/backup -o /home/pi/backups/protection-db-$(date +\%Y-\%m-\%d).zip && find /home/pi/backups -name "*.zip" -mtime +14 -delete
```

> Note: The automated curl approach requires a valid session cookie. A simpler alternative is to use `rsync` to copy the `data/` and `public/uploads/` directories to a network share or USB drive directly.

---

## Troubleshooting

### Service fails to start

```bash
journalctl -u protection-db -n 50
```

Common causes:
- **`bun: command not found`** — Bun is not in the PATH for the service user. Use the full path `/home/pi/.bun/bin/bun` in the service file (already included in the template above).
- **`Cannot find module 'better-sqlite3'`** — Run `bun install` again in the project directory.
- **`SQLITE_CANTOPEN`** — The `data/` directory does not exist. Run `mkdir -p data`.

### Build runs out of memory

If `bun --bun run build` fails with an out-of-memory error:

```bash
# Add swap space temporarily
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile   # set CONF_SWAPSIZE=2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

Run the build again, then reduce swap back to the default (100) when done.

### App is accessible locally but not via Tailscale

- Confirm Funnel is active: `tailscale funnel status`
- Confirm `BETTER_AUTH_TRUSTED_ORIGINS` in `.env.local` matches your Tailscale URL exactly
- Rebuild and restart after any `.env.local` change

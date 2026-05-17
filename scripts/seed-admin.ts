/**
 * Creates the first admin user if no admin exists.
 * Uses a default email and password — change both after first login.
 *
 * Run: bun run seed-admin
 */
import Database from "better-sqlite3";
import { scryptAsync } from "@noble/hashes/scrypt.js";

const config = { N: 16384, r: 16, p: 1, dkLen: 64 };

function hexEncode(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password: string): Promise<string> {
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const salt = hexEncode(saltBytes);
  const key = await scryptAsync(password.normalize("NFKC"), salt, {
    N: config.N, r: config.r, p: config.p, dkLen: config.dkLen,
    maxmem: 128 * config.N * config.r * 2,
  });
  return `${salt}:${hexEncode(key)}`;
}

async function main() {
  const db = new Database("data/app.db");
  db.exec("PRAGMA foreign_keys=ON;");

  const adminExists = db.prepare("SELECT id FROM user WHERE role = 'admin'").get();
  if (adminExists) {
    console.log("An admin user already exists — skipping seed.");
    console.log("Use the User Admin page in the app to manage accounts.");
    return;
  }

  const id        = `admin-${Date.now()}`;
  const accountId = `account-${Date.now()}`;
  const email     = "admin@admin.com";
  const name      = "Administrator";
  const password  = "Admin1234!";

  const hash = await hashPassword(password);

  db.prepare(
    "INSERT INTO user (id, name, email, emailVerified, role) VALUES (?, ?, ?, 1, 'admin')"
  ).run(id, name, email);

  db.prepare(
    "INSERT INTO account (id, accountId, providerId, userId, password) VALUES (?, ?, 'credential', ?, ?)"
  ).run(accountId, accountId, id, hash);

  console.log("✓ Default admin user created:");
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log("\n⚠  Change this password immediately after first login!");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

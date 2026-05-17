/**
 * Resets the admin user password back to the default.
 * Run: node --experimental-strip-types scripts/reset-admin.ts
 */
import { Database } from "bun:sqlite";
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

  const admin = db.query("SELECT id FROM user WHERE role = 'admin'").get() as { id: string } | undefined;
  if (!admin) {
    console.error("No admin user found. Run seed-admin.ts instead.");
    process.exit(1);
  }

  const newPassword = "Admin1234!";
  const hash = await hashPassword(newPassword);

  db.query("UPDATE account SET password = ? WHERE userId = ?").run(hash, admin.id);

  console.log("✓ Admin password reset:");
  console.log("  Email:    admin@admin.com");
  console.log(`  Password: ${newPassword}`);
  console.log("\n⚠  Change this password after logging in!");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

/**
 * Creates the first admin user if no admin exists.
 * Prompts for email and password at the terminal — nothing is hardcoded.
 *
 * Run: bun run seed-admin
 */
import Database from "better-sqlite3";
import { scryptAsync } from "@noble/hashes/scrypt.js";
import * as readline from "readline";

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

function prompt(question: string, hidden = false): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    if (hidden) {
      // Don't echo the password to the terminal
      process.stdout.write(question);
      process.stdin.setRawMode(true);
      let value = "";
      process.stdin.resume();
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", function handler(ch: string) {
        if (ch === "\n" || ch === "\r" || ch === "\u0003") {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener("data", handler);
          process.stdout.write("\n");
          rl.close();
          resolve(value);
        } else if (ch === "\u007f") {
          value = value.slice(0, -1);
        } else {
          value += ch;
        }
      });
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
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

  console.log("Creating the first admin account.\n");

  const name  = await prompt("Full name:  ");
  const email = await prompt("Email:      ");
  const password = await prompt("Password:   ", true);

  if (!email || !password) {
    console.error("Email and password are required.");
    process.exit(1);
  }
  if (password.length < 6) {
    console.error("Password must be at least 6 characters.");
    process.exit(1);
  }

  const id        = `admin-${Date.now()}`;
  const accountId = `account-${Date.now()}`;
  const hash      = await hashPassword(password);

  db.prepare(
    "INSERT INTO user (id, name, email, emailVerified, role) VALUES (?, ?, ?, 1, 'admin')"
  ).run(id, name || "Administrator", email);

  db.prepare(
    "INSERT INTO account (id, accountId, providerId, userId, password) VALUES (?, ?, 'credential', ?, ?)"
  ).run(accountId, accountId, id, hash);

  console.log("\n✓ Admin account created.");
  console.log(`  Email: ${email}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

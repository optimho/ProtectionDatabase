/**
 * lib/db.ts — SQLite connection and query helpers
 *
 * Uses better-sqlite3, which is a synchronous Node.js native module.
 * Despite the async signatures below, all operations are synchronous under
 * the hood — better-sqlite3 doesn't support true async I/O. The async
 * wrappers exist purely so callers can await them consistently alongside
 * other async work (e.g. session checks, file I/O).
 *
 * The module-level singleton (_db) means all route handlers share one
 * open database connection per process, which is correct for SQLite.
 *
 * IMPORTANT: The server must be started with `bun --bun run dev/start`.
 * Without the --bun flag, Bun's Node compatibility layer doesn't resolve
 * better-sqlite3's native bindings correctly.
 */

import type BetterSqlite3 from "better-sqlite3";

// Module-level singleton — one connection for the lifetime of the process.
// Set to null only when explicitly closed (e.g. before a database restore).
let _db: BetterSqlite3.Database | null = null;

function getDb(): BetterSqlite3.Database {
  if (!_db) {
    // require() is used instead of import because better-sqlite3 is a
    // CommonJS native module that doesn't play nicely with ES module
    // static analysis under Bun's bundler.
    const Database = require("better-sqlite3") as typeof BetterSqlite3;
    const db = new Database("data/app.db");

    // WAL (Write-Ahead Logging) gives better read concurrency — readers
    // don't block writers and vice versa. Essential for a web server where
    // multiple route handlers may run simultaneously.
    db.exec("PRAGMA journal_mode=WAL;");

    // Enforce foreign key constraints. SQLite disables them by default for
    // historical compatibility, so this must be set on every connection.
    db.exec("PRAGMA foreign_keys=ON;");

    _db = db;
  }
  return _db;
}

/**
 * Explicitly close the database connection and clear the singleton.
 * Called by the restore API route before overwriting app.db on disk —
 * if the file is open when we try to replace it, the write will fail or
 * corrupt the database on some platforms.
 */
export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

/** Run a SELECT that returns multiple rows. */
export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  return getDb().prepare(sql).all(...params) as T[];
}

/** Run a SELECT that returns a single row (or undefined if not found). */
export async function get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  return getDb().prepare(sql).get(...params) as T | undefined;
}

/** Run an INSERT, UPDATE, or DELETE statement. */
export async function run(sql: string, params: unknown[] = []): Promise<void> {
  getDb().prepare(sql).run(...params);
}

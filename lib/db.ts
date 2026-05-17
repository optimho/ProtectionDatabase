import type { Database as BunDatabase } from "bun:sqlite";

let _db: BunDatabase | null = null;

function getDb(): BunDatabase {
  if (!_db) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Database } = require("bun:sqlite") as { Database: typeof BunDatabase };
    const db = new Database("data/app.db");
    db.exec("PRAGMA journal_mode=WAL;");
    db.exec("PRAGMA foreign_keys=ON;");
    _db = db;
  }
  return _db;
}

/**
 * Explicitly close the database connection and clear the singleton.
 * Called by the restore API route before overwriting app.db on disk.
 */
export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

/** Run a SELECT that returns multiple rows. */
export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  return getDb().query(sql).all(...params) as T[];
}

/** Run a SELECT that returns a single row (or undefined if not found). */
export async function get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  return (getDb().query(sql).get(...params) as T | undefined) ?? undefined;
}

/** Run an INSERT, UPDATE, or DELETE statement. */
export async function run(sql: string, params: unknown[] = []): Promise<void> {
  getDb().query(sql).run(...params);
}

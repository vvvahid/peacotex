import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Db } from "./db";

const MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");
// Any fixed number: all processes that migrate this database take the same lock.
const MIGRATION_LOCK = 724_201;

/**
 * Applies db/migrations/*.sql in name order, once, in one transaction. Several processes may start
 * at the same moment (build workers, serverless instances): an advisory lock lets one migrate while
 * the others wait, then find nothing left to do.
 */
export async function migrate(db: Db, dir = MIGRATIONS_DIR): Promise<string[]> {
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  return db.transaction(async (tx) => {
    await tx.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK]);
    await tx.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
    const done = new Set((await tx.query<{ id: string }>("SELECT id FROM schema_migrations")).rows.map((r) => r.id));
    const applied: string[] = [];
    for (const file of files) {
      if (done.has(file)) continue;
      await tx.exec(await readFile(path.join(dir, file), "utf8"));
      await tx.query("INSERT INTO schema_migrations (id) VALUES ($1)", [file]);
      applied.push(file);
    }
    return applied;
  });
}

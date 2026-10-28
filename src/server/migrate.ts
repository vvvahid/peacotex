import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Db } from "./db";

const MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");

/** Applies db/migrations/*.sql in name order, each in its own transaction, once. */
export async function migrate(db: Db, dir = MIGRATIONS_DIR): Promise<string[]> {
  await db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  const done = new Set((await db.query<{ id: string }>("SELECT id FROM schema_migrations")).rows.map((r) => r.id));
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  const applied: string[] = [];
  for (const file of files) {
    if (done.has(file)) continue;
    const sql = await readFile(path.join(dir, file), "utf8");
    await db.transaction(async (tx) => {
      await tx.exec(sql);
      await tx.query("INSERT INTO schema_migrations (id) VALUES ($1)", [file]);
    });
    applied.push(file);
  }
  return applied;
}

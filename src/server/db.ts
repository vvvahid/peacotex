import "server-only";
import type { Pool, PoolClient } from "pg";

/**
 * Minimal database interface over parameterised SQL.
 *  - `postgres://…`  → node-postgres pool (production: any managed PostgreSQL)
 *  - `pglite://<dir>` or `pglite://memory` → PGlite, PostgreSQL compiled to WASM (zero-setup local development)
 * The schema lives in db/migrations as plain SQL, so both run the exact same constraints.
 */
export interface Queryable {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  /** Multi-statement SQL without parameters (migrations). */
  exec(sql: string): Promise<void>;
}

export interface Db extends Queryable {
  readonly kind: "pg" | "pglite";
  transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/**
 * The database URL: DATABASE_URL, or the names hosting integrations use (Neon on Vercel may add
 * POSTGRES_URL, or a prefix such as STORAGE_DATABASE_URL). The pooled URL is preferred.
 */
export function databaseUrl(): string | undefined {
  const env = process.env;
  if (env.DATABASE_URL) return env.DATABASE_URL;
  if (env.POSTGRES_URL) return env.POSTGRES_URL;
  const key = Object.keys(env).sort().find((k) => k.endsWith("_DATABASE_URL") && !k.includes("UNPOOLED"));
  return key ? env[key] : undefined;
}

export const isDbConfigured = () => !!databaseUrl();

async function createDb(url: string): Promise<Db> {
  if (url.startsWith("pglite://")) return createPglite(url.slice("pglite://".length));
  return createPg(url);
}

async function createPg(url: string): Promise<Db> {
  const { Pool } = await import("pg");
  const pool: Pool = new Pool({ connectionString: url, max: Number(process.env.DATABASE_POOL_MAX || 5) });
  const wrap = (c: Pool | PoolClient): Queryable => ({
    query: async (sql, params) => ({ rows: (await c.query(sql, params as unknown[])).rows }),
    exec: async (sql) => { await c.query(sql); },
  });
  return {
    kind: "pg",
    ...wrap(pool),
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await fn(wrap(client));
        await client.query("COMMIT");
        return result;
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}

async function createPglite(location: string): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const dataDir = location === "memory" || location === "" ? undefined : location;
  if (dataDir) {
    const { mkdirSync } = await import("node:fs");
    const { dirname, resolve } = await import("node:path");
    mkdirSync(dirname(resolve(dataDir)), { recursive: true });
  }
  const pg = new PGlite(dataDir ? { dataDir } : {});
  await pg.waitReady;
  type Tx = { query: (s: string, p?: unknown[]) => Promise<{ rows: unknown[] }>; exec: (s: string) => Promise<unknown> };
  const wrap = (c: Tx): Queryable => ({
    query: async <T,>(sql: string, params?: unknown[]) => ({ rows: (await c.query(sql, params)).rows as T[] }),
    exec: async (sql) => { await c.exec(sql); },
  });
  return {
    kind: "pglite",
    ...wrap(pg as unknown as Tx),
    transaction: (fn) => pg.transaction((tx) => fn(wrap(tx as unknown as Tx))),
    close: () => pg.close(),
  };
}

// One instance per server process (survives dev hot reloads).
const g = globalThis as unknown as { __ptxDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  const url = databaseUrl();
  if (!url) throw new Error("DATABASE_URL is not set");
  g.__ptxDb ??= createDb(url).then(async (db) => {
    const { migrate } = await import("./migrate");
    await migrate(db);
    const { ensureCatalog } = await import("./catalog");
    await ensureCatalog(db);
    const { ensureStock } = await import("./stock");
    await ensureStock(db);
    return db;
  });
  return g.__ptxDb;
}

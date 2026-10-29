import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, isDbConfigured } from "./db";

/*
 * One shop owner, one password: ADMIN_PASSWORD (environment variable, never in the code).
 * A successful sign-in sets a signed, HttpOnly cookie valid for 12 hours. Five wrong passwords
 * from one address lock that address out for 15 minutes.
 */

const COOKIE = "ptx_admin";
const SESSION_HOURS = 12;
const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

export const isAdminConfigured = () => !!process.env.ADMIN_PASSWORD && isDbConfigured();

// Signing key: ADMIN_SESSION_SECRET if set, else derived from the password (changing it signs everyone out).
const secret = () => process.env.ADMIN_SESSION_SECRET || createHash("sha256").update(`ptx-admin:${process.env.ADMIN_PASSWORD}`).digest("hex");
const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("base64url");

function safeEqual(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "local").trim().slice(0, 64);
}

export async function isAdmin(): Promise<boolean> {
  if (!isAdminConfigured()) return false;
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return false;
  const [exp, sig] = raw.split(".");
  if (!exp || !sig || !safeEqual(sig, sign(exp))) return false;
  return Number(exp) > Date.now();
}

/** Guard for every admin page and action. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

export type LoginResult = { ok: true } | { ok: false; error: string };

export async function login(password: string): Promise<LoginResult> {
  if (!isAdminConfigured()) return { ok: false, error: "The admin is not switched on." };
  const db = await getDb();
  const ip = await clientIp();
  const { rows } = await db.query<{ n: string }>(
    `SELECT count(*) AS n FROM admin_login_failures WHERE ip = $1 AND at > now() - interval '${LOCK_MINUTES} minutes'`, [ip],
  );
  if (Number(rows[0].n) >= MAX_FAILURES) return { ok: false, error: `Too many attempts. Try again in ${LOCK_MINUTES} minutes.` };

  if (!password || !safeEqual(password, process.env.ADMIN_PASSWORD!)) {
    await db.query("INSERT INTO admin_login_failures (ip) VALUES ($1)", [ip]);
    await db.query("DELETE FROM admin_login_failures WHERE at < now() - interval '1 day'");
    await new Promise((r) => setTimeout(r, 400)); // slow down guessing
    return { ok: false, error: "Wrong password." };
  }

  await db.query("DELETE FROM admin_login_failures WHERE ip = $1", [ip]);
  const exp = String(Date.now() + SESSION_HOURS * 3600_000);
  (await cookies()).set(COOKIE, `${exp}.${sign(exp)}`, {
    httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_HOURS * 3600,
  });
  await logAdmin("sign-in", ip);
  return { ok: true };
}

export async function logout() {
  (await cookies()).delete(COOKIE);
}

/** Records an admin change in admin_log. */
export async function logAdmin(action: string, target?: string, detail?: string) {
  const db = await getDb();
  await db.query("INSERT INTO admin_log (action, target, detail) VALUES ($1, $2, $3)", [action, target ?? null, detail?.slice(0, 2000) ?? null]);
}

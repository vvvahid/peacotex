import "server-only";
import { catalogChanged, FabricError, loadRecord, loadRecords, parseFabric, type FabricRecord } from "./catalog";
import { getDb } from "./db";
import { logAdmin } from "./admin-auth";
import { setStock } from "./stock";

/*
 * What the admin pages read and change. Every exported function here is called only after
 * requireAdmin() (see app/admin/actions.ts and the admin pages).
 */

// ---- orders

export type OrderStatus = "pending" | "paid" | "expired" | "needs_attention" | "cut" | "shipped" | "cancelled";
export const ORDER_FILTERS = {
  todo: { label: "To do", statuses: ["needs_attention", "paid", "cut"] },
  shipped: { label: "Shipped", statuses: ["shipped"] },
  unpaid: { label: "Unpaid", statuses: ["pending", "expired"] },
  cancelled: { label: "Cancelled", statuses: ["cancelled"] },
  all: { label: "All", statuses: [] },
} as const satisfies Record<string, { label: string; statuses: OrderStatus[] }>;
export type OrderFilter = keyof typeof ORDER_FILTERS;

interface Address { line1?: string | null; line2?: string | null; city?: string | null; postal_code?: string | null; state?: string | null; country?: string | null }
export interface Customer {
  details?: { email?: string | null; name?: string | null; phone?: string | null; address?: Address | null } | null;
  shipping?: { name?: string | null; address?: Address | null } | null;
}

export interface OrderRow {
  id: string; reference: string; status: OrderStatus; email: string | null; name: string | null;
  totalCents: number; createdAt: string; paidAt: string | null; items: number;
}

export interface OrderDetail extends OrderRow {
  subtotalCents: number; shippingCents: number; paidCents: number | null; note: string | null;
  customer: Customer | null; trackingNumber: string | null; trackingUrl: string | null; shippedAt: string | null;
  stripeUrl: string | null;
  lines: { kind: string; slug: string; name: string; qty: number; unit: string; totalCents: number }[];
}

const asJson = <T,>(v: unknown): T | null => (v == null ? null : typeof v === "string" ? (JSON.parse(v) as T) : (v as T));
const iso = (v: unknown) => (v == null ? null : new Date(v as string).toISOString());

type RawOrder = {
  id: string; reference: string; status: OrderStatus; email: string | null; customer: unknown; subtotal_cents: number;
  shipping_cents: number; total_cents: number | null; created_at: string; paid_at: string | null; items: string;
};
const toRow = (o: RawOrder): OrderRow => {
  const c = asJson<Customer>(o.customer);
  return {
    id: o.id, reference: o.reference, status: o.status, email: o.email,
    name: c?.shipping?.name ?? c?.details?.name ?? null,
    totalCents: o.total_cents ?? o.subtotal_cents + o.shipping_cents,
    createdAt: iso(o.created_at)!, paidAt: iso(o.paid_at), items: Number(o.items),
  };
};

export async function listOrders(filter: OrderFilter, search = ""): Promise<OrderRow[]> {
  const db = await getDb();
  const statuses: readonly string[] = ORDER_FILTERS[filter].statuses;
  const q = search.trim().toLowerCase();
  const { rows } = await db.query<RawOrder>(
    `SELECT o.*, (SELECT count(*) FROM order_lines l WHERE l.order_id = o.id) AS items FROM orders o
     WHERE ($1::text[] IS NULL OR o.status = ANY($1))
       AND ($2 = '' OR lower(o.reference) LIKE '%' || $2 || '%' OR lower(coalesce(o.email, '')) LIKE '%' || $2 || '%')
     ORDER BY CASE o.status WHEN 'needs_attention' THEN 0 ELSE 1 END, coalesce(o.paid_at, o.created_at) DESC
     LIMIT 200`,
    [statuses.length ? statuses : null, q],
  );
  return rows.map(toRow);
}

export async function getOrder(id: string): Promise<OrderDetail | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const db = await getDb();
  const { rows } = await db.query<RawOrder & {
    note: string | null; tracking_number: string | null; tracking_url: string | null; shipped_at: string | null;
    payment_intent: string | null; stripe_session_id: string | null;
  }>(`SELECT o.*, (SELECT count(*) FROM order_lines l WHERE l.order_id = o.id) AS items FROM orders o WHERE o.id = $1`, [id]);
  const o = rows[0];
  if (!o) return null;
  const lines = await db.query<{ kind: string; slug: string; name: string; qty: string; unit: string; total_cents: number }>(
    "SELECT kind, slug, name, qty, unit, total_cents FROM order_lines WHERE order_id = $1 ORDER BY line_no", [id],
  );
  const test = o.stripe_session_id?.startsWith("cs_test_");
  return {
    ...toRow(o),
    subtotalCents: o.subtotal_cents, shippingCents: o.shipping_cents, paidCents: o.total_cents, note: o.note,
    customer: asJson<Customer>(o.customer), trackingNumber: o.tracking_number, trackingUrl: o.tracking_url, shippedAt: iso(o.shipped_at),
    stripeUrl: o.payment_intent ? `https://dashboard.stripe.com/${test ? "test/" : ""}payments/${o.payment_intent}` : null,
    lines: lines.rows.map((l) => ({ kind: l.kind, slug: l.slug, name: l.name, qty: Number(l.qty), unit: l.unit, totalCents: l.total_cents })),
  };
}

export class AdminError extends Error {}

const PAID_STATES: OrderStatus[] = ["paid", "needs_attention", "cut", "shipped"];

/** Moves an order along: cut → shipped, or cancels it. Checks the current state inside the transaction. */
export async function changeOrder(
  id: string,
  action: "cut" | "ship" | "resolve" | "cancel" | "note",
  data: { trackingNumber?: string; trackingUrl?: string; restock?: boolean; note?: string } = {},
) {
  const db = await getDb();
  await db.transaction(async (tx) => {
    const { rows } = await tx.query<{ status: OrderStatus; reference: string }>("SELECT status, reference FROM orders WHERE id = $1 FOR UPDATE", [id]);
    const o = rows[0];
    if (!o) throw new AdminError("Order not found.");
    const set = async (sql: string, params: unknown[] = []) => tx.query(`UPDATE orders SET ${sql}, updated_at = now() WHERE id = $1`, [id, ...params]);
    switch (action) {
      case "cut":
        if (!["paid", "needs_attention"].includes(o.status)) throw new AdminError("Only paid orders can be marked as cut.");
        await set("status = 'cut'");
        break;
      case "resolve":
        if (o.status !== "needs_attention") throw new AdminError("This order does not need attention.");
        await set("status = 'paid'");
        break;
      case "ship": {
        if (!["paid", "needs_attention", "cut"].includes(o.status)) throw new AdminError("Only paid orders can be shipped.");
        const num = (data.trackingNumber ?? "").trim().slice(0, 80);
        const url = (data.trackingUrl ?? "").trim().slice(0, 500);
        if (url && !/^https:\/\/[^\s]+$/.test(url)) throw new AdminError("The tracking link must start with https://");
        await set("status = 'shipped', shipped_at = now(), tracking_number = $2, tracking_url = $3", [num || null, url || null]);
        break;
      }
      case "cancel": {
        if (o.status === "cancelled") throw new AdminError("This order is already cancelled.");
        if (o.status === "shipped") throw new AdminError("A shipped order cannot be cancelled here.");
        if (data.restock && PAID_STATES.includes(o.status)) {
          const fabric = await tx.query<{ slug: string; qty: string }>("SELECT slug, qty FROM order_lines WHERE order_id = $1 AND kind = 'fabric'", [id]);
          for (const l of fabric.rows) {
            await tx.query("UPDATE fabric_stock SET metres = metres + $2, updated_at = now() WHERE slug = $1", [l.slug, l.qty]);
          }
        }
        await set("status = 'cancelled'");
        break;
      }
      case "note":
        await set("note = $2", [(data.note ?? "").trim().slice(0, 2000) || null]);
        break;
    }
    await tx.query("INSERT INTO admin_log (action, target, detail) VALUES ($1, $2, $3)", [`order:${action}`, o.reference, action === "ship" ? data.trackingNumber ?? null : null]);
  });
}

export async function dashboard() {
  const db = await getDb();
  const counts = await db.query<{ status: OrderStatus; n: string }>("SELECT status, count(*) AS n FROM orders GROUP BY status");
  const by = Object.fromEntries(counts.rows.map((r) => [r.status, Number(r.n)])) as Partial<Record<OrderStatus, number>>;
  const revenue = await db.query<{ cents: string | null; n: string }>(
    "SELECT sum(total_cents) AS cents, count(*) AS n FROM orders WHERE status IN ('paid','needs_attention','cut','shipped') AND paid_at > now() - interval '30 days'",
  );
  const records = await loadRecords(db);
  const stock = await db.query<{ slug: string; metres: string }>("SELECT slug, metres FROM fabric_stock");
  const metres = new Map(stock.rows.map((r) => [r.slug, Number(r.metres)]));
  return {
    attention: by.needs_attention ?? 0,
    toCut: by.paid ?? 0,
    toShip: by.cut ?? 0,
    revenue30Cents: Number(revenue.rows[0].cents ?? 0),
    orders30: Number(revenue.rows[0].n),
    lowStock: records.filter((r) => r.active && (metres.get(r.slug) ?? 0) < 5).map((r) => ({ slug: r.slug, name: r.name, metres: metres.get(r.slug) ?? 0 })),
    recent: await listOrders("all").then((l) => l.filter((o) => o.status !== "pending" && o.status !== "expired").slice(0, 6)),
  };
}

// ---- fabrics

export async function listFabrics() {
  const db = await getDb();
  const records = await loadRecords(db);
  const stock = await db.query<{ slug: string; metres: string }>("SELECT slug, metres FROM fabric_stock");
  const metres = new Map(stock.rows.map((r) => [r.slug, Number(r.metres)]));
  return records.map((r) => ({ record: r, metres: metres.get(r.slug) ?? 0 }));
}

export async function getFabric(slug: string) {
  const db = await getDb();
  const record = await loadRecord(slug, db);
  if (!record) return null;
  const s = await db.query<{ metres: string }>("SELECT metres FROM fabric_stock WHERE slug = $1", [slug]);
  return { record, metres: Number(s.rows[0]?.metres ?? 0) };
}

const IMAGE_TYPES: Record<string, (b: Uint8Array) => boolean> = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  "image/webp": (b) => String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP",
};
export const MAX_IMAGE_BYTES = 4_000_000;

/** Stores an uploaded photo after checking its type by its first bytes, not just its name. */
export async function storeImage(file: File): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) throw new AdminError("The photo is larger than 4 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = Object.keys(IMAGE_TYPES).find((t) => IMAGE_TYPES[t](bytes));
  if (!type) throw new AdminError("Upload a JPEG, PNG or WebP photo.");
  const db = await getDb();
  const { rows } = await db.query<{ id: string }>(
    "INSERT INTO media (content_type, bytes, size) VALUES ($1, $2, $3) RETURNING id", [type, Buffer.from(bytes), bytes.length],
  );
  return rows[0].id;
}

/** Creates or updates a fabric and its stock. Throws FabricError/AdminError with a message for the form. */
export async function saveFabric(input: Record<string, unknown>, opts: { isNew: boolean; stock: number }) {
  const record: FabricRecord = parseFabric(input);
  if (!Number.isFinite(opts.stock) || opts.stock < 0 || opts.stock > 100000) throw new FabricError("Stock must be 0 or more metres.");
  const db = await getDb();
  await db.transaction(async (tx) => {
    const exists = (await tx.query("SELECT 1 FROM products WHERE slug = $1", [record.slug])).rows.length > 0;
    if (opts.isNew && exists) throw new FabricError(`A fabric with the web address “${record.slug}” already exists.`);
    if (!opts.isNew && !exists) throw new FabricError("This fabric no longer exists.");
    await tx.query(
      `INSERT INTO products (slug, data) VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
      [record.slug, JSON.stringify(record)],
    );
    await setStock(tx, record.slug, Math.round(opts.stock * 100) / 100);
  });
  await logAdmin(opts.isNew ? "fabric:create" : "fabric:update", record.slug, `€${record.pricePerMetre}/m, ${opts.stock} m, ${record.active ? "live" : "hidden"}`);
  catalogChanged();
  return record;
}

/** Quick switch from the fabric list. */
export async function setFabricFlag(slug: string, flag: "active" | "featured", value: boolean) {
  const db = await getDb();
  const record = await loadRecord(slug, db);
  if (!record) throw new AdminError("Fabric not found.");
  record[flag] = value;
  await db.query("UPDATE products SET data = $2, updated_at = now() WHERE slug = $1", [slug, JSON.stringify(record)]);
  await logAdmin(`fabric:${flag}`, slug, String(value));
  catalogChanged();
}

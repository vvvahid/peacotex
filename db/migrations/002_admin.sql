-- The catalogue moves into the database so the shop owner can edit it in /admin.
-- One row per fabric; the record itself is JSON (validated in src/server/catalog.ts).
CREATE TABLE products (
  slug        text PRIMARY KEY CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  data        jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Photos uploaded in the admin, served by /api/media/<id>.
CREATE TABLE media (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type  text NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
  bytes         bytea NOT NULL,
  size          integer NOT NULL CHECK (size > 0 AND size <= 5000000),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Shipping details the owner adds when an order goes out.
ALTER TABLE orders ADD COLUMN tracking_number text;
ALTER TABLE orders ADD COLUMN tracking_url text;
ALTER TABLE orders ADD COLUMN shipped_at timestamptz;
ALTER TABLE orders ADD COLUMN updated_at timestamptz;

-- Failed admin sign-ins, for lockout after repeated attempts.
CREATE TABLE admin_login_failures (
  ip  text NOT NULL,
  at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_login_failures_idx ON admin_login_failures (ip, at);

-- What was changed in the admin, and when.
CREATE TABLE admin_log (
  id      bigserial PRIMARY KEY,
  at      timestamptz NOT NULL DEFAULT now(),
  action  text NOT NULL,
  target  text,
  detail  text
);

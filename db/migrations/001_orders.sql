-- Stock is kept in metres per fabric (one row per roll family for now).
CREATE TABLE fabric_stock (
  slug        text PRIMARY KEY,
  metres      numeric(7,2) NOT NULL CHECK (metres >= 0),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference           text NOT NULL UNIQUE,
  status              text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'paid', 'expired', 'needs_attention', 'cut', 'shipped', 'cancelled')),
  stripe_session_id   text UNIQUE,
  payment_intent      text,
  subtotal_cents      integer NOT NULL CHECK (subtotal_cents >= 0),
  shipping_cents      integer NOT NULL DEFAULT 0 CHECK (shipping_cents >= 0),
  total_cents         integer,
  currency            text NOT NULL DEFAULT 'eur',
  email               text,
  customer            jsonb,
  note                text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  paid_at             timestamptz
);

CREATE TABLE order_lines (
  order_id     uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  line_no      integer NOT NULL,
  kind         text NOT NULL CHECK (kind IN ('fabric', 'swatch', 'complement')),
  slug         text NOT NULL,
  name         text NOT NULL,
  qty          numeric(6,2) NOT NULL CHECK (qty > 0),
  unit         text NOT NULL,
  total_cents  integer NOT NULL CHECK (total_cents >= 0),
  PRIMARY KEY (order_id, line_no)
);

CREATE INDEX orders_status_idx ON orders (status, created_at DESC);

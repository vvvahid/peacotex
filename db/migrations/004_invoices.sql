-- Who bought, and how VAT applies: private buyers pay VAT; businesses elsewhere in the EU with a
-- valid VAT number are reverse-charged; Norwegian businesses buy VAT-free (export).
ALTER TABLE orders ADD COLUMN lang text NOT NULL DEFAULT 'en';
ALTER TABLE orders ADD COLUMN customer_type text NOT NULL DEFAULT 'private' CHECK (customer_type IN ('private', 'business'));
ALTER TABLE orders ADD COLUMN company_name text;
ALTER TABLE orders ADD COLUMN vat_id text;
ALTER TABLE orders ADD COLUMN vat_treatment text NOT NULL DEFAULT 'standard' CHECK (vat_treatment IN ('standard', 'reverse_charge', 'export'));
-- Set when the confirmation email has gone out (claimed atomically so it is sent once).
ALTER TABLE orders ADD COLUMN email_sent_at timestamptz;

-- One invoice per paid order, numbered without gaps per calendar year (2026-0001, 2026-0002…).
-- `data` is everything printed on it, frozen at issue; `pdf` is the document as sent.
CREATE TABLE invoices (
  number     text PRIMARY KEY,
  year       integer NOT NULL,
  seq        integer NOT NULL,
  order_id   uuid NOT NULL UNIQUE REFERENCES orders(id),
  issued_at  timestamptz NOT NULL DEFAULT now(),
  data       jsonb NOT NULL,
  pdf        bytea NOT NULL,
  UNIQUE (year, seq)
);

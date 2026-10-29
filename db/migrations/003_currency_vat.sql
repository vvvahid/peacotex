-- Orders can be paid in PLN, RON, CZK or HUF as well as EUR (amounts stay in that currency's minor units).
-- fx_rate: units of the order currency per euro when the order was placed (for euro reporting).
ALTER TABLE orders ADD COLUMN fx_rate numeric(12,6) NOT NULL DEFAULT 1;

-- VAT included in the paid total, by the country the order ships to (filled in at payment).
ALTER TABLE orders ADD COLUMN vat_country text;
ALTER TABLE orders ADD COLUMN vat_rate numeric(5,4);
ALTER TABLE orders ADD COLUMN vat_cents integer;

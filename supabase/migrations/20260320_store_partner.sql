-- Add store partner login fields to stores table
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS store_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Auto-generate store_id for any existing stores that don't have one
UPDATE stores
SET store_id = 'STR-' || LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0')
WHERE store_id IS NULL;

-- Allow anon to read store_id field (needed for store-app login)
-- The existing stores_read_anon policy already covers this if it selects '*'

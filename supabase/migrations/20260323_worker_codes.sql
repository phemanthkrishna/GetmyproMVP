-- Add unique worker code to workers
ALTER TABLE workers ADD COLUMN IF NOT EXISTS worker_code TEXT UNIQUE;

-- Generate codes for existing workers that don't have one
DO $$
DECLARE
  w RECORD;
  code TEXT;
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
BEGIN
  FOR w IN SELECT id FROM workers WHERE worker_code IS NULL LOOP
    LOOP
      SELECT string_agg(substr(chars, (random() * 31 + 1)::int, 1), '')
        FROM generate_series(1, 6) INTO code;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM workers WHERE worker_code = code);
    END LOOP;
    UPDATE workers SET worker_code = code WHERE id = w.id;
  END LOOP;
END $$;

-- Add preferred worker fields to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS preferred_worker_id UUID,
  ADD COLUMN IF NOT EXISTS preferred_worker_code TEXT;

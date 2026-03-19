-- ============================================================
-- GetMyPro — Full RLS + Schema Fix (safe to re-run)
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Labour approval columns (from previous migration) ────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS labour_approval_pending BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS labour_pending_amount   NUMERIC;

-- ── 2. Drop all existing policies (clean slate) ─────────────
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies
           WHERE schemaname = 'public'
             AND tablename IN ('profiles','workers','orders','stores','service_alerts')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ── 3. Enable RLS on all tables ──────────────────────────────
ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores        ENABLE ROW LEVEL SECURITY;

-- Enable RLS on service_alerts if it exists
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'service_alerts') THEN
    EXECUTE 'ALTER TABLE service_alerts ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- ── 4. Admin helper function ─────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ── 5. PROFILES policies ─────────────────────────────────────
CREATE POLICY "profiles_insert_anon"
  ON profiles FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "profiles_read_anon"
  ON profiles FOR SELECT TO anon USING (true);

CREATE POLICY "profiles_update_anon"
  ON profiles FOR UPDATE TO anon USING (true);

CREATE POLICY "profiles_all_admin"
  ON profiles FOR ALL TO authenticated USING (is_admin());

-- ── 6. WORKERS policies ──────────────────────────────────────
CREATE POLICY "workers_read_anon"
  ON workers FOR SELECT TO anon USING (true);

CREATE POLICY "workers_insert_anon"
  ON workers FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "workers_update_anon"
  ON workers FOR UPDATE TO anon USING (true);

CREATE POLICY "workers_all_admin"
  ON workers FOR ALL TO authenticated USING (is_admin());

-- ── 7. ORDERS policies ───────────────────────────────────────
CREATE POLICY "orders_insert_anon"
  ON orders FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "orders_read_anon"
  ON orders FOR SELECT TO anon USING (true);

CREATE POLICY "orders_update_anon"
  ON orders FOR UPDATE TO anon USING (true);

CREATE POLICY "orders_all_admin"
  ON orders FOR ALL TO authenticated USING (is_admin());

-- ── 8. STORES policies ───────────────────────────────────────
CREATE POLICY "stores_read_anon"
  ON stores FOR SELECT TO anon USING (true);

CREATE POLICY "stores_all_admin"
  ON stores FOR ALL TO authenticated USING (is_admin());

-- ── 9. SERVICE_ALERTS policies ───────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'service_alerts') THEN
    EXECUTE 'CREATE POLICY "service_alerts_anon" ON service_alerts FOR ALL TO anon USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "service_alerts_admin" ON service_alerts FOR ALL TO authenticated USING (is_admin())';
  END IF;
END $$;

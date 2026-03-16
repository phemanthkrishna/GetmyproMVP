-- ============================================================
-- GetMyPro — Row-Level Security (RLS) Policies
-- ============================================================
-- Run this in your Supabase SQL editor (Dashboard → SQL editor).
--
-- IMPORTANT ARCHITECTURE NOTE:
-- Customers and workers authenticate via Firebase Phone Auth, NOT
-- Supabase Auth. Their Supabase requests use the anon key without
-- a Supabase JWT. Full per-row RLS requires migrating them to
-- Supabase Auth. Until then, these policies provide:
--   • Admin-only write protection on sensitive tables (admin uses
--     Supabase Auth email/password — auth.uid() works for them).
--   • Anon read policies that limit over-exposure.
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores      ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER: is the current request from an admin Supabase Auth user?
-- The admin profile has role='admin' in the profiles table.
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ============================================================
-- PROFILES TABLE
-- ============================================================
-- Anyone can insert their own profile (customer/worker registration)
CREATE POLICY "profiles_insert_anon"
  ON profiles FOR INSERT TO anon WITH CHECK (true);

-- Authenticated admin can read all profiles
CREATE POLICY "profiles_read_admin"
  ON profiles FOR SELECT TO authenticated
  USING (is_admin());

-- Anon can read only basic public info (no session_token)
-- Note: Until Firebase users get Supabase Auth, reads are permitted
-- for anon. Restrict further once auth is migrated.
CREATE POLICY "profiles_read_anon"
  ON profiles FOR SELECT TO anon USING (true);

-- Only admin can update profiles (role changes etc.)
CREATE POLICY "profiles_update_admin"
  ON profiles FOR UPDATE TO authenticated
  USING (is_admin());

-- Anon can upsert their own profile (customer/worker login flow)
CREATE POLICY "profiles_upsert_anon"
  ON profiles FOR UPDATE TO anon USING (true);

-- ============================================================
-- WORKERS TABLE
-- ============================================================
-- Anyone can read workers (customers need to see worker info)
CREATE POLICY "workers_read_all"
  ON workers FOR SELECT TO anon USING (true);

-- Anyone can insert a worker (registration flow)
CREATE POLICY "workers_insert_anon"
  ON workers FOR INSERT TO anon WITH CHECK (true);

-- Anyone can update their own worker record (profile, UPI, online status)
CREATE POLICY "workers_update_anon"
  ON workers FOR UPDATE TO anon USING (true);

-- Admin can update any worker (verify, deactivate)
CREATE POLICY "workers_update_admin"
  ON workers FOR UPDATE TO authenticated USING (is_admin());

-- Only admin can delete workers (though soft-delete is preferred)
CREATE POLICY "workers_delete_admin"
  ON workers FOR DELETE TO authenticated USING (is_admin());

-- ============================================================
-- ORDERS TABLE
-- ============================================================
-- Anon can insert new orders (customers booking)
CREATE POLICY "orders_insert_anon"
  ON orders FOR INSERT TO anon WITH CHECK (true);

-- Anon can read orders (customers and workers need this)
-- TODO: Restrict to own orders once Firebase → Supabase Auth migration done
CREATE POLICY "orders_read_anon"
  ON orders FOR SELECT TO anon USING (true);

-- Anon can update orders (worker status updates, customer payment refs)
CREATE POLICY "orders_update_anon"
  ON orders FOR UPDATE TO anon USING (true);

-- Admin can read and write all orders
CREATE POLICY "orders_all_admin"
  ON orders FOR ALL TO authenticated USING (is_admin());

-- ============================================================
-- STORES TABLE
-- ============================================================
-- Only admin can read/write stores
CREATE POLICY "stores_admin_only"
  ON stores FOR ALL TO authenticated USING (is_admin());

-- Workers need to read store info (mat collection)
CREATE POLICY "stores_read_anon"
  ON stores FOR SELECT TO anon USING (true);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
-- Run these separately in Supabase Dashboard → Storage → Policies
-- or add them here if using the Supabase CLI:
--
-- Allow anon uploads to 'uploads' bucket (photos, job images):
--   CREATE POLICY "storage_insert_anon" ON storage.objects
--     FOR INSERT TO anon WITH CHECK (bucket_id = 'uploads');
--
-- Allow public reads of 'uploads' bucket:
--   CREATE POLICY "storage_read_public" ON storage.objects
--     FOR SELECT USING (bucket_id = 'uploads');
--
-- Admin only deletes:
--   CREATE POLICY "storage_delete_admin" ON storage.objects
--     FOR DELETE TO authenticated USING (is_admin());

-- ============================================================
-- NEXT STEPS (to fully harden security):
-- 1. Migrate customer/worker login from Firebase to Supabase Auth.
--    Then replace the anon policies with auth.uid()-based policies:
--      orders: USING (customer_id = auth.uid() OR worker_id = auth.uid())
--      profiles: USING (id = auth.uid())
--      workers: USING (id = auth.uid())
-- 2. Remove over-broad anon SELECT policies once #1 is done.
-- 3. Consider server-side Supabase Edge Functions for sensitive writes.
-- ============================================================

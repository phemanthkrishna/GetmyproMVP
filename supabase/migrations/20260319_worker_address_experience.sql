-- ============================================================
-- GetMyPro — Add address + experience_years to workers table
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS address          TEXT,
  ADD COLUMN IF NOT EXISTS experience_years TEXT;

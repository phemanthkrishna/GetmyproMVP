-- ============================================================
-- GetMyPro — Add Aadhaar document image URLs to workers table
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS aadhaar_front_url TEXT,
  ADD COLUMN IF NOT EXISTS aadhaar_back_url  TEXT;

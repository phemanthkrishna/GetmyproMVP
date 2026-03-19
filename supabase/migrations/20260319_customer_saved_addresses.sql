-- ============================================================
-- GetMyPro — Add saved_addresses to profiles table
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS saved_addresses JSONB NOT NULL DEFAULT '[]';

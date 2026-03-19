-- ============================================================
-- GetMyPro — Enable Supabase Realtime with row-level filtering
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. REPLICA IDENTITY FULL ─────────────────────────────────
-- Required for Supabase realtime to send the full old+new row
-- on UPDATE events, which enables server-side column filters
-- (e.g. filter: `id=eq.ORD-123456`).
-- Without this, UPDATE payloads only contain the primary key
-- in the OLD record, so filters on other columns silently fail.

ALTER TABLE orders    REPLICA IDENTITY FULL;
ALTER TABLE workers   REPLICA IDENTITY FULL;
ALTER TABLE profiles  REPLICA IDENTITY FULL;
ALTER TABLE stores    REPLICA IDENTITY FULL;

-- service_alerts if it exists
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'service_alerts') THEN
    EXECUTE 'ALTER TABLE service_alerts REPLICA IDENTITY FULL';
  END IF;
END $$;

-- ── 2. Add tables to the Supabase realtime publication ───────
-- Supabase uses a Postgres publication called `supabase_realtime`.
-- Tables must be explicitly added to receive change events.
-- Using IF NOT EXISTS equivalent via DO block to avoid errors on re-run.

ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE workers;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE stores;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'service_alerts') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE service_alerts';
  END IF;
END $$;

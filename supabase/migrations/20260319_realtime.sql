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
-- Guard against "already member" error on re-run.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN ALTER PUBLICATION supabase_realtime ADD TABLE orders; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'workers'
  ) THEN ALTER PUBLICATION supabase_realtime ADD TABLE workers; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN ALTER PUBLICATION supabase_realtime ADD TABLE profiles; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'stores'
  ) THEN ALTER PUBLICATION supabase_realtime ADD TABLE stores; END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'service_alerts')
  AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'service_alerts'
  ) THEN ALTER PUBLICATION supabase_realtime ADD TABLE service_alerts; END IF;
END $$;

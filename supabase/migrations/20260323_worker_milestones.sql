-- ============================================================
-- GetMyPro — Worker Progress & Milestone Tracker
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS completed_milestones JSONB    DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS total_jobs_completed INTEGER  DEFAULT 0;

-- Keep total_jobs_completed in sync whenever an order hits 'completed'
CREATE OR REPLACE FUNCTION update_worker_job_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND
     (OLD.status IS NULL OR OLD.status <> 'completed') THEN
    UPDATE workers
       SET total_jobs_completed = total_jobs_completed + 1
     WHERE id = NEW.worker_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_order_completed ON orders;

CREATE TRIGGER on_order_completed
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_worker_job_count();

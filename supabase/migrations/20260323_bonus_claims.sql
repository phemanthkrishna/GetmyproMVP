CREATE TABLE IF NOT EXISTS bonus_claims (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id    UUID         NOT NULL,
  worker_name  TEXT         NOT NULL,
  milestone_job INTEGER     NOT NULL,
  milestone_badge TEXT      NOT NULL,
  milestone_icon  TEXT      NOT NULL,
  amount       INTEGER      NOT NULL,
  status       TEXT         NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  paid_at      TIMESTAMPTZ,
  UNIQUE(worker_id, milestone_job)
);

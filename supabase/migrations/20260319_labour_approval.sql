-- Labour charge approval flow
-- When worker enters labour > ₹1,000 it goes to admin for approval first

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS labour_approval_pending BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS labour_pending_amount   NUMERIC;

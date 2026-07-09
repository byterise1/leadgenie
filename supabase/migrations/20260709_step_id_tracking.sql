-- Track a lead's campaign progress by a stable step ID instead of a
-- position number, so follow-up steps can be safely added/removed/reordered
-- on a paused campaign without breaking leads mid-sequence. step_number
-- stays as a display/ordering value only - current_step_id becomes the
-- source of truth for "what does this lead get next."
-- Run this in Supabase -> SQL Editor. All changes are additive/safe.

ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS current_step_id UUID REFERENCES email_steps(id);

-- Backfill: match each lead's existing current_step number to that
-- same campaign's step carrying the same step_number.
UPDATE campaign_leads cl
SET current_step_id = es.id
FROM email_steps es
WHERE es.campaign_id = cl.campaign_id
  AND es.step_number = cl.current_step
  AND cl.current_step_id IS NULL;

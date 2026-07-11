-- "Last edited" tracking for campaigns — shown on the campaign detail page
-- whenever the user changes schedule/limits/follow-up-priority (generic
-- PATCH /api/campaigns/[id]) or adds/edits/deletes/reorders a step. NOT
-- touched by the sending worker's own progress writes (total_sent etc.) —
-- this is specifically "when did a person last change something," not
-- "when did this campaign last do something."
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

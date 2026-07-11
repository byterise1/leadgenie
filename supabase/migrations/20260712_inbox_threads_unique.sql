-- Fixes a pre-existing race condition: inbox_threads used a "check if a row
-- exists, then insert if not" pattern that isn't atomic. If two concurrent
-- processes (e.g. overlapping worker instances during a deploy restart) ran
-- this within the same moment, both could pass the "doesn't exist yet"
-- check before either insert landed, producing duplicate rows for the same
-- reply. Confirmed live: 3 identical rows for one real reply, created 0.7
-- seconds apart.
--
-- Dedupe first (keep the earliest row per lead+campaign+user, delete the
-- rest) — a unique constraint can't be added while duplicates exist.
DELETE FROM inbox_threads a USING inbox_threads b
WHERE a.user_id = b.user_id
  AND a.lead_id = b.lead_id
  AND a.campaign_id = b.campaign_id
  AND a.created_at > b.created_at;

ALTER TABLE inbox_threads
  ADD CONSTRAINT inbox_threads_user_lead_campaign_key UNIQUE (user_id, lead_id, campaign_id);

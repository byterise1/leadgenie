-- Shared Network Trust Score, Automatic Abuse Detection, Reputation Protection.
-- Run in Supabase → SQL Editor. All changes additive/safe (IF NOT EXISTS).

-- trust_score is distinct from health_score: health_score measures THIS
-- account's own deliverability, trust_score measures how good a network
-- CITIZEN it is (tenure, reliability as a recipient for others, absence of
-- abuse) — feeds pairing weight and isolation decisions.
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 50;

-- network_isolated is distinct from warmup_paused: paused stops an account
-- from SENDING (its own bad signals); isolated additionally excludes it from
-- being selected as a pairing TARGET for other accounts, protecting the rest
-- of the network from pairing with a mailbox that's trending unhealthy.
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS network_isolated BOOLEAN DEFAULT FALSE;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS network_isolation_reason TEXT;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS network_isolated_at TIMESTAMPTZ;

ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS abuse_flag_count INTEGER DEFAULT 0;

-- event_type values added by this migration (used alongside the existing
-- Phase 1 set: sent, spam_placement, rescued_from_spam, bounce, reply, open,
-- auth_error, star, archive, label):
--   recipient_unreachable — logged to the RECIPIENT's account_id when the
--     engage-worker can't connect to/check its mailbox (new: prior events
--     were always credited to the sender, this is the first recipient-side
--     signal)
--   abuse_flag — logged when automatic abuse detection flags an account,
--     meta.reason holds the specific finding
-- No schema change needed for these — email_account_events.event_type is
-- already a free-form TEXT column (see 20260705_warmup_phase1.sql).

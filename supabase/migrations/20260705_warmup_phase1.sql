-- Warmup Phase 1 overhaul: real health scoring, event tracking, pause/recovery, rate limiting.
-- Run this in Supabase → SQL Editor. All changes are additive/safe (IF NOT EXISTS).

-- ── email_accounts: new signal + control columns ──────────────────────────────
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS bounce_count          INTEGER DEFAULT 0;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS spam_count            INTEGER DEFAULT 0;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS reply_count           INTEGER DEFAULT 0;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS open_count            INTEGER DEFAULT 0;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS auth_error_count      INTEGER DEFAULT 0;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS spf_status            TEXT    DEFAULT 'unknown';
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS dkim_status           TEXT    DEFAULT 'unknown';
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS dmarc_status          TEXT    DEFAULT 'unknown';
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS domain_checked_at     TIMESTAMPTZ;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS warmup_paused         BOOLEAN DEFAULT FALSE;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS warmup_pause_reason   TEXT;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS warmup_paused_at      TIMESTAMPTZ;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS consecutive_stable_days INTEGER DEFAULT 0;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS last_health_calc_at   TIMESTAMPTZ;

-- Unify starting health score across all signup paths (was 50/72/85 depending on entry point)
ALTER TABLE email_accounts ALTER COLUMN health_score SET DEFAULT 50;

-- ── email_account_events: granular signal log (feeds the health formula) ──────
CREATE TABLE IF NOT EXISTS email_account_events (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id  uuid        REFERENCES email_accounts(id) ON DELETE CASCADE,
  event_type  TEXT        NOT NULL, -- sent | spam_placement | rescued_from_spam | bounce | reply | open | auth_error | star | archive | label
  meta        JSONB       DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_account_events_account_type_created
  ON email_account_events(account_id, event_type, created_at);

ALTER TABLE email_account_events ENABLE ROW LEVEL SECURITY;

-- Users can read events for their own accounts only
DROP POLICY IF EXISTS "email_account_events_select" ON email_account_events;
CREATE POLICY "email_account_events_select" ON email_account_events
  FOR SELECT USING (
    account_id IN (SELECT id FROM email_accounts WHERE user_id = auth.uid())
  );

-- ── rate_limit_log: sliding-window abuse protection ────────────────────────────
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL,
  action      TEXT        NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limit_log_user_action_created
  ON rate_limit_log(user_id, action, created_at);

ALTER TABLE rate_limit_log ENABLE ROW LEVEL SECURITY;
-- Service role (API routes use supabaseAdmin) writes/reads this — no user-facing policy needed.

-- ── warmup_history: carry the new signal breakdown alongside the score ─────────
ALTER TABLE warmup_history ADD COLUMN IF NOT EXISTS inbox_rate  NUMERIC;
ALTER TABLE warmup_history ADD COLUMN IF NOT EXISTS spam_rate   NUMERIC;
ALTER TABLE warmup_history ADD COLUMN IF NOT EXISTS bounce_rate NUMERIC;
ALTER TABLE warmup_history ADD COLUMN IF NOT EXISTS paused      BOOLEAN DEFAULT FALSE;

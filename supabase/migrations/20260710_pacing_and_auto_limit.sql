-- Per-account send pacing reservation, persisted so it survives across the
-- scheduler's 2-minute cycles (fixes emails sending every ~2min instead of
-- respecting the campaign's configured min/max delay). Also adds an explicit
-- Auto/Manual mode for a campaign's daily limit.
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS next_dispatch_at TIMESTAMPTZ;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS daily_limit_mode TEXT DEFAULT 'auto'
  CHECK (daily_limit_mode IN ('auto', 'manual'));

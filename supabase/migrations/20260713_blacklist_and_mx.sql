-- Warmup Phase 3: free DNSBL blacklist checks + MX monitoring.
-- Run in Supabase → SQL Editor. All changes additive/safe (IF NOT EXISTS).

ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS blacklist_status     TEXT DEFAULT 'unknown';
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS blacklist_details    JSONB DEFAULT '{}';
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS blacklist_checked_at TIMESTAMPTZ;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS mx_status            TEXT DEFAULT 'unknown';

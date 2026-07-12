-- Warmup Phase 2: dual-source network (admin pool + opt-in shared user network),
-- domain/provider-aware fair-rotation pairing. Run in Supabase → SQL Editor.
-- All changes additive/safe (IF NOT EXISTS).

-- ── email_accounts: domain (generated, self-maintaining for every insert path) ─
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS domain TEXT
  GENERATED ALWAYS AS (lower(split_part(email, '@', 2))) STORED;

CREATE INDEX IF NOT EXISTS email_accounts_domain_idx ON email_accounts(domain);

-- ── email_accounts: shared warmup network opt-in (user-facing, defaults on) ────
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS join_shared_network BOOLEAN NOT NULL DEFAULT true;

-- ── warmup_pairings: fairness/recency tracking for partner rotation ────────────
-- Capped at accounts*(accounts-1) rows regardless of history length — recency
-- lookup is a single indexed query instead of an ever-growing aggregate over
-- warmup_emails.
CREATE TABLE IF NOT EXISTS warmup_pairings (
  from_account_id uuid REFERENCES email_accounts(id) ON DELETE CASCADE,
  to_account_id   uuid REFERENCES email_accounts(id) ON DELETE CASCADE,
  last_sent_at    timestamptz,
  send_count      INTEGER DEFAULT 0,
  PRIMARY KEY (from_account_id, to_account_id)
);

CREATE INDEX IF NOT EXISTS warmup_pairings_from_recency
  ON warmup_pairings(from_account_id, last_sent_at);

ALTER TABLE warmup_pairings ENABLE ROW LEVEL SECURITY;
-- Service role (worker uses supabaseAdmin) writes/reads this — no user-facing policy needed.

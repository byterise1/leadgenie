-- Smart Priority Engine for campaign sending: live cycle-based scheduler that
-- always gives due follow-ups first claim on capacity, with new leads
-- guaranteed a share (Auto mode) or a user-set split (Manual mode).
-- Run this in Supabase → SQL Editor. All changes are additive/safe.

-- ── campaigns: follow-up vs new-lead priority control ──────────────────────
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS followup_priority_mode TEXT DEFAULT 'auto'
  CHECK (followup_priority_mode IN ('auto', 'manual'));
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS followup_weight_pct INTEGER;

-- followup_weight_pct is only read when followup_priority_mode = 'manual'.
-- In 'auto' mode the scheduler computes a live weight each cycle from
-- current follow-up load instead. NULL/unset is fine for 'auto' campaigns.

-- Note: campaign_leads.next_send_at already exists in the base schema and
-- was previously unused — the new campaign-scheduler worker is what starts
-- actually reading and writing it.

-- ── campaign_leads: durably persist the locked sending mailbox ────────────
-- Previously "same mailbox for the whole thread" only worked because each
-- BullMQ job carried accountId forward to the next job when queuing the next
-- step. The new live cycle-based scheduler doesn't pre-queue future jobs, so
-- this needs to be stored on the lead itself once its first email goes out.
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES email_accounts(id);


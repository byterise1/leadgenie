-- ═══════════════════════════════════════════════════════
-- Run this ONCE in Supabase SQL Editor (after migration_fix_constraints.sql)
-- ═══════════════════════════════════════════════════════

-- Lead Lists (named folders)
CREATE TABLE IF NOT EXISTS lead_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Many-to-many: lead ↔ list
CREATE TABLE IF NOT EXISTS lead_list_members (
  list_id UUID REFERENCES lead_lists(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (list_id, lead_id)
);

-- Profile avatar
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Campaign sending delay (seconds between each email)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS min_delay_secs INTEGER DEFAULT 60;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS max_delay_secs INTEGER DEFAULT 300;

-- Per-account daily send cap (across all campaigns)
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS daily_limit INTEGER DEFAULT 50;

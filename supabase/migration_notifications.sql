-- ═══════════════════════════════════════════════════════
-- Run this ONCE in Supabase SQL Editor (3rd migration)
-- After migration_fix_constraints.sql + migration_lead_lists.sql
-- ═══════════════════════════════════════════════════════

-- Notifications (written by worker when account hits daily limit)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',  -- 'info' | 'warning' | 'error' | 'success'
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Campaign → Lead List (each campaign targets exactly one list)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS list_id UUID REFERENCES lead_lists(id) ON DELETE SET NULL;

-- Lead lifecycle status
ALTER TABLE leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Unsubscribe tracking on sent emails
ALTER TABLE sent_emails ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ;

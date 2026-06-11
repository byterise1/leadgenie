-- ═══════════════════════════════════════════════════════════════
-- LeadGenie — run this ONCE in Supabase SQL Editor
-- Combines all 3 migrations safely (IF NOT EXISTS everywhere)
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Profiles for any existing users ──────────────────────────
INSERT INTO profiles (id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;

-- ── 2. Unique constraints (safe to re-run) ───────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leads_user_email_unique'
  ) THEN
    ALTER TABLE leads ADD CONSTRAINT leads_user_email_unique UNIQUE (user_id, email);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'email_accounts_user_email_unique'
  ) THEN
    ALTER TABLE email_accounts ADD CONSTRAINT email_accounts_user_email_unique UNIQUE (user_id, email);
  END IF;
END $$;

-- ── 3. Lead Lists ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS lead_list_members (
  list_id UUID REFERENCES lead_lists(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (list_id, lead_id)
);

-- ── 4. Notifications ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── 5. Column additions (all safe to re-run) ────────────────────
ALTER TABLE profiles         ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE campaigns        ADD COLUMN IF NOT EXISTS min_delay_secs INTEGER DEFAULT 60;
ALTER TABLE campaigns        ADD COLUMN IF NOT EXISTS max_delay_secs INTEGER DEFAULT 300;
ALTER TABLE campaigns        ADD COLUMN IF NOT EXISTS list_id UUID REFERENCES lead_lists(id) ON DELETE SET NULL;
ALTER TABLE email_accounts   ADD COLUMN IF NOT EXISTS daily_limit INTEGER DEFAULT 50;
ALTER TABLE leads             ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE sent_emails       ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ;

-- ── 6. RLS policies for new tables ──────────────────────────────
ALTER TABLE lead_lists        ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications     ENABLE ROW LEVEL SECURITY;

-- lead_lists policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lead_lists' AND policyname='Users manage own lists') THEN
    CREATE POLICY "Users manage own lists" ON lead_lists FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- lead_list_members policies (access through list ownership)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lead_list_members' AND policyname='Users manage own list members') THEN
    CREATE POLICY "Users manage own list members" ON lead_list_members FOR ALL
      USING (list_id IN (SELECT id FROM lead_lists WHERE user_id = auth.uid()));
  END IF;
END $$;

-- notifications policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='Users manage own notifications') THEN
    CREATE POLICY "Users manage own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── Done ─────────────────────────────────────────────────────────
SELECT 'Migrations complete ✓' AS result;

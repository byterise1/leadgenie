-- ═══════════════════════════════════════════════════════════════
-- LeadGenie — PENDING MIGRATIONS (run once in Supabase SQL Editor)
-- All statements use IF NOT EXISTS — safe to run multiple times
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Lead Import Jobs (required for file import / validation) ──────────────
CREATE TABLE IF NOT EXISTS lead_import_jobs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  list_id        UUID        REFERENCES lead_lists(id) ON DELETE SET NULL,
  list_name      TEXT,
  filename       TEXT,
  status         TEXT        NOT NULL DEFAULT 'processing',
  progress       INTEGER     NOT NULL DEFAULT 0,
  total_emails   INTEGER     NOT NULL DEFAULT 0,
  results        JSONB,
  summary        JSONB,
  probe_data     JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS lead_import_jobs_user_idx ON lead_import_jobs (user_id, created_at DESC);
ALTER TABLE lead_import_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users own their import jobs" ON lead_import_jobs;
CREATE POLICY "users own their import jobs" ON lead_import_jobs FOR ALL USING (auth.uid() = user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE lead_import_jobs;

-- ── 2. email_accounts — all columns needed ───────────────────────────────────
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS daily_limit       INTEGER  DEFAULT 50;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS health_score      INTEGER  DEFAULT 80;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS warmup_day        INTEGER  DEFAULT 0;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS warmup_target     INTEGER  DEFAULT 40;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS warmup_enabled    BOOLEAN  DEFAULT FALSE;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS warmup_pool_mode  TEXT     DEFAULT 'admin_pool';
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS sent_today        INTEGER  DEFAULT 0;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS is_pool_account   BOOLEAN  DEFAULT FALSE;

-- ── 3. sent_emails — all columns needed ─────────────────────────────────────
ALTER TABLE sent_emails ADD COLUMN IF NOT EXISTS message_id       TEXT;
ALTER TABLE sent_emails ADD COLUMN IF NOT EXISTS unsubscribed_at  TIMESTAMPTZ;
ALTER TABLE sent_emails ADD COLUMN IF NOT EXISTS clicked_at       TIMESTAMPTZ;
ALTER TABLE sent_emails ADD COLUMN IF NOT EXISTS ab_variant       TEXT DEFAULT 'A';

-- ── 4. email_steps — A/B testing and threading ───────────────────────────────
ALTER TABLE email_steps ADD COLUMN IF NOT EXISTS thread_mode  TEXT    DEFAULT 'new_thread';
ALTER TABLE email_steps ADD COLUMN IF NOT EXISTS ab_variants  JSONB   DEFAULT '[]';

-- ── 5. profiles ──────────────────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin    BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url  TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan        TEXT    DEFAULT 'free';

-- ── 6. campaigns ─────────────────────────────────────────────────────────────
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS min_delay_secs INTEGER DEFAULT 60;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS max_delay_secs INTEGER DEFAULT 300;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS list_id UUID REFERENCES lead_lists(id) ON DELETE SET NULL;

-- ── 7. notifications ─────────────────────────────────────────────────────────
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;

-- ── 8. support_tickets — threading + admin tracking ──────────────────────────
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS messages       JSONB DEFAULT '[]';
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS user_seen_at   TIMESTAMPTZ;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS attachments    JSONB DEFAULT '[]';
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS admin_seen_at  TIMESTAMPTZ;

-- ── 9. leads ─────────────────────────────────────────────────────────────────
ALTER TABLE leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- ── 10. User Templates table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_templates (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  category         TEXT        NOT NULL DEFAULT 'Cold Outreach',
  subject          TEXT        NOT NULL DEFAULT '',
  body             TEXT        NOT NULL DEFAULT '',
  unsub_text       TEXT        NOT NULL DEFAULT 'To unsubscribe, click here: {{unsubscribe_link}}',
  source_builtin_id INTEGER     NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE user_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own templates" ON user_templates;
CREATE POLICY "Users manage own templates" ON user_templates FOR ALL USING (auth.uid() = user_id);

-- ── 11. Prebuilt Templates table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prebuilt_templates (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  category   TEXT        NOT NULL DEFAULT 'Cold Outreach',
  subject    TEXT        NOT NULL DEFAULT '',
  body       TEXT        NOT NULL DEFAULT '',
  unsub_text TEXT        NOT NULL DEFAULT 'To unsubscribe, click here: {{unsubscribe_link}}',
  open_rate  TEXT,
  reply_rate TEXT,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  active     BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE prebuilt_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read prebuilt_templates" ON prebuilt_templates;
CREATE POLICY "Public read prebuilt_templates" ON prebuilt_templates FOR SELECT USING (true);

-- ── 12. Pricing Plans table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pricing_plans (
  id                 TEXT        PRIMARY KEY,
  name               TEXT        NOT NULL,
  tagline            TEXT        NOT NULL DEFAULT '',
  monthly_price      INTEGER     NOT NULL DEFAULT 0,
  annual_price       INTEGER     NOT NULL DEFAULT 0,
  credits_per_month  INTEGER     NOT NULL DEFAULT 0,
  features           JSONB       NOT NULL DEFAULT '[]',
  highlighted        BOOLEAN     NOT NULL DEFAULT false,
  cta_label          TEXT        NOT NULL DEFAULT 'Get Started',
  sort_order         INTEGER     NOT NULL DEFAULT 0,
  active             BOOLEAN     NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read pricing_plans" ON pricing_plans;
DROP POLICY IF EXISTS "Admin manage pricing_plans" ON pricing_plans;
CREATE POLICY "Public read pricing_plans" ON pricing_plans FOR SELECT USING (true);
CREATE POLICY "Admin manage pricing_plans" ON pricing_plans FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ── 13. Billing Events table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type         TEXT        NOT NULL DEFAULT 'payment' CHECK (type IN ('payment','upgrade','downgrade','refund','credit')),
  plan_id      TEXT,
  amount       INTEGER     NOT NULL DEFAULT 0,
  currency     TEXT        NOT NULL DEFAULT 'usd',
  status       TEXT        NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','failed','pending','refunded')),
  description  TEXT,
  period_start DATE,
  period_end   DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own billing_events" ON billing_events;
DROP POLICY IF EXISTS "Admin manage billing_events" ON billing_events;
CREATE POLICY "Users read own billing_events" ON billing_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin manage billing_events" ON billing_events FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ── 14. RLS for lead_lists and lead_list_members (if missing) ─────────────────
ALTER TABLE lead_lists        ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_list_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own lists"        ON lead_lists;
DROP POLICY IF EXISTS "Users manage own list members" ON lead_list_members;
CREATE POLICY "Users manage own lists" ON lead_lists FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own list members" ON lead_list_members FOR ALL
  USING (list_id IN (SELECT id FROM lead_lists WHERE user_id = auth.uid()));

-- ── 15. Unique constraints (safe, checks before adding) ──────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_user_email_unique') THEN
    ALTER TABLE leads ADD CONSTRAINT leads_user_email_unique UNIQUE (user_id, email);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_accounts_user_email_unique') THEN
    ALTER TABLE email_accounts ADD CONSTRAINT email_accounts_user_email_unique UNIQUE (user_id, email);
  END IF;
END $$;

SELECT 'All pending migrations applied ✓' AS result;

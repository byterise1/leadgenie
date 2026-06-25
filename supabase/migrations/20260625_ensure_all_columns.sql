-- Run this in Supabase → SQL Editor if the warmup page shows a column-not-found error
-- All changes are safe (IF NOT EXISTS / IF NOT EXISTS)

-- email_accounts — columns required by warmup and pool features
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS warmup_day        INTEGER DEFAULT 0;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS warmup_target     INTEGER DEFAULT 40;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS sent_today        INTEGER DEFAULT 0;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS daily_limit       INTEGER DEFAULT 50;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS health_score      INTEGER DEFAULT 80;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS is_pool_account   BOOLEAN DEFAULT FALSE;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS warmup_pool_mode  TEXT    DEFAULT 'admin_pool';

-- sent_emails — message_id for threading
ALTER TABLE sent_emails ADD COLUMN IF NOT EXISTS message_id TEXT;

-- email_steps — thread_mode for follow-up threading
ALTER TABLE email_steps ADD COLUMN IF NOT EXISTS thread_mode TEXT DEFAULT 'new_thread';

-- notifications — link column
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;

-- Support tickets — threading and attachments
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS messages    JSONB DEFAULT '[]';
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS user_seen_at TIMESTAMPTZ;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

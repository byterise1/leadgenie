-- ═══════════════════════════════════════════
-- Run this ONCE in Supabase SQL Editor
-- ═══════════════════════════════════════════

-- 1. Create profiles for any existing users who never got one
INSERT INTO profiles (id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;

-- 2. Add unique constraint to leads so upsert ON CONFLICT works
ALTER TABLE leads ADD CONSTRAINT leads_user_email_unique UNIQUE (user_id, email);

-- 3. Add unique constraint to email_accounts so upsert ON CONFLICT works
ALTER TABLE email_accounts ADD CONSTRAINT email_accounts_user_email_unique UNIQUE (user_id, email);

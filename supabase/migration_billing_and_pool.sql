-- Run this in Supabase SQL editor

-- 1. Mark admin-added warmup pool accounts
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS is_pool_account boolean DEFAULT false;

-- 2. Billing events (manual invoice tracking, no Stripe required)
CREATE TABLE IF NOT EXISTS billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'payment' CHECK (type IN ('payment','upgrade','downgrade','refund','credit')),
  plan_id text,
  amount integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','failed','pending','refunded')),
  description text,
  period_start date,
  period_end date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own billing_events" ON billing_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin manage billing_events" ON billing_events FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

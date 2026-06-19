-- Run this in Supabase SQL editor
CREATE TABLE IF NOT EXISTS pricing_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  tagline text NOT NULL DEFAULT '',
  monthly_price integer NOT NULL DEFAULT 0,
  annual_price integer NOT NULL DEFAULT 0,
  credits_per_month integer NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '[]',
  highlighted boolean NOT NULL DEFAULT false,
  cta_label text NOT NULL DEFAULT 'Get Started',
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read pricing_plans" ON pricing_plans FOR SELECT USING (true);
CREATE POLICY "Admin manage pricing_plans" ON pricing_plans FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

INSERT INTO pricing_plans (id, name, tagline, monthly_price, annual_price, credits_per_month, features, highlighted, cta_label, sort_order) VALUES
('free', 'Free', 'Try it out, no card needed', 0, 0, 1000,
 '["3 campaigns","500 leads","1,000 emails / mo","1 email account","Built-in templates","Basic analytics"]',
 false, 'Get Started Free', 1),

('starter', 'Starter', 'For solo founders & small teams', 29, 23, 5000,
 '["10 campaigns","5,000 leads","5,000 emails / mo","5 email accounts","Built-in templates","Full analytics","Chat support"]',
 false, 'Start Free Trial', 2),

('pro', 'Pro', 'Most popular for growing teams', 49, 39, 50000,
 '["Unlimited campaigns","Unlimited leads","50,000 emails / mo","Unlimited accounts","AI email writer","A/B testing","Unibox (all replies)","Priority support"]',
 true, 'Start Free Trial', 3),

('agency', 'Agency', 'For high-volume outreach teams', 149, 119, 500000,
 '["Everything in Pro","Multi-workspace","White-label reports","Dedicated CSM","Custom integrations","SLA guarantee","Onboarding session"]',
 false, 'Contact Sales', 4);

-- Run this in Supabase SQL editor
CREATE TABLE IF NOT EXISTS user_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Cold Outreach',
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  unsub_text text NOT NULL DEFAULT 'To unsubscribe, click here: {{unsubscribe_link}}',
  source_builtin_id integer NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

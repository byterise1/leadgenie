-- Run this in Supabase SQL Editor
-- Adds template_id to email_steps so we can track which template was used in each campaign step

ALTER TABLE email_steps
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES user_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_email_steps_template_id ON email_steps(template_id);

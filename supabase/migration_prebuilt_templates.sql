-- Run this in Supabase SQL editor
CREATE TABLE IF NOT EXISTS prebuilt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Cold Outreach',
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  unsub_text text NOT NULL DEFAULT 'To unsubscribe, click here: {{unsubscribe_link}}\n{{company_address}}',
  open_rate text,
  reply_rate text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE prebuilt_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read prebuilt_templates" ON prebuilt_templates FOR SELECT USING (true);
CREATE POLICY "Admin manage prebuilt_templates" ON prebuilt_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

INSERT INTO prebuilt_templates (name, category, subject, body, open_rate, reply_rate, sort_order) VALUES
('The Problem Solver', 'Cold Outreach', 'Quick question about {{company}}''s growth',
'Hi {{first_name}},

I was looking at {{company}} and noticed a few things we could help with.

We helped similar companies go from stuck to scaling in just 60 days.

Worth a 15-min call to see if we can do the same for you?

[Your Name]', '67%', '18%', 1),

('The Compliment Hook', 'Cold Outreach', 'Quick thought for {{company}}',
'Hi {{first_name}},

I came across {{company}} and was impressed by what you''re building.

That made me think you''d appreciate what we''re building — we [One-line value prop].

Would you be open to a quick chat?

Best,
[Your Name]', '72%', '21%', 2),

('The Gentle Nudge', 'Follow-up', 'Re: my last email',
'Hi {{first_name}},

Just wanted to bump this up in case it got buried.

Did you get a chance to look at my previous email? I know inboxes get hectic.

Happy to keep it to 10 minutes if that''s easier.

[Your Name]', '61%', '14%', 3),

('The Value Add', 'Follow-up', 'Something useful for {{company}}',
'Hi {{first_name}},

I put together a quick breakdown of how companies like {{company}} are growing faster with less effort.

[Link to resource / case study]

No strings attached — thought it might be useful.

[Your Name]', '58%', '12%', 4),

('The Direct Ask', 'Meeting Request', '15 mins this week?',
'Hi {{first_name}},

I''ll keep this short — I think we can help {{company}} get better results.

We''ve done it for [Company A] and [Company B].

15 mins this week to show you how? [Calendly Link]

[Your Name]', '64%', '19%', 5),

('The Permission Email', 'Break-up', 'Should I close your file?',
'Hi {{first_name}},

I''ve reached out a few times but haven''t heard back — which usually means one of two things:

1. The timing is off
2. This isn''t a priority right now

Either way, totally fine. Should I close your file?

[Your Name]', '71%', '28%', 6),

('The Check-In', 'Re-engagement', 'Still relevant for {{company}}?',
'Hi {{first_name}},

We connected a while back — I wanted to check in since a lot has changed on our end.

We''ve improved [area] that specifically addresses what we discussed.

Would it make sense to reconnect?

[Your Name]', '55%', '16%', 7);

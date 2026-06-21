-- Support ticket threading, seen tracking, and file attachments
-- Run this in your Supabase SQL editor

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS messages JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS user_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- Allow users to read/update their own tickets (for mark_seen and follow-up)
-- If RLS is enabled, ensure this policy exists:
-- CREATE POLICY "Users can update own tickets" ON support_tickets
--   FOR UPDATE USING (auth.uid() = user_id);

-- Create Supabase Storage bucket for support attachments (run in dashboard or here):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('support-attachments', 'support-attachments', true)
-- ON CONFLICT DO NOTHING;

-- Storage policy to allow authenticated users to upload to their ticket folder:
-- CREATE POLICY "Authenticated upload support attachments" ON storage.objects
--   FOR INSERT TO authenticated WITH CHECK (bucket_id = 'support-attachments');
-- CREATE POLICY "Public read support attachments" ON storage.objects
--   FOR SELECT USING (bucket_id = 'support-attachments');

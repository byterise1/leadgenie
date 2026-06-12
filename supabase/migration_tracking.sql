-- Add click tracking to sent_emails
-- Run this in Supabase SQL Editor

ALTER TABLE sent_emails ADD COLUMN IF NOT EXISTS clicked_at timestamptz;

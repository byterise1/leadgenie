-- Fix: add missing 'link' column to notifications table
-- This column is required for bell notifications to show and navigate correctly.
-- Without it, ALL notification inserts fail silently and the GET returns a 500 error.

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;

-- Verify the column now exists:
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

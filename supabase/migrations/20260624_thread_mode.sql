-- Add thread_mode to email_steps: controls whether follow-ups reply in thread or start new thread
ALTER TABLE email_steps
  ADD COLUMN IF NOT EXISTS thread_mode TEXT NOT NULL DEFAULT 'new_thread';

-- Add comment for clarity
COMMENT ON COLUMN email_steps.thread_mode IS 'reply = sends as In-Reply-To step 0; new_thread = sends with its own subject as a new email';

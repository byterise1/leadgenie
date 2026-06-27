-- Warmup daily history: one row per email per day
-- email is denormalized so history survives account deletion or reconnection by a different user
CREATE TABLE IF NOT EXISTS warmup_history (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id    uuid        REFERENCES email_accounts(id) ON DELETE SET NULL,
  email         text        NOT NULL,
  user_id       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  date          date        NOT NULL,
  day_number    int         NOT NULL DEFAULT 0,
  emails_sent   int         NOT NULL DEFAULT 0,
  health_score  int         NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS warmup_history_email_date ON warmup_history(email, date);
CREATE INDEX IF NOT EXISTS warmup_history_account_id ON warmup_history(account_id);
CREATE INDEX IF NOT EXISTS warmup_history_email ON warmup_history(email);

ALTER TABLE warmup_history ENABLE ROW LEVEL SECURITY;

-- Users can only read history for their own accounts
CREATE POLICY "warmup_history_select" ON warmup_history
  FOR SELECT USING (user_id = auth.uid());

-- Service role (worker) can insert/update without restriction

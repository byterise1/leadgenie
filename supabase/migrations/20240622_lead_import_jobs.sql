-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS lead_import_jobs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  list_id        UUID        REFERENCES lead_lists(id) ON DELETE SET NULL,
  list_name      TEXT,
  filename       TEXT,
  status         TEXT        NOT NULL DEFAULT 'processing', -- processing / done / failed / imported
  progress       INTEGER     NOT NULL DEFAULT 0,            -- 0–100
  total_emails   INTEGER     NOT NULL DEFAULT 0,
  results        JSONB,                                     -- EmailResult[] once done
  summary        JSONB,                                     -- JobSummary once done
  probe_data     JSONB,                                     -- temp storage for worker; cleared after done
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS lead_import_jobs_user_idx
  ON lead_import_jobs (user_id, created_at DESC);

ALTER TABLE lead_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users own their import jobs"
  ON lead_import_jobs FOR ALL
  USING (auth.uid() = user_id);

-- Add to realtime so the leads page can subscribe to progress updates
ALTER PUBLICATION supabase_realtime ADD TABLE lead_import_jobs;

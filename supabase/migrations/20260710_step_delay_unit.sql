-- Per-campaign follow-up delay unit, in real milliseconds per "1 day" of
-- configured step delay. Stamped once at campaign creation time and never
-- changed afterward, so flipping the app's TEST_MODE_FAST_FOLLOWUPS flag
-- only affects campaigns created AFTER the flip - existing campaigns keep
-- whichever unit they were created with, forever.
--
-- Default (86400000 = 24h) exactly matches today's real-day behavior, so
-- every existing campaign is completely unaffected by this migration.
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS step_delay_unit_ms BIGINT NOT NULL DEFAULT 86400000;

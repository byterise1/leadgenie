-- Explicit per-campaign "this is a test campaign" flag, replacing the old
-- implicit signal (step_delay_unit_ms === 60000) for deciding whether the
-- "Skip to Next Day" button is allowed to touch a campaign.
--
-- Why: TEST_MODE_FAST_FOLLOWUPS (1 day = 1 real minute) is being retired —
-- going forward every campaign uses real day-based delays, matching
-- production exactly, so there's no mode to remember to switch back. The
-- ONLY test-acceleration mechanism from now on is the Skip to Next Day
-- button, which needs its own opt-in flag independent of delay timing.
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS is_test_campaign BOOLEAN NOT NULL DEFAULT false;

-- Backfill: any campaign created while fast-mode was on already relied on
-- the button (that was the whole point of step_delay_unit_ms=60000) — carry
-- that forward as is_test_campaign=true so those campaigns don't lose access
-- to the button now that the gate no longer reads step_delay_unit_ms.
UPDATE campaigns SET is_test_campaign = true WHERE step_delay_unit_ms = 60000;

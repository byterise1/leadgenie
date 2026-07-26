-- Per-step toggle for the open-tracking pixel, mirroring the existing
-- include_unsub pattern exactly. Real A/B testing this session showed
-- removing the tracking pixel helped a business-domain sending account move
-- from mostly-Promotions to mostly-Inbox placement — this makes that lever
-- available per-step instead of the pixel being unconditionally appended.
-- Default true: preserves existing open-rate analytics/behavior everywhere;
-- the campaign editor's Deliverability Safety Check (see lib/deliverability-check.ts)
-- is the nudge mechanism suggesting turning it off for cold-outreach steps,
-- not a changed default.
ALTER TABLE email_steps ADD COLUMN IF NOT EXISTS include_tracking boolean DEFAULT true;

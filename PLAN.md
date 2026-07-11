# Lead Genie — Living Project Plan
> **Rule**: Update this file after EVERY change. One edit to data/style/copy here means update every place it appears across all pages.
> **Last updated**: 2026-07-11

---

## 0. PROJECT STATUS & CONTINUITY — READ THIS FIRST ON ANY NEW MACHINE/SESSION

**This file is the portable source of truth.** It lives in the git repo, so `git pull`/`git clone` brings it to any laptop. Claude's memory files (`~/.claude/projects/.../memory/*.md`) are deeper but live **only on the machine that wrote them** — they will not follow you to a new laptop unless that folder is copied too. If you're starting fresh somewhere new: read this section, then the rest of this file, then the code. That's enough to resume.

**What this project is:** LeadGenie ("Lead Genie" in UI copy) — a cold email outreach SaaS competing with Instantly/Smartlead/ManyReach. Next.js 15 + TypeScript + Tailwind, Supabase (auth+DB), Redis/BullMQ (background workers), Nodemailer (real email sending), deployed on Railway (needs a long-running process for the workers — not Vercel-serverless-compatible). GitHub: `https://github.com/byterise1/leadgenie.git` (main branch, auto-pushes on every commit via a post-commit hook).

**The two big systems, both fully rebuilt this cycle:**

1. **Warmup** (`app/dashboard/warmup/page.tsx`, `app/admin/warmup/page.tsx`, `instrumentation.ts`'s `warmup` worker, `lib/warmup-health.ts`) — Phase 1 overhaul done 2026-07-05: real formula-driven health score (can go down, not just up), adaptive send caps by health/provider, auto-pause on bad signals + auto-recovery, one-mailbox-one-identity, rate limiting. Migration `20260705_warmup_phase1.sql` **run and verified live**. Since then (2026-07-07): a per-account **"Reset warmup"** button (wipes history, restarts at Day 0/health 50 — the toggle off/on does NOT do this, by design, it resumes) and a fix so the Stats tab's daily history stays in sync with the live health score all day (previously only updated once/day, causing visible mismatches between the Accounts tab and Stats tab for the same account). Full detail/reasoning: `[memory] project-warmup-overhaul.md`.

2. **Campaign sending — "Smart Priority Engine"** (`lib/campaign-scheduling.ts`, `instrumentation.ts`'s new `campaign-scheduler` worker, `app/api/campaigns/[id]/start/route.ts`, campaign creation wizard + detail page) — a full rewrite done 2026-07-07, replacing the old "pre-schedule every send with a fixed delay at campaign launch" model with a **live recurring scheduler** (every 2 minutes) that decides what to send based on real-time priority and capacity:
   - Due follow-ups always get first claim on a campaign's daily capacity; new leads are guaranteed a share too (never fully starved) — either **Auto** (system computes the split live from current load) or **Manual** (user sets a 0–100% slider), settable at campaign creation or anytime after on the campaign detail page.
   - New leads go to whichever eligible mailbox has the most room today (was: random).
   - Each lead is locked to the same mailbox for its entire thread — persisted in a new `campaign_leads.account_id` column (previously this only worked via data passed job-to-job in the old pre-scheduled queue, which the new model has no equivalent for).
   - Reply/bounce/unsubscribe eligibility is a query filter when building each cycle's candidate pool — never a later "check and stop" step (a compliance requirement, not style).
   - Migration `20260707_smart_priority_engine.sql` **run and verified live**.
   - **Found and fixed via live testing, same day**: a jitter-timing bug (fixed real-world minutes swamped test-mode's 1-minute-per-"day" delays), a cross-cycle send-stagger overlap (two sends could land seconds apart despite a configured minimum gap), a campaign-detail progress bar that showed "all done" for a sequence that stopped early on a reply, a silent reply-detection gap for IMAP/SMTP mailboxes (only step 0 ever got a stored Message-ID, so a reply to a follow-up — not the first email — could never be matched; every step now gets its own), an Email Sequence card that sorted by a field name that doesn't exist (steps could display out of order), and a missing auto-refresh on the campaign detail page (stats needed a manual reload).
   - Full detail/reasoning, including what was checked and confirmed NOT a bug: `[memory] project-campaign-sending.md`.

**Global follow-up timing is real production (24h), and has been since 2026-07-07** — `DELAY_UNIT_MS` in `lib/campaign-scheduling.ts` is `24*60*60*1000`. The line that used to be here (claiming test mode was still globally on at 1 minute) was stale/wrong — kept for a while after the 2026-07-07 flip, corrected 2026-07-10.

**⚙️ `TEST_MODE_FAST_FOLLOWUPS` RETIRED 2026-07-11 — now `false`, kept as dead-but-working code, not deleted.** Superseded by an explicit per-campaign `campaigns.is_test_campaign` flag (checkbox at creation) that gates the "⏩ Skip to Next Day" button independent of delay timing — every campaign, test or not, now uses real day-based delays always, matching production exactly, so there's no global mode to remember to flip back. See the 2026-07-11 section below for full detail. Campaigns created before the retirement that had `step_delay_unit_ms=60000` were backfilled to `is_test_campaign=true` in the same migration so they don't lose the button.

**⚠️ ACTIVE temp DB testing state (2026-07-11, NOT a code flag, will not survive a "check git log" resume) — read `[memory] project-temp-warmup-boost-2026-07-11.md` if resuming:** 3 real `email_accounts` rows (`Info@byterisellc.com`, `ashley@byterisellc.com`, `uaeshopify123@gmail.com`) had `warmup_day` bumped to 14 directly in the DB to unlock send capacity for live testing. Original values (4, 0, 4 respectively) and revert SQL are in that memory file. **Revert when the user confirms today's testing session is done** — nothing in git or this file will remind a future session otherwise.

**Migrations — 1 pending as of 2026-07-11 (confirmed live via direct query, not assumed):** `supabase/migrations/20260711_test_campaign_flag.sql` (`campaigns.is_test_campaign`) — **CONFIRMED RUN**, column exists in production. `supabase/migrations/20260712_already_warmed_up.sql` (`email_accounts.already_warmed_up`) — **NOT YET RUN, user must run it in the Supabase SQL Editor**, otherwise `POST /api/email-accounts` and the Gmail OAuth callback will error on every new account connection (inserting into a column that doesn't exist yet). SQL: `ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS already_warmed_up BOOLEAN NOT NULL DEFAULT false;`. All earlier migrations (`20260705_warmup_phase1.sql` through `20260711_test_campaign_flag.sql`) remain run and verified live. There is no automated runner — Claude cannot execute DDL directly against this database (no direct Postgres connection available, only the Supabase JS client, which can read/write rows but not ALTER TABLE).

### Remaining Work & Roadmap — living checklist, update whenever priorities shift

**Production-readiness (things blocking a real launch):**
- [x] TEST MODE flip — `DELAY_UNIT_MS` changed from 1 minute to 24 real hours (2026-07-07). Follow-ups now wait real days.
- [x] **Domain migration to leadsgenie.site — fully DONE 2026-07-09.** Real domain purchased, placeholder `leadgenie.io`/`leadsgenie.io` text replaced in code (commit `f26912b`), Railway custom domain added + DNS verified (ALIAS `@`→Railway target + TXT verify record), `SITE_URL` env var set to `https://leadsgenie.site`, Google OAuth redirect URIs added (old Railway/Vercel ones kept alongside, not removed). Confirmed live: `https://leadsgenie.site` returns 200 with valid SSL. Full detail: `[memory] project-domain-migration.md`.
- [ ] SPF/DKIM/DMARC for **byterisellc.com** — user has now designated this as the dedicated cold-pitch sending domain (`info@byterisellc.com`), kept deliberately separate from their real company domain `byterise.com` to protect its reputation. **Explicitly on hold — user said "don't touch, it's pending" (2026-07-09). Do not set up DNS/Titan for this domain until user says go.**
- [ ] Stripe billing integration — currently a manual `billing_events` table only, no real payment processing.
- [ ] Review/clean up duplicate & error `email_accounts` rows left over from pre-one-mailbox-one-identity test data (not the active user's data, harmless but untidy).
- [x] Logo/images not loading in production — DONE 2026-07-09. Root cause was Next.js's built-in image optimizer failing its internal self-fetch when self-hosted behind Railway's reverse proxy (`received null` in Railway's own logs), not a `sharp` issue as first assumed. Fixed via `images: { unoptimized: true }` in `next.config.mjs`. Full detail: `[memory] project-image-optimizer-fix.md`.
- [x] FK violation deleting an email account mid-campaign — DONE 2026-07-09, commit `29b8d67`. `campaign_leads.account_id` (added 2026-07-07) had no delete handling in the account-delete route. Verified live. Full detail: `[memory] project-step-editing.md`.

**Campaign engine — deferred features (not bugs, just not built):**
- [x] Edit follow-up steps (add/remove/reorder/edit content) on a paused or draft campaign — DONE 2026-07-09, migrated (`current_step_id` on `campaign_leads`), verified live via real HTTP requests against a test campaign. Active/completed campaigns still reject edits. Follow-up UI pass same day: drag-and-drop reordering, more polished edit forms, and an actual editing UI for Schedule & Limits (daily limit/send window/timezone/active days/start date/delay — backend already supported this anytime, just had no UI). Full detail: `[memory] project-step-editing.md`.
- [x] Automatic mailbox failover when a lead's locked mailbox goes bad — DONE 2026-07-10, notifications now name the specific healthy sibling mailbox absorbing the load (or honestly say sends are paused if none exists). Manual retry-lead route also fixed to pick a health/pacing-aware account instead of blindly using `accounts[0]`.
- [x] Pre-launch send-volume forecast panel — DONE 2026-07-10, "Campaign Forecast" card (was "Campaign Capacity Estimate") now caps its per-day estimate with the real warmup-aware account capacity (was ignoring warmup ramp entirely), breaks the number into new-leads/day vs follow-ups/day vs total, and shows a side-by-side "current setup vs +2 mailboxes" completion-date comparison.
- [ ] Per-lead timezone-aware send time (currently one shared campaign-wide window).
- [x] Thread mode visibility/editing, Next-Send date+reason per lead, last-edited timestamp — DONE 2026-07-11, migration pending. User audited a live campaign ("final2") end-to-end and confirmed only one real bug (thread mode invisible after creation), then requested these as the prioritized next improvements. Migration `supabase/migrations/20260712_campaign_updated_at.sql` (`campaigns.updated_at`) — **NOT YET RUN**.
  - **Thread mode now visible + editable after creation** (previously only settable in the wizard, then invisible forever): `app/dashboard/campaigns/[id]/page.tsx`'s Email Sequence card shows a "Reply"/"New thread" badge per step, and the paused-campaign step editor (both edit-existing and add-new forms) now has a Reply/New Thread toggle. Backend: `PATCH`/`POST /api/campaigns/[id]/steps[/[stepId]]` now accept `thread_mode`, validated to `'reply'|'new_thread'`; a newly-added follow-up defaults to `'reply'` (matches the wizard's own default for its "+ Add Follow-up Step" button — a step added after the fact is almost always meant to continue the thread).
  - **Same-day (0-day) delay now also editable on existing/paused campaigns**, not just at creation — the step editor's delay input had the same `min={1}` restriction the wizard dropdown had before that fix; changed to `min={0}` on both the edit-existing and add-new forms, with "(0 = same day)" labeled explicitly.
  - **Leads table gets a new "Next Send" column**: for `active` leads, shows the next step's scheduled date/time + a relative label ("in 2d") + which step/subject is coming up next (pulls from the already-loaded `campaign.email_steps`, no new query). For `pending` leads, shows why they haven't started yet ("Queued — waiting for capacity" if the campaign is active, "Waiting — campaign paused" if not) instead of a bare "Not started." Terminal-status leads (replied/unsubscribed/bounced/completed) show "—" since the existing Status column already explains those. Backend: `GET /api/campaigns/[id]/leads` now selects `next_send_at` (wasn't previously returned).
  - **"Last edited" timestamp** on the campaign header, next to Created/Goal — only shown when it differs from `created_at`. New `campaigns.updated_at` column, bumped by the generic `PATCH /api/campaigns/[id]` route (covers Pause, Schedule & Limits, Follow-up Priority edits — all already routed through this one endpoint) and by all 3 step-editing routes (add/edit/delete/reorder). Deliberately NOT touched by the sending worker's own progress writes (`total_sent` etc.) in `instrumentation.ts` — this tracks when a person last changed something, not when the campaign last did something.
    - **Real risk caught before shipping**: the generic PATCH route merges `updated_at` into the SAME update call as the actual field being changed (e.g. Pause's `status` change). An invalid column reference fails the WHOLE Postgres update, so until the migration ran, Pause/Schedule/Follow-up-Priority edits would have broken entirely — not just the timestamp. Fixed with the same graceful-degradation pattern already used for the Phase 1 warmup migration (`safeUpdateAccount` in `instrumentation.ts`): try with `updated_at`, retry without it if the column's missing.
  - **Also fixed while auditing "final2" for this request**: verified multi-day chained delays (e.g. step 2 = +2 days, step 3 = +3 days after that) compute correctly for real (non-test) campaigns — confirmed numerically via 2000-trial simulation using the actual `jitterMs`/formula code, landed within the expected ±30-60min window every time, 5 real days total for a 2-then-3 chain. Not a bug, user asked for explicit confirmation before trusting it in production.
  - **Confirmed NOT bugs during this audit** (see `[memory] project-campaign-sending.md` for full detail): Skip-to-Next-Day firing a multi-day step with one click (by design — button means "advance to next," not "simulate N days"), and the 90%/100% follow-up-weight allocation on "final2"'s actual send log (5 new-lead touches vs 8 follow-up sends, consistent with priority weighting + the documented "leftover always flows to new leads" behavior).
  - **Left open, no repro found:** user reported the UI feeling "slow/stuck" — no matching symptom found in "final2"'s data (all 13 sends completed correctly, no stuck jobs); asked user for a specific page/action to chase next time it happens.

**Real bug found + fixed on a live campaign ("final3"): a reply-mode follow-up could silently switch to a DIFFERENT mailbox than the one that sent the original email in that thread — DONE 2026-07-11.** User reported (garbled but decodable): edited the sequence mid-campaign, some emails "not showing," a reply thread showing a different sender than the original, landing in spam, and "send one, receive two" in a thread. Investigated via live DB query before touching anything.
- **Root cause, confirmed against real data:** two leads (`byterisellc@gmail.com`, `allusnahk321@gmail.com`) had step 0 sent via one mailbox (e.g. `Info@byterisellc.com`), then their next real send (a `thread_mode: 'reply'` step) went out via a COMPLETELY DIFFERENT mailbox (`ashley@byterisellc.com`) — a real, verified mailbox switch mid-thread, not a display artifact. Traced to `instrumentation.ts`'s `campaign-scheduler` worker: the follow-up mailbox-assignment logic falls back to a different, currently-more-available account whenever the lead's locked ("sticky") mailbox isn't `isPacingEligible` this cycle (i.e., still in its post-send cooldown) — this fallback was built for a genuinely different, narrower case (the sticky account has gone permanently unhealthy/paused/errored, matching the existing automatic-failover feature from 2026-07-10), but the code didn't distinguish "permanently unavailable" from "just cooling down this cycle, still perfectly healthy" — it fell back in BOTH cases. For a `reply` step specifically, falling back mid-thread means the "reply" goes out from a different address than the original email in that same thread — broken-looking to the recipient (a real sender-identity mismatch a spam filter would flag) and exactly matches "thread show other from other" / "in spam."
- **Fix:** the fallback now only triggers when there's genuinely no continuity to protect — no persisted `account_id` at all, the step is `thread_mode: 'new_thread'`, or the sticky account is excluded from `accountRemaining` entirely (unhealthy/paused/error/no capacity — the real failover case, left working exactly as before). A healthy sticky account that's merely mid-cooldown for a `reply` step is now simply skipped this cycle instead of reassigned — it self-heals on a later cycle once the cooldown clears, same pattern already used elsewhere in this scheduler. Required adding `email_steps(step_number, thread_mode)` to the campaign-scheduler's own campaign query (wasn't previously selected there at all).
- **Also explained, not a separate bug:** "3rd [email] not showing" — those same 2 leads had their original step 1 deleted mid-campaign (the sequence edit the user mentioned); `deleteStepAndResync`'s documented "skip to next remaining step" policy correctly moved them straight to step 2 — expected behavior for a step deletion, not a new bug. The mailbox-switch bug above is what made the RESULT look broken (a "reply" from an unexpected address), not the skip-forward itself.
- **Folded in while touching this:** the "Next Send" column added earlier today previewed a reply-mode step's own raw `subject` field, but reply steps actually send `"Re: " + step 1's subject` (per the "Re:" prefix fix from earlier this session) — the preview now matches what will actually go out.
- **Resolved same session — user confirmed wants retroactive recompute, gave a full explicit spec, DONE 2026-07-11:** sequence edits on a paused campaign now fully resync waiting leads, and the Email Sequence editor got a full threading UX pass. Two-part change:
  1. **Insert a step → leads waiting exactly at that position get the new step next, instead of silently skipping it.** New `redirectWaitingLeadsToNewStep(campaignId, position, newStepId)` (`lib/campaign-scheduling.ts`) — finds leads with `current_step === position`, points them at the new step, and (if `active`) recomputes `next_send_at` from their real `last_sent_at` using the new step's delay. **Critical ordering bug caught and fixed before shipping**: this must run BEFORE `resyncStepsAfterAddOrReorder`, not after — that call's `refreshLeadStepNumbers` step already advances a waiting lead's `current_step` to match its (identity-preserved) target's new position, so if it ran first, the exact leads this function needs to find would no longer match the query (their `current_step` would already have been bumped). Caught via a careful manual trace before ever running it live, not by trial and error. Leads already PAST the insertion point are untouched by this function — they're already correctly handled by the existing identity-preserving resync (same content, just renumbered, no rejitter).
  2. **Delete a step → unchanged, already correct.** `deleteStepAndResync` already did exactly this (redirect leads at the deleted step to next-remaining, recompute `next_send_at`, mark completed if none) since 2026-07-09 — verified against the user's exact requirements, nothing needed changing.
  3. **Change a step's delay while paused → leads currently waiting on that exact step get `next_send_at` recalculated with the new delay; already-sent emails and other leads are untouched.** New `recomputeNextSendForDelayChange(campaignId, stepId, newDelayDays)`, wired into the step PATCH route — only fires when `delay_days` is actually present AND differs from the step's current stored value (avoids rejittering on a no-op save). Only ever touches `campaign_leads.next_send_at` for `status: 'active'` leads with `current_step_id === stepId` — never `sent_emails` or `last_sent_at`.
  4. **Verified live**, not just by code review: built a throwaway test campaign (3 steps, 2 leads at different positions), ran the actual insert-redirect and delay-recompute functions against it, confirmed all three behaviors numerically (redirected lead got the new step + correctly recomputed timing; unaffected lead's `next_send_at` stayed byte-identical; delay change preserved `last_sent_at` exactly while landing `next_send_at` at 10.02 days out for a 10-day delay), then deleted the throwaway campaign.
  5. **Thread mode UX overhaul on the step editor** (both edit-existing and add-new forms): selecting "Reply in thread" now disables the subject field, shows the live "Re: [step 1 subject]" preview, and displays "Replies reuse the original subject from Step 1." Selecting "New Thread" restores a normal editable subject field. The per-step Reply/New Thread badge (added earlier this session) stays visible on the collapsed sequence view without opening the editor. Robustness fix: `addStep()` now resolves the real subject to send at submit time (not relying on the toggle-button's click handler alone), since `newStepForm` defaults to `thread_mode: 'reply'` — without this, opening "Add Step" and clicking save without ever touching the toggle would have tried to submit an empty subject.
  6. **Drag-and-drop reorder performance**: the PATCH route's step-number-reassignment loop (writes every step's new position after a reorder) was sequential, one row at a time — parallelized with bounded concurrency (`mapWithConcurrency`, now exported from `lib/campaign-scheduling.ts`). The equivalent shift-loop in the ADD route was deliberately left sequential — it has an explicit ordering requirement (high-to-low, avoids a transient step_number collision) that the reorder loop doesn't share, and it only ever touches a handful of rows (step count, not lead count) so parallelizing it had no real upside to weigh against that risk.
  - **Verified:** `npx tsc --noEmit` and full `npm run build` clean.
- **Verified:** `npx tsc --noEmit` and full `npm run build` clean.

**Per-mailbox pacing bug fixed + campaign sending polish — DONE 2026-07-10, commit `ed6c28f`.** User reported real production sends landing ~2 minutes apart (00:59 → 01:01 → 01:03) despite a 10–20 minute configured delay.
- **Root cause, confirmed by reading the exact scheduler code, not guessed:** `instrumentation.ts`'s `campaign-scheduler` worker (runs every 2 min) used a single shared `cursorMs` reset to `0` on every cycle, with zero memory of any mailbox's actual last send. Every cycle's first-assigned job always got `delay: 0`, so a campaign with a steady backlog sent roughly every 2 minutes (the cycle period) — the configured delay never had a chance to apply. Worse: the cursor was shared across every mailbox in a campaign, so a campaign with e.g. 250 connected mailboxes could still only send one email globally per `min_delay_secs`, not 250x that — defeating the entire point of connecting many mailboxes.
- **Fix:** replaced `cursorMs` with a per-account reservation (`dispatchReservation` map in-memory, persisted to new column `email_accounts.next_dispatch_at`) so each mailbox paces independently and the pacing survives across 2-minute cycles and even across different campaigns sharing the same mailbox. An account not yet due within the current cycle's 100s safe window is simply skipped for that lead — picked up automatically once its cooldown clears, never lost.
- **Verified via a standalone simulation** (not just code review): simulated 60 scheduler cycles (2 real hours) for 2 mailboxes with a steady backlog and a 10–20 min configured delay — confirmed no two sends from the same mailbox ever landed closer than 10 minutes apart (was ~2 min), and both mailboxes paced independently near their own full rate (was one shared global rate). Also unit-tested `computeAccountRemaining` (health/pacing/status filtering) and `planBacklogSmoothing` (small backlogs untouched, large backlogs spread, `spread` mode's day count clamped to 1–14) directly.
- **Folded in while touching this code (same root-cause family, all from the same plan the user reviewed and approved):**
  - Manual retry-lead route (`app/api/campaigns/[id]/retry-lead/route.ts`) used to bypass pacing entirely (`delay: 0` unconditionally) and pick `accounts[0]` with no health check. Now reuses the same pacing/health-aware selection (`computeAccountRemaining()`, new export in `lib/campaign-scheduling.ts`) and returns a clear 409 error if every eligible account is still in its cooldown, instead of silently sending anyway.
  - **Auto/Manual daily-limit mode** (`campaigns.daily_limit_mode`, new column): Auto (default) = the campaign's ceiling is the live sum of connected accounts' warmup-aware capacity, no stale stored number to drift out of sync as accounts/health change. Manual = today's stored-number behavior, unchanged. UI toggle mirrors the existing Follow-up Priority Auto/Manual pattern on both the campaign creation wizard and the campaign detail page's Schedule & Limits editor.
  - **Consistent resume:** the campaign detail page's Pause/Resume button used to resume via a bare `PATCH {status:'active'}`, skipping the `next_send_at` backfill that `/start` does (the campaigns-list page's Resume button already called `/start` correctly — brought the detail page in line). Added **backlog smoothing** on resume (`planBacklogSmoothing()` in `lib/campaign-scheduling.ts`): if a paused campaign's overdue backlog is bigger than a normal day can absorb, it's spread across a few days instead of dumped as "due now" (a small backlog is left untouched). Exposed as a 3-way choice via a chevron next to Resume: **Auto** (recommended, spreads only if genuinely needed), **Fast** (today's raw dump-it-all behavior), **Spread over N days** (user-chosen, 1–14).
  - **Capacity transparency** on the running campaign's Schedule & Limits card: three new stats — Mailbox Capacity (live sum of connected accounts' caps), Campaign Limit (Auto value or the manual number), Effective Sending (`min` of the two, plus sent-today/effective-limit).
- **Explicit non-goals, confirmed by the user before building:** no Batch/Continuous/Hybrid sending-mode system, no changes to the Follow-up Priority Auto/Manual system itself (only read its existing weight for the new forecast breakdown), no other core-scheduler changes beyond this pacing fix.
- **CONFIRMED LIVE IN PRODUCTION, same day.** Migration run by user; verified via real data on the live "site2" campaign — two mailboxes correctly paced 3–5 min apart on Railway's actual scheduler (temporarily bumped/reverted a test account's warmup fields to unlock capacity for the test, no lasting change). This is the exact bug pattern from the original report, now fixed and confirmed with real production sends, not just a simulation. Full detail: `[memory] project-campaign-sending.md`.

**Full regression test pass across warmup + campaign engine — DONE 2026-07-10, commit `676efb7`.** User asked for comprehensive real testing of everything built recently (warmup health up/down, bulk sending, pause/resume incl. a "paused 3 days" scenario, sending-window vs daily-limit independence, edit-after-pause, Auto/Manual follow-up ratio) — done via a mix of direct function-level tests and a real end-to-end HTTP test against the live production site (isolated throwaway test campaign, real session via service-role sign-in, cleaned up after). **Result: every actual product behavior checked out correct — zero real logic bugs found.** One real UX/perf bug WAS found and fixed along the way (see below), reported by the user mid-test from separate direct experience with the UI, not from the automated test suite itself.
  - Warmup health score: confirmed it genuinely rises with clean signals and falls with spam/bounce (not a ratchet), pause triggers at the right thresholds including the low-volume absolute-count protection, send caps throttle correctly with health, recovery requires both 48h wait AND clean signals.
  - Bulk sending: confirmed real leads distribute across multiple mailboxes with correct per-account pacing on the live scheduler.
  - Pause/resume incl. the "paused 1 day, resume 3 days later" scenario: confirmed resume correctly reactivates a campaign with a genuinely overdue backlog; confirmed a SMALL backlog (fits within a day's capacity) is correctly left as immediately-due rather than artificially delayed — this is by design (see `planBacklogSmoothing` doc comment), not a bug.
  - Sending window (from_hour/to_hour/active_days/timezone): confirmed it's checked as a hard, unconditional gate before any capacity/daily-limit logic runs — raising the daily limit or switching Auto/Manual can never cause a send outside configured hours.
  - Edit-after-pause: confirmed add/edit/delete steps and Schedule & Limits (daily limit mode, window, delay) all work correctly while paused, and are correctly REJECTED (409) while active.
  - Auto/Manual follow-up ratio: confirmed Auto mode's weight correctly scales with backlog load (40/65/90% at light/medium/heavy load), Manual mode uses the exact stored value clamped 0–100, and capacity allocation always lets leftover flow to new leads (a 100%-weight "Strict" setup never fully starves new leads unless follow-up demand actually fills all of today's capacity).
  - **Real bug found + fixed (UX/performance, reported directly by user, not by the test suite):** editing steps (add/edit/delete/reorder) on a paused campaign felt slow/hanging. Root cause: the resync logic that keeps every enrolled lead's position correct after a step change updated leads one at a time with sequential awaited database calls — on a campaign with hundreds of leads this took 10+ seconds with the Save button just going quietly disabled, no progress indication. Fixed: parallelized with bounded concurrency (measured on a real 300-lead throwaway test campaign: resync dropped from 3.7s→1.6s, a step delete+resync from 13.2s→6.6s, correctness unchanged — verified all 300 leads still ended up correctly repointed). Also added visible "Saving…/Adding…/Removing…/Reordering steps…" feedback so a save that does take a few seconds no longer reads as broken.
  - **Two more real bugs found + fixed from direct user testing (commit `e10e5a6`):** (1) the "account already connected elsewhere" error toast auto-dismissed after 4s with no way to re-read it, and — found while fixing this — the toast's success/error COLOR was being guessed from substrings in the message text, which showed that exact error in green/success color (message contains the word "connected") and showed "credentials refreshed" success in red/error color; fixed with an explicit `{message, type}` toast state, a manual close (×) button, and 9s for errors vs 4s for success. (2) User asked why `Info@byterisellc.com` keeps landing in spam despite SPF being set — not a code bug: DKIM/DMARC are both `unknown` (Titan's real selector isn't a common one the checker knows), and SPF alone is weak to Gmail-class filters without DKIM+DMARC alignment; also confirmed the app's spam-detection only covers internal warmup pings, never real campaign sends (no seed-inbox access — that's the unbuilt Phase 3). No code change — byterisellc.com DNS stays untouched per the standing "don't touch, it's pending" instruction.
  - **Fast-follow-up testing without a global timing flip:** user asked to speed up follow-ups to test "one time." Deliberately did NOT flip the global `DELAY_UNIT_MS` (would've sped up every other active campaign too, not just the test one) — instead directly fast-forwarded the test campaign's ("site2") 5 active leads' `next_send_at` to now, verified both connected accounts had fresh daily capacity to actually send them for real. Full detail: `[memory] project-campaign-sending.md`.

- **⚙️ `TEST_MODE_FAST_FOLLOWUPS` — real feature, not a one-off hack, CONFIRMED LIVE in production 2026-07-10, commit `042b403`.** Requested by user as a proper, permanent, easy-to-toggle way to test follow-up sequences in minutes instead of real days, WITHOUT touching pacing/daily-limits/warmup/scheduler/mailbox-assignment and WITHOUT affecting any existing or currently-running campaign.
  - **How it works:** every campaign has its own `campaigns.step_delay_unit_ms` column (migration `20260710_step_delay_unit.sql`, default `86400000` = 24h — every campaign that existed before this feature, or created while the flag is off, keeps real days forever). New campaigns get stamped with this value ONCE, permanently, at creation time (`POST /api/campaigns`) — reading `NEW_CAMPAIGN_STEP_DELAY_UNIT_MS` in `lib/campaign-scheduling.ts`, which is `60000` (1 real minute) when the flag is on, `86400000` when off. Every place that turns a step's `delay_days` into a real wait time (the email-sending worker's two follow-up-scheduling branches in `instrumentation.ts`, the campaign start route's resume backfill, and `deleteStepAndResync`'s next-step handoff in `lib/campaign-scheduling.ts`) reads THAT campaign's own stored column — never a global constant directly — so flipping the flag can only ever affect campaigns created after the flip.
  - **⚠️ HOW TO REVERT ("switch back to production") — READ THIS IF THE USER ASKS, EVEN MONTHS LATER:** open `lib/campaign-scheduling.ts`, find `export const TEST_MODE_FAST_FOLLOWUPS = true;` (has a large explanatory comment block directly above it), change `true` to `false`, commit, push (Railway auto-deploys). That is the ENTIRE revert — nothing else needs to change, no other file, no data migration, no cleanup. Campaigns already created while testing keep their fast per-minute timing forever (by design, per the user's explicit requirement) — reverting the flag does NOT retroactively change them. If the user wants a SPECIFIC already-created test campaign to go back to real-day timing too, that requires manually updating that one campaign's `step_delay_unit_ms` row to `86400000` — not something the flag controls.
  - **Verified live end-to-end on the deployed production site** (`https://leadsgenie.site`), not just locally: migration confirmed run (existing campaigns' `step_delay_unit_ms` = 86400000 across a random sample + the real active "site2" campaign specifically); created a brand-new real campaign via the live API while the flag was on — confirmed it was stamped `step_delay_unit_ms=60000`; launched it, let a real send fire, and confirmed the scheduler computed the next follow-up's `next_send_at` only **1.06 minutes** after the send (delay_days=1 with a 1-minute unit = ~60s + small jitter) — not ~24 hours; re-confirmed "site2" was still untouched at 86400000 after the whole run. (First verification attempt failed harmlessly due to a deploy-ordering mistake — ran the live test before pushing the code — re-ran after the correct push+deploy and it passed clean.)
  - **Explicitly out of scope, confirmed unaffected:** pacing (`min_delay_secs`/`max_delay_secs`), daily limits, warmup health/caps, the scheduler's capacity/priority allocation, mailbox assignment/failover. `planBacklogSmoothing()` (resume backlog spreading) also deliberately still uses the real 24h `DELAY_UNIT_MS` always, regardless of this flag — spreading an overdue resume backlog across "days" should mean real calendar days even for a fast-test campaign, a separate concern from step-to-step follow-up delay.
  - **Fixed: false "Authentication failed" on IMAP/SMTP account connect — same day, commit `dd32e5f`.** User tried connecting `Ashley@byterisellc.com` via Titan IMAP/SMTP, got "check your username and password" despite confident-correct credentials. Root cause: the SMTP/IMAP auth code trimmed the username everywhere but never the password — a masked password field makes a copy-pasted leading/trailing space invisible, and it silently breaks auth. Gmail app passwords already handled this correctly (spaces stripped). Fixed at the actual auth call sites (`lib/mailer.ts`, `lib/imap-reader.ts`, both warmup-engage IMAP connections in `instrumentation.ts`) so it covers anything already stored too, plus trimmed on both save paths as defense in depth. No account had actually saved yet (bad-credential accounts are auto-deleted on test failure), so nothing needed backfilling — just retry connecting once deployed.
  - **"⏩ Skip to next day" button — added same day, commit `6284c62`, CONFIRMED LIVE.** A button on the campaign detail page (test-unit campaigns only, shown next to Pause/Resume) that makes every lead currently waiting on a follow-up immediately due — click once per "day" to walk a multi-step sequence forward without waiting even the 1-minute test delay between clicks. New route `POST /api/campaigns/[id]/advance-day`, gated with a hard 403 if the campaign isn't a test-unit campaign (a real production campaign can NEVER have its leads advanced this way, no override) and a 400 if the campaign isn't active yet. Doesn't bypass any sending logic — just sets `next_send_at = now()`, the same field the real scheduler already reads; the real scheduler/pacing/capacity/health/mailbox-assignment logic does everything else exactly as normal. **Verified live end-to-end**: a real 3-step test campaign completed its entire sequence via exactly 2 button clicks, with a genuine send confirmed at every step; the 403 safety gate was confirmed by calling the route against the real "site2" campaign and getting rejected; "site2" was re-confirmed untouched after the whole run. **Superseded 2026-07-11, see below — this paragraph describes the ORIGINAL gate, since replaced.**

**2026-07-11 — `TEST_MODE_FAST_FOLLOWUPS` retired, `is_test_campaign` flag added, reply-subject fix, plus two unrelated real bugs found and fixed.** Live user testing session against the real `test1start` campaign surfaced several things:
  - **Retired the "1 day = 1 minute" global test flag.** User's reasoning (agreed): now that the "Skip to Next Day" button exists, compressing real time is redundant and risks someone forgetting to flip the flag back before a real launch — better to keep every campaign, test or production, on real day-based delays always, and make the button the ONLY acceleration mechanism, opt-in per campaign. `TEST_MODE_FAST_FOLLOWUPS` set to `false` (kept in code, not deleted — same "campaign's own stamped column, never a live global read" design as before, costs nothing to leave off).
  - **New `campaigns.is_test_campaign` boolean** (migration `20260711_test_campaign_flag.sql`, **pending, user must run it**), settable via a new checkbox on the campaign creation wizard's Review step (off by default). The advance-day route's gate changed from "is `step_delay_unit_ms` the test unit" to "is `is_test_campaign` true" — same safety guarantee (a real campaign can never be advanced), now independent of delay timing. Existing fast-mode campaigns backfilled to `is_test_campaign=true` in the same migration so they keep the button they already had.
  - **Confirmed, no change needed:** one button click already only advances whichever single step a lead is currently waiting on (not multiple steps at once) — verified against the user's own worked example. The "auto-cascade through all 3 steps in minutes" behavior they saw was purely a side effect of the now-retired 1-minute-per-day compression running on its own scheduler ticks in the background, not the button skipping steps.
  - **Real bug fixed: reply-thread follow-ups never got a "Re: " subject prefix.** `thread_mode: 'reply'` steps already correctly reused step 0's exact subject (by design), but sent it completely unprefixed — so a 3-email thread read as the identical subject three times instead of a natural "Subject" → "Re: Subject" → "Re: Subject" mail-client reply chain. Fixed in `instrumentation.ts`'s email-sending worker (`withReplyPrefix()` helper, guards against double-prefixing on step 3 if step 0's own subject already started with "Re:"). `new_thread`-mode steps were already correct (use each step's own subject/template) — untouched.
  - **Real bug found (not yet fixed, flagged to user, awaiting their choice): `{{topic}}` merge variable silently renders blank.** `replaceVars()` in `lib/mailer.ts` only supports `first_name`/`last_name`/`company`/`title`/`email`/`website` — any other `{{...}}` tag (including `{{topic}}`, present in one of the built-in templates) gets silently stripped by the catch-all "strip unknown variables" regex, producing a truncated subject like `"Loved your post on "` with nothing after it. Confirmed via live `sent_emails` data during this session, not simulated.
  - **Explained, not a bug:** the "same-minute" send timestamps and "only 2 leads processing while 3 sit pending" both traced to correct behavior — different mailboxes pace independently (so two sends from two different accounts can land seconds apart), and with only 2 connected mailboxes + a 2–4 min configured delay + follow-ups getting 90% priority, new leads naturally trickle out one mailbox-slot at a time rather than all at once (by design, avoids an unnatural "blast" pattern).
  - **Also this session, unrelated to campaign sending:** (1) admin panel's Edit User "Cannot remove the last admin" error was firing on ANY non-admin user's credit edit, not just actual admin-removal attempts — `PATCH /api/admin/users/[id]` now only runs the last-admin check if the target user is currently an admin (root cause: the edit modal always sent `is_admin` in the payload regardless of whether that toggle was touched). (2) the campaign creation wizard's "remaining today"/"X/50 left" account-capacity numbers were computed from each account's raw configured `daily_limit`, completely ignoring the warmup ramp — so a new campaign's forecast promised far more send volume than the warmup-throttled reality would actually allow. Fixed in `app/api/email-accounts/route.ts` (new `effective_daily_limit`, warmup-aware `remaining_today`), reflected through the wizard's account list and "Today" capacity breakdown.
  - **Real bug found + fixed: wizard's step-delay dropdown could silently save 0 while displaying "1 day."** `app/dashboard/campaigns/new/page.tsx`'s follow-up delay `<select>` only rendered options `[1,2,3,5,10,15]` — no "0" option. Since a `<select>`'s bound value with no matching `<option>` falls back to displaying the FIRST option (browser default behavior for a controlled component with an out-of-range value), any step whose `delay` was actually `0` under the hood showed "1 day" on screen while genuinely saving as 0 — user sees "1 day," has no reason to touch it, campaign launches with that step firing same-day instead of after 1 day. Confirmed live on a real campaign ("ftesting1"): its step 2 had `delay_days: 0` in the DB despite the user reporting they'd explicitly selected 1 day for every step. Fixed: added `0` ("Same day") as an explicit option, so the dropdown can never lie about the underlying value again. Root cause of HOW delay became 0 in the first place wasn't fully pinned down (every code path that creates/edits a step either defaults to 0 correctly for step 1 or explicitly sets 3+ for added follow-ups) — most likely the stale-localStorage-draft auto-restore (`campaign_draft`) racing a mid-edit `beforeunload` save, but not confirmed with certainty. Directly corrected the live campaign's step 2 to `delay_days: 1` (its 5 leads had already passed that step, so this only affects any leads added to the list later, not retroactive).
  - **Also explained, not a bug:** a manual `daily_limit` set LOWER than what's already sent today (e.g. limit=4, already sent 5) correctly blocks all further sends for the rest of the UTC day, even after Skip-to-Next-Day makes leads due — the daily cap is a hard ceiling checked before capacity allocation, working as designed, just non-obvious when a user lowers the limit after some sends already went out.
  - **Follow-up jitter redesigned per explicit user spec (2026-07-11): "Same day" steps get 30–90 min one-sided wait; "1 day+" steps get ±30–60 min around the same clock time — one shared formula for every campaign, no test/production split.** Previously `jitterMs()` was a single symmetric ±60-90 min formula applied identically regardless of whether the NEXT step was same-day or multi-day — for a same-day (delay_days=0) step, that meant a coin-flip 50% chance of a NEGATIVE jitter, i.e. sometimes firing with **zero wait at all** right after the previous email. `jitterMs()` now takes a `sameDay` boolean: same-day → one-sided 30-90 min (`lib/campaign-scheduling.ts`), multi-day → symmetric ±30-60 min (narrowed from ±60-90 per this spec). **Also found and fixed a real, separate, more serious bug while wiring this up**: 3 live call sites (`instrumentation.ts` main send-worker success path, its idempotency-retry branch, and `deleteStepAndResync` in `lib/campaign-scheduling.ts`) all computed the next step's delay as `(nextStepData.delay_days || 1) * unitMs` — the `||` fallback silently promoted a REAL, intentionally-saved `delay_days: 0` up to `1`, meaning even a correctly-saved "Same day" step would have waited a full day at actual send time regardless of what the UI showed. Changed to `?? 1` at all 3 sites so a genuine 0 passes through as 0. Verified numerically via a standalone `tsx` script (deleted after, not committed): 5000 samples each confirmed same-day jitter is 30-90 min with zero negatives, multi-day jitter magnitude is 30-60 min with a ~50/50 sign split, and legacy fast-mode campaigns (`step_delay_unit_ms=60000`, from before `TEST_MODE_FAST_FOLLOWUPS` was retired) still scale proportionally to a few seconds without ever going negative.

**"Already warmed up" connect-time option — DONE 2026-07-11, migration pending.** User asked what happens when connecting a mailbox that already has real sending history elsewhere and doesn't want the 14-day ramp. Existing escape hatch (toggle warmup off) had a real gap: it freezes `health_score` forever, since the periodic warmup cycle that recomputes health only runs for `warmup_enabled=true` accounts. User asked for a proper fix, not the workaround.
  - **Design:** new `email_accounts.already_warmed_up` boolean (migration `20260712_already_warmed_up.sql`, **NOT YET RUN**). Deliberately independent of `warmup_enabled` — an already-warmed account STAYS `warmup_enabled=true` (keeps getting health recomputed every 6h from real bounce/auth-error signals and warmup-ping engagement, stays eligible for auto-pause/recovery), while its `campaignDailyCap()` (`lib/warmup-health.ts`) result short-circuits straight to the mature-cap formula instead of the 14-day ramp formula. Starts at `health_score=85` instead of the neutral 50 baseline, `status='active'` not `'warming'`.
  - **`campaignDailyCap()` signature changed**: took a single pre-computed `warmupComplete: boolean` before; now takes `warmupEnabled: boolean, alreadyWarmedUp?: boolean` and computes `warmupComplete = !warmupEnabled || alreadyWarmedUp` internally — every one of its 9 call sites across the codebase (`instrumentation.ts` ×2, `lib/campaign-scheduling.ts`, `app/api/warmup/route.ts`, `app/api/admin/warmup/route.ts`, `app/api/email-accounts/route.ts`, `app/api/campaigns/[id]/start/route.ts`, `app/dashboard/campaigns/new/page.tsx`, `app/dashboard/campaigns/[id]/page.tsx`) updated to pass the two raw fields instead of computing the OR themselves — centralizes the "what counts as ramp-complete" logic in one place. Existing accounts (`already_warmed_up` defaults `false`) are byte-for-byte unaffected — identical output to before.
  - **Connect-flow UI, both paths, per explicit requirement:** a checkbox ("This mailbox is already warmed up") on the connect modal's first screen (`app/dashboard/email-accounts/page.tsx`), applies regardless of which method is picked next.
    - IMAP/SMTP/Gmail-App-Password: sent as `already_warmed_up` in the `POST /api/email-accounts` body, read directly in the route.
    - Gmail OAuth: no form step exists mid-redirect, so the checkbox value is encoded into Google's `state` param as `"${userId}:${flag}"` (`app/api/email-accounts/oauth/google/route.ts`) and decoded in the callback (`.../callback/route.ts`) — only applied on a genuinely NEW account insert, never on a re-auth/token-refresh of an existing one (that would incorrectly reset an already-progressing account's warmup state).
  - **UI display:** Warmup dashboard (`app/dashboard/warmup/page.tsx`) Accounts tab shows "✓ Already warmed up — Ramp skipped, full capacity, score still live" in place of the ramp-progress bar; Settings tab shows a small "✓ already warmed up" pill next to the email. `days_to_warmed` calc in `app/api/warmup/route.ts` also fixed to return 0 immediately for these accounts (was computing a misleading "14 days until warmed" for an account that's already at full cap).
  - **Verified:** `npx tsc --noEmit` clean, full `npm run build` clean.
  - **Before this is live:** user must run `supabase/migrations/20260712_already_warmed_up.sql` in the Supabase SQL Editor — `ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS already_warmed_up BOOLEAN NOT NULL DEFAULT false;`. Until then, connecting ANY new account (IMAP/SMTP/Gmail-App/Gmail-OAuth) will fail, since every insert path now writes this column.

**Warmup roadmap:**
- [x] Phase 1 — dynamic health score, adaptive caps, pause/recovery, one-mailbox-one-identity, rate limiting. DONE 2026-07-05, migrated, verified live.
- [x] Health score sample-size fix — DONE 2026-07-09, commit `f2f136f`. Score no longer front-loads trust on 1-3 emails sent (was hitting 72-90); now ramps gradually, matching Instantly's documented "low score in early days is normal" behavior. Full detail: `[memory] project-warmup-overhaul.md`.
- [ ] Phase 2 — bigger cross-user pool, AI-generated warmup conversations, timezone/language/industry matching, custom warmup profiles (Conservative/Balanced/Aggressive), holiday awareness, auto-restart after inactivity. **NOT STARTED — only begin when explicitly told to.**
- [ ] Phase 3 — seed inbox monitoring, blacklist checks, inbox-placement prediction, reputation benchmarking, automatic issue diagnosis, AI recommendations. **NOT STARTED**, needs a cost/infra decision first (no free option for seed inboxes). Explicitly rejected: multi-device/IP simulation.

**A note on testing now that timing is real:** with `DELAY_UNIT_MS` at 24h, a multi-step campaign's follow-ups genuinely take days to test end-to-end. For quick verification of steps beyond the first, use the "retry" action on a specific lead (or set that step's delay to 1 day and be patient) rather than waiting on a full multi-day sequence.

---

## 1. Tech Stack

| Item | Value |
|---|---|
| Framework | Next.js 15.2.1 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 3 (JIT) |
| Animation | Framer Motion (`motion.div`, `whileInView`) |
| Font | Montserrat (forced via `globals.css` `!important`) |
| AI | Groq SDK — model `llama-3.3-70b-versatile` |
| Avatars | `https://i.pravatar.cc/150?img=N` (real photos) |
| Deployment | Vercel |
| Git remote | `https://github.com/Sallu3211/leadgenie.git` |
| Auto-push | `.git/hooks/post-commit` runs `git push origin HEAD` |

---

## 2. Project Structure

```
app/
├── page.tsx              ← Homepage (MAIN — 'use client', 1000+ lines)
├── globals.css           ← Global styles, gradients, animations
├── layout.tsx            ← Root layout, Montserrat font
├── pricing/page.tsx
├── templates/page.tsx
├── about/page.tsx
├── contact/page.tsx
├── blog/page.tsx
├── blog/[slug]/page.tsx
├── dashboard/page.tsx
├── login/page.tsx
├── signup/page.tsx
├── help/page.tsx
├── privacy/page.tsx
├── terms/page.tsx
├── cookies/page.tsx
├── gdpr/page.tsx
├── anti-spam/page.tsx
└── use-cases/
    ├── agency/page.tsx
    ├── b2b-sales/page.tsx
    ├── consulting/page.tsx
    ├── ecommerce/page.tsx
    ├── recruitment/page.tsx
    └── saas/page.tsx

components/
├── Navbar.tsx
└── Footer.tsx

api/
└── generate-email/route.ts   ← Groq AI endpoint
```

---

## 3. Design System

### Colors (Tailwind + custom)
| Role | Value | Usage |
|---|---|---|
| Primary blue | `#3b82f6` / `blue-500` | Stats, accents, borders |
| Deep blue | `#1d4ed8` / `blue-700` | Hero gradient |
| Darkest blue | `#1a3480` | Hero gradient start |
| Green accent | `#10b981` / `emerald-500` | Reply rate stats |
| Purple accent | `#8b5cf6` / `violet-500` | ROI / multiplier stats |
| Amber accent | `#f59e0b` / `amber-500` | Ratings / time stats |
| Emerald accent | `#059669` | Cost/savings stats |
| Gray text | `text-gray-900` / `text-gray-500` | Body copy |
| Logo gray | `text-gray-400` | Trust logo icons (no brand colors) |
| Card border | `border-blue-200` | Feature card outlines |

### Gradients (defined in `globals.css`)
| Class | Gradient | Used on |
|---|---|---|
| `.hero-gradient` | `160deg, #1a3480 → #1d4ed8 → #2563eb → #3b82f6 → #93c5fd` | Hero section, use-case heroes |
| `.cta-gradient` | `150deg, #1e3a8a → #1d4ed8 → #2563eb → #3b82f6` | CTA bottom section |
| `.teal-gradient` | `135deg, #0e7490 → #0284c7 → #1d4ed8` | (available, not currently used) |
| `.purple-gradient` | `135deg, #5b21b6 → #4338ca → #1d4ed8` | (available, not currently used) |

### Typography
- Font: Montserrat, forced globally via `html, body, * { font-family: ...; !important }`
- H1 hero: `text-4xl sm:text-5xl lg:text-[60px] font-extrabold tracking-tight`
- Section H2: `text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1]`
- Body: `text-base sm:text-lg text-gray-500 leading-relaxed`
- Stat numbers: `text-2xl sm:text-3xl font-extrabold tracking-tight`

### Container
```css
.container { width: min(1160px, calc(100% - 3rem)); margin: 0 auto; }
```

### Animations (`globals.css`)
| Class | Animation | Speed | Direction |
|---|---|---|---|
| `.animate-marquee` | `marquee-scroll` | 55s | left (forward) |
| `.animate-marquee-r` | `marquee-scroll` | 65s | right (reverse) |
| `.animate-testimonials` | `marquee-scroll` | 110s | left (unused) |
| `.animate-testimonials-r` | `marquee-scroll` | 130s | right (unused) |
| `.scroll-hide` | hide scrollbar | — | both axes |

**Hover-pause**: `.animate-marquee:hover, .animate-marquee-r:hover { animation-play-state: paused; }`  
**Keyframe**: `from { translateX(0) } to { translateX(-50%) }` — requires 4× duplicate items for seamless loop.

---

## 4. Shared Data (change here → update all pages)

### Avatars — `AVATAR_PHOTOS[]` in `page.tsx`
All real photos via `https://i.pravatar.cc/150?img=N`

| Index | img# | Name used |
|---|---|---|
| 0 | 47 | Mike Ellis |
| 1 | 68 | Briken Bufi |
| 2 | 48 | Tom Brady |
| 3 | 3 | Alex Baldovin |
| 4 | 44 | Priya Nair |
| 5 | 12 | David Park |
| 6 | 5 | Sophie Laurent |
| 7 | 65 | Ryan Chen |
| 8 | 32 | James Walker |

**Rule**: Use `<PersonAvatar idx={N} size={px} />` for ALL person images. Never use initials or SVG faces.  
**Use-case pages**: Use inline `<img src="https://i.pravatar.cc/150?img=N" style={{ borderRadius:'50%', objectFit:'cover' }} />`.

### Brand Logos — `BRANDS` (single array)
**Style**: Mixed icon-only and text/icon+text, gray (`text-gray-400`), icons `w-8 h-8`, text `text-[22px] font-semibold tracking-tight`, no box/border, spacing `px-9 py-2`. Single row scrolls left (55s).

**Type**: `{ name: string; icon?: ReactNode; label?: string }` — icon only, label only, or both side by side.

| Logo | Renders as |
|---|---|
| Google | text: "Google" |
| Microsoft | icon: 4 squares |
| Slack | icon: hash grid |
| Instagram | icon: camera |
| Facebook | icon: f |
| aws | text: "aws" |
| Cloudflare | icon: cloud + text: "Cloudflare" |
| LinkedIn | icon: in |
| HubSpot | text: "HubSpot" |
| Notion | icon: N block |
| stripe | text: "stripe" |
| Zapier | text: "Zapier" |
| apollo | text: "apollo" |

**Marquee**: Single row only, 4× repetitions, `animate-marquee` (55s left).

### Testimonials — `testimonials[]`
9 cards. Displayed as single horizontal mouse-scroll row (overflow-x-auto, scroll-hide). Full-width with `maskFade` gradient on edges.

| Name | Role | Company | Avatar Idx |
|---|---|---|---|
| Mike Ellis | Co-Founder, Kale Acquisition | Kale | 0 |
| Briken Bufi | CEO, Aella Creative Force | Aella | 1 |
| Alex Baldovin | CEO, Authbound | Authbound | 3 |
| David Park | Head of Growth, Ripple Labs | Ripple | 5 |
| Sophie Laurent | Founder, Prolific Agency | Prolific | 6 |
| Ryan Chen | VP Sales, Momentum Capital | Momentum | 7 |
| Tom Brady | VP Sales, NextGenSoft | NextGenSoft | 2 |
| Priya Nair | Growth Lead, Launchify | Launchify | 4 |
| James Walker | Sales Director, GrowStack | GrowStack | 8 |

**Card style**: `w-[420px] bg-white rounded-3xl p-8 border border-gray-100 shadow-lg hover:shadow-xl`, quote mark SVG, 5 stars, base text, 50px avatar, company pill (blue).

### Homepage Stats (4 boxes, horizontal icon + number)
| Value | Label | Sub | Color | BG |
|---|---|---|---|---|
| 8,500+ | Active Users | Sales teams & agencies | `#3b82f6` | `bg-blue-50` |
| 42M+ | Emails Delivered | 97%+ inbox placement | `#6366f1` | `bg-indigo-50` |
| 76% | Avg Open Rate | vs 21% industry average | `#10b981` | `bg-emerald-50` |
| 4.9/5 | G2 Rating | From 1,200+ reviews | `#f59e0b` | `bg-amber-50` |

---

## 5. Homepage Sections (`app/page.tsx`)

### Section Order
1. **Navbar** (component)
2. **Hero** — blue gradient, H1, tagline, subtext, AI search bar
3. **Trusted By** — 2-row auto-scroll logo marquee
4. **Stats** — 4-col horizontal icon+number bar
5. **Feature 1** — Unlimited Sending Accounts (text LEFT, card RIGHT)
6. **Feature 2** — Email Warmup (card LEFT, text RIGHT)
7. **Feature 3** — Campaign Builder (text LEFT, card RIGHT)
8. **Feature 4** — Unibox (card LEFT, text RIGHT)
9. **Feature 5** — Analytics (text LEFT, card RIGHT)
10. **AI Workflows** — 3 workflow trigger cards
11. **Testimonials** — full-width mouse-scroll row
12. **CTA** — dark blue gradient, final signup push
13. **Footer** (component)

### Feature Card Rules (sections 1, 3, 4 specifically)
- **NO colored gradient outer background** — removed dark blue/purple wrappers
- **Border**: `border border-blue-200` (subtle blue outline)
- **Background**: `bg-white`
- **Shadow**: `shadow-sm`
- Section 2 (Warmup) and Section 5 (Analytics): already plain white, no outer wrapper to remove

### Feature Section 1 — Unlimited Sending Accounts
- `bg-white py-24`, layout: `flex-row` (text left, card right)
- Card: `bg-white rounded-2xl overflow-hidden shadow-sm border border-blue-200`
- Shows 5 email accounts with health bars, status badges, send counts

### Feature Section 2 — Email Warmup
- `bg-gray-50 py-24`, layout: `flex-row-reverse` (card left, text right)
- Card: `bg-white rounded-2xl shadow-2xl ring-1 ring-black/8`
- Shows warmup dashboard: inbox rate 97.3%, spam 0.4%, health 98/100, 30-day bar chart

### Feature Section 3 — Campaign Builder
- `bg-white py-24`, layout: `flex-row` (text left, card right)
- Card: `bg-white rounded-2xl shadow-sm border border-blue-200 p-5 sm:p-6`
- Two inner sub-cards (`bg-gray-50 rounded-2xl p-4 border border-gray-100`): sequence steps + AI preview

### Feature Section 4 — Unibox
- `bg-gray-50 py-24`, layout: `flex-row-reverse` (card left, text right)
- Card: `bg-white rounded-2xl overflow-hidden shadow-sm border border-blue-200`
- Shows unified inbox with 5 sample replies, filter tabs, tags

### Feature Section 5 — Analytics
- `bg-white py-24`, layout: `flex-row` (text left, card right)
- Card: `bg-white rounded-2xl shadow-2xl ring-1 ring-black/8 overflow-hidden border border-gray-100`
- Shows campaign stats grid + line/bar charts

### AI Workflows Section
- `bg-gray-50 py-24`, 3-column grid of trigger cards
- **NO top colored bar** (removed gradient accent bar from top of each card)
- Icon boxes: border-only (`border-2 border-{color}-200`), no fill
- 3 cards: Lead Opens → Follow-up | Lead Replies → Tag | Meeting Booked → Stop sequence

### Testimonials Section
- `bg-white py-24`
- Heading centered inside `.container`
- Scroll strip: full-width (outside container width), `maskFade` gradient edges
- `overflow-x-auto scroll-hide`, cursor grab
- Padding inside: `1rem 8vw 2rem`
- Scroll hint below: ← arrows

### Hero AI Search Bar
- White rounded bar, Groq API `/api/generate-email`
- Shows email draft result or answer
- State: `query`, `loading`, `result`, `error`

---

## 6. Use-Case Pages (6 pages — server components, no 'use client')

All share the same structure:
1. Hero (`.hero-gradient py-20 text-center`)
2. Stats bar (4 cols, horizontal icon+number)
3. Feature grid (3-col, 6 cards with emoji icons)
4. Testimonial quote block (`bg-gray-50 py-20`)
5. CTA section

### Stats Design (ALL 6 pages — same pattern)
```
grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100
  each cell: flex items-center gap-4 py-8 px-6 hover:bg-gray-50/60
    icon box: w-11 h-11 rounded-2xl, style={{ background:'#eff6ff', color:'#3b82f6' }}
    number: text-2xl font-extrabold, style={{ color: accent }}
    label: text-xs font-semibold text-gray-500 mt-1
```

### Stats Data Per Page
| Page | Stat 1 | Stat 2 | Stat 3 | Stat 4 |
|---|---|---|---|---|
| **Agency** | 500+ Agencies (blue/users) | 20%+ Reply Rate (green/trend) | Unlimited Workspaces (purple/building) | 4.9/5 Rating (amber/star) |
| **B2B Sales** | 47 Meetings/Mo (blue/calendar) | 18% Reply Rate (green/trend) | 3× Faster (purple/rocket) | $0 Extra Cost (emerald/dollar) |
| **Consulting** | 1,200+ Firms (blue/building) | 28% Discovery Rate (green/trend) | 5× More Leads (purple/rocket) | 2 hrs Saved (amber/clock) |
| **Ecommerce** | 3,000+ Brands (blue/building) | 22% Reply Rate (green/trend) | 10× ROI (purple/rocket) | 48h Setup (amber/clock) |
| **Recruitment** | 3× Candidates (blue/users) | 25% Response Rate (green/trend) | 50% Faster (purple/clock) | 10× ROI (amber/rocket) |
| **SaaS** | 2,000+ Companies (blue/building) | 61% Open Rate (green/mail) | 10× ROI (purple/rocket) | 14 days First Meetings (amber/calendar) |

### Testimonial Quote Per Page
| Page | Quote person | Photo | Title |
|---|---|---|---|
| Agency | Mike Ellis | img=47 | Co-Founder, Kale Acquisition |
| B2B Sales | Briken Bufi | img=68 | CEO, Aella Creative Force |
| Consulting | David Park | img=12 | Head of Growth, Ripple Labs |
| Ecommerce | Tom Kim | img=44 | Head of Wholesale, Brightleaf Goods |
| Recruitment | Sarah Reynolds | img=5 | Head of Talent, Growthbound Recruiting |
| SaaS | Alex Baldovin | img=3 | CEO, Authbound |

---

## 7. Key Components

### Navbar (`components/Navbar.tsx`)
- Logo: "Lead Genie" with sparkle icon
- Nav items: Campaigns, Email Accounts, Warmup, Unibox, Analytics, Deliverability (no Integrations in nav)
- CTA: "Start Free" → `/signup`

### Footer (`components/Footer.tsx`)
- Dark background
- Links: Use Cases, Resources, Company, Legal
- No irrelevant features (no CRM, Automations, API links)

### `SectionBadge` component
- Light mode: `bg-blue-50 border border-blue-100 text-blue-600`
- Dark mode (on gradient sections): `bg-white/15 border border-white/30 text-white/85`

### `PersonAvatar` component
- `<img src={AVATAR_PHOTOS[idx % 9]} style={{ borderRadius:'50%', objectFit:'cover' }} />`
- Default size: 40px. TestimonialCard: 50px.

### `BrandPill` component
- Icon only, no text, gray, large (`[&_svg]:!w-10 [&_svg]:!h-10`)
- No border, no box, just floating icon

### `TestimonialCard` component
- 420px wide, rounded-3xl, shadow-lg
- Quote mark SVG (blue-100), 5 yellow stars, base text, 50px avatar, blue company pill

### `maskFade` constant
```js
{ WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
  maskImage: '...' }
```
Used on: logo marquee rows, testimonial scroll strip.

---

## 8. Rules & Decisions

| Rule | Detail |
|---|---|
| Avatars | Always `pravatar.cc` real photos. Never SVG faces or initials. |
| Logos | Icon-only, gray, no boxes, no text labels, hover-pause on marquee |
| Feature card borders | `border-blue-200` (not gray) on sections 1, 3, 4 |
| No colored card backgrounds | Removed dark blue/purple gradient outer wrappers from cards |
| Workflow card icons | Border-only ring (`border-2 border-{color}-200`), no fill |
| Workflow cards | No top gradient accent bar (removed) |
| Stats style | Horizontal: icon box left + colored number + label right |
| Testimonials | Single row, overflow-x-auto, scroll-hide, maskFade, 420px cards |
| Logo marquee | Single row, 4× repetitions, 55s left-scroll. Mix of icon-only + text-only + icon+text |
| AI | Groq only (free tier). Never paid APIs. |
| Nav links | Must point to real pages. Never `/signup` redirect for nav items. |
| Commit syntax | `git commit -m "title\`n\`nCo-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"` |
| Auto-push | post-commit hook → no manual `git push` needed |
| Font | Montserrat forced globally, no other fonts |
| Layout | 2-column alternating for feature sections (text+card flip each section) |

---

## 9. Dashboard Rules & Architecture

### Credits System
- 100 free credits shown in the top header bar (sticky, z-20) on ALL dashboard pages
- Header: `DashboardLayout` in `app/dashboard/layout.tsx` — always renders the credits pill
- Credits pill: green pulse dot + `{remaining} / {total} credits` + progress bar + "Get more →" → `/pricing`
- When credits run out, prompt upgrade

### Email Accounts (`app/dashboard/email-accounts/page.tsx`)
- **4 connection types**: Gmail OAuth, Gmail App Password, Outlook OAuth, Custom SMTP
- **Each account has its own per-account daily limit** (editable inline in the table)
- Gmail App Password: needs 16-char code, instructions shown in modal
- Accounts listed with: #number, email, type badge, status (active/warming/error), health bar, daily limit (editable), remove button
- Health bar: green ≥80%, amber ≥50%, red <50%

### Email Templates (`app/dashboard/templates/page.tsx`)
- **3 editor tabs**: Edit | Preview | HTML
- **HTML tab**: shows generated HTML (auto-build from body) with copy button + `<iframe>` rendered preview
- **Formatting toolbar** (body field): Bold `<strong>`, Italic `<em>`, Underline `<u>`, Link `<a>`, List `<ul>`, Button `<a>` styled as CTA
- **Unsubscribe block**: always at bottom, editable text, required for compliance. Keep `{{unsubscribe_link}}` variable.
- **Clicking backdrop closes any modal** — all modals use `onClick={e => e.target === e.currentTarget && onClose()}`
- Built-in templates are editable but not deletable (no delete button on `builtIn: true`)

### Campaign Creation (`app/dashboard/campaigns/new/page.tsx`)
- **Step 0 — Details**: Name, Goal (6 options), Sending Accounts selector, Campaign Daily Cap
- **Sending Accounts**: multi-select with "All accounts" toggle. Shows each account email + type + per-account limit. Rotates sends across selected accounts.
- **Daily limit is set at CAMPAIGN level only** — removed from Settings > Sending Defaults
- **Campaign Daily Cap**: optional override over sum of account limits. If left blank, auto = sum of selected account limits.
- **Step 1 — Sequence**: "Pick from template library" button per step → opens template picker modal (shows all templates from `/dashboard/templates`)
- **Template picker modal**: backdrop click closes it; shows template name, category badge, subject preview, first body line
- **Step 3 — Review**: shows account count + total daily limit in summary

### Settings (`app/dashboard/settings/page.tsx`)
- **4 tabs only**: Profile, Sending Defaults, Notifications, Plan & Billing
- **No API Keys tab** (removed — too technical, not needed for MVP)
- **No Team tab** (removed — Pro feature, not useful on free plan)
- **Sending Defaults**: From name, min delay between sends, sending hours, active days, warmup toggle. NO daily limit here — that's per campaign.

### Campaign Sending Logic at Scale — Analysis (2026-07-06, ideas only, NOT implemented)

Full write-up: `[memory] project-campaign-sending.md`. Scenario checked: 6,000 leads / 250 mailboxes / 20–25 sends per mailbox per day / 10 follow-ups over 10 days.

**Correction to this doc**: the "Campaign Daily Cap ... auto = sum of selected account limits if left blank" line under Campaign Creation above is **stale/inaccurate** — verified against `app/dashboard/campaigns/new/page.tsx`, `dailyLimitStr` defaults to a hardcoded `'50'` and nothing auto-fills it from selected accounts. A big-batch launch requires manually raising that number (e.g. ~250 × 22 ≈ 5,500) or it silently throttles to 50/day total.

Verified-true today: same-mailbox-per-lead thread locking for all follow-ups, warmup-aware per-account real caps at send time, reply checked twice (cancels follow-ups reliably), hard bounce = permanent stop + feeds mailbox health, unsubscribe = global lead-level suppression across all campaigns, pause = clean freeze with no lost/duplicated progress, resume = continues from the exact step with overdue sends staggered by minutes (not a blast). No new leads auto-join a running batch unless the list is manually grown.

Gaps vs. competitor tools (Instantly/Smartlead-style): mailbox assignment is random (not cap-aware round robin — self-balances at scale but can overbook individual mailboxes by chance), no auto-failover when a locked-in mailbox goes bad long-term (manual retry-lead exists), no pre-launch send forecast, no per-lead timezone-aware send time, stale paused jobs aren't cancelled (cleanup only, not a correctness bug). Also found: follow-up sends get zero timing jitter today (land within a minute of the same clock time daily — real minor pattern-detection concern), and the shared campaign-wide daily cap gates new-lead AND follow-up sends together, so day-2-onward combined demand can exceed a cap sized only for day-1 new-lead volume.

**2026-07-07 — "Smart Priority Engine" rewrite, finalized design (NOT STARTED, awaiting user "continue" + 1 open decision):** converged on: one engine, one "Priority Strictness" switch (Balanced 90/10 default, Strict 100/0-if-empty advanced); reply/bounce/unsubscribe checked as an eligibility filter on every candidate lead FIRST, not a priority tier in the send sequence; 90/10 split applies to the campaign's total daily capacity as one pool; live cycle-based scheduling (poll every 1-5 min, same pattern the warmup worker already uses) replaces pre-scheduled BullMQ delayed jobs; added `NOT_STARTED` lead state distinct from `ACTIVE`; jitter on follow-up timing included. Resolved: adjustable per campaign via Auto (system computes follow-up weight % live from load) or Manual (user-set 0-100% slider) — collapsed a proposed 3rd "Strict Mode" into Manual-at-100% (same redundancy class as the earlier Continuous/Hybrid fix, caught before building this time). Corrected pipeline order: reply/bounce/unsubscribe eligibility must be a query filter when building the candidate pool (step 1), never a later "enforce stop rules" step — user's draft placed it last twice, corrected both times; this is a compliance matter, not style. Full detail in `[memory] project-campaign-sending.md` under "PROPOSED REWRITE — Smart Priority Engine". Binding constraint: must not disrupt currently-running campaigns, must not touch unrelated modules, must be verified error-free.

**IMPLEMENTED 2026-07-07 ("go ahead"):** confirmed zero active campaigns in production before starting (no live traffic disrupted). New: `lib/campaign-scheduling.ts` (shared window helpers + priority engine pure functions, unit-verified including the exact 6000/250 scenario), a new recurring campaign-scheduler worker in `instrumentation.ts` (every 2 min, same pattern as the warmup worker) that replaced the email-sending worker's old self-chaining/pre-scheduled-delay model, and a "Follow-up Priority" Auto/Manual control (now on both the campaign creation wizard AND the campaign detail page). Caught one gap mid-build not in the original plan: `campaign_leads` needed a new `account_id` column to durably persist the locked mailbox per lead. Migration run successfully by user, verified live.

**First live test, 4 real bugs found and fixed (2026-07-07, commit b3d2abf):** (1) jitter scaling bug — fixed ±30-90 *real* minutes swamped test-mode's 1-minute-per-"day" delays, making follow-ups fire almost immediately instead of waiting; now scales proportionally to the actual delay. (2) cross-cycle stagger overlap — two leads fired 7s apart despite a 60s minimum gap, because each 2-min scheduler cycle reset its stagger to zero with no awareness of the previous cycle's still-pending jobs; capped per-cycle span with a safety buffer. (3) campaign detail page showed "2/2 done" for a lead who replied after 1 of 2 emails — pre-existing display bug (not introduced by the rewrite), now shows real sent count + stop reason. (4) warmup Accounts-tab vs Stats-tab score mismatch (98 vs 81, same account/day) — history only wrote once/day while live score kept climbing all day; now kept in sync every cycle. Full detail incl. what was checked and confirmed NOT a bug (same-mailbox continuity, reply detection, threading, spam) in `[memory] project-campaign-sending.md`.

---

## 10. Pending / Future Items

- [ ] Wire real Supabase data to accounts + templates (currently mock data in campaign wizard)
- [ ] Connect credits to real backend (currently static 100)
- [ ] If adding new feature section: follow 2-col alternating layout, blue-200 border card, no colored background
- [ ] If adding new use-case page: copy structure from existing, use pravatar avatar, horizontal stats with icons

---

## 10. Change Log

| Date | Change |
|---|---|
| 2026-06-06 | Initial plan created |
| 2026-06-06 | Replaced SVG avatars with pravatar.cc real photos across all pages |
| 2026-06-06 | Removed lightning bolt SVG from hero and CTA titles |
| 2026-06-06 | Trust logos changed to bordered pills (then later to icon-only no box) |
| 2026-06-06 | Feature sections changed to 2-column alternating layout |
| 2026-06-06 | Stats bar redesigned to horizontal icon + colored number |
| 2026-06-06 | Testimonials: auto-slider → 2-row marquee → single overflow-x-auto row |
| 2026-06-06 | Updated stats on all 6 use-case pages to match homepage horizontal style |
| 2026-06-06 | Testimonials scroll made full-width with maskFade gradient edges |
| 2026-06-06 | Cards made wider (420px), quote mark added, avatar 50px |
| 2026-06-06 | Logos: replaced companies with Google/Microsoft/Slack/LinkedIn etc., gray, icon-only |
| 2026-06-06 | Logo marquee: changed from 2 rows (opposite scroll) to 1 row; mixed icon+text like reference image |
| 2026-06-06 | Feature cards: removed blue/purple gradient backgrounds, added border-blue-200 |
| 2026-06-06 | Workflow cards: removed top accent bar, changed icon fills to border rings |
| 2026-06-06 | Logo icons enlarged to w-10 h-10, text label removed from BrandPill |

# Final Production Release

## 1. Intake

Agent: Intake
Verdict: pass

Goal:
Finish Activity as a production-ready service: simplify and professionalize the interface, finalize dictionary access rules, replace per-dictionary purchases with a 29 RUB monthly subscription, verify production configuration, and leave a low-maintenance operational handoff.

Superseded on 2026-10-11: the monthly subscription objective was replaced by one-time purchases through Self.PayAnyWay: 149 RUB per dictionary or 379 RUB for the three-dictionary bundle covering `around_us`, `cinema`, and `science`. Existing subscription work must not be published and should be removed during the bounded payment migration task.

User scenario:
An anonymous visitor can start with the classic dictionary immediately, sign in through Telegram for two additional free dictionaries, and subscribe once to unlock all remaining dictionaries. The game should feel concise, deliberate, and professionally designed on mobile and desktop.

Acceptance criteria:
- The setup screen has concise copy and no explanatory banner.
- The favicon lettermark is visually centered.
- Team cards, buttons, board status, and legend use a consistent professional visual system.
- Classic is anonymous; Geography and Society require login; Around Us, Cinema, and Science require one active subscription.
- Subscription price is 29 RUB per calendar month with cancellation in profile.
- Payment, renewal, cancellation, protected assets, and webhook replay are verified before production release.
- Production source matches the final GitHub main commit.

Out of scope:
- A new Health dictionary.
- Replacing Telegram authentication with email authentication.
- A frontend framework or build system.
- Publishing before fiscal receipt handling for a self-employed seller is resolved.

Relevant pipeline:
UI / Frontend + Backend / Auth / Payment, followed by Security and Data Review, Functional QA, Docs Sync, and Release Manager.

## 2. Project Context

Agent: Project Context Reader
Verdict: pass

Files reviewed:
- `AGENTS.md`
- `README.md`
- `PROJECT_KNOWLEDGE_BASE.md`
- `RECENT_PROJECT_CHANGES.md`
- `GAME_SPEC.md`
- `.agent-pipeline/AGENT_PIPELINE.md`
- `.agent-pipeline/QUALITY_GATES.md`
- `index.html`
- `style.css`
- `script.js`
- `src/worker.js`
- `src/lib/*`
- `db/schema.sql`
- `dictionaries.json`
- `wrangler.jsonc`

Confirmed facts:
- GitHub `main` is `6a5de61` at task start and its public static assets match production.
- Production YooKassa variables are present: purchase endpoints reach authentication instead of configuration failure.
- The account vault has no YooKassa record and Telegram ingest is not configured or paired.
- Current safe tooling cannot log in to or control the already authenticated YooKassa browser session.
- The seller is self-employed.
- Current YooKassa documentation requires self-employed sellers to register income and provide receipts through `Мой налог`; the former YooKassa self-employed receipt service is no longer available in 2026.

Existing constraints:
- Do not expose credentials or reuse Telegram history outside the account broker.
- Deploy only from a clean SHA.
- Keep premium dictionary assets protected by the Worker.
- Keep changes compatible with existing saved games and summaries.

Initial risks:
- Monthly billing creates ongoing receipt and support obligations that conflict with a fully maintenance-free closure.
- Recurring payments require explicit user consent, saved payment methods, idempotent renewals, cancellation, and failure handling.
- External YooKassa production settings cannot be verified automatically with current account tooling.

## 3. Plan

Agent: UX Planner / Backend Architect
Verdict: pass

Affected layers:
- Main SPA UI
- Authentication presentation
- Dictionary access model
- Worker payment and protected-asset logic
- D1 schema
- Cloudflare scheduled events
- Legal/static pages
- Documentation and release process

Implementation plan:
1. Complete the independent visual cleanup and favicon fix.
2. Lock the final fiscal receipt strategy for a self-employed seller.
3. Implement one subscription product and subscription lifecycle in D1/Worker.
4. Update profile and dictionary states for anonymous, login-only, and subscriber access.
5. Verify test payments, webhooks, renewals, cancellation, retries, and direct asset protection.
6. Update legal pages and project documentation.
7. Deploy from a clean commit and verify production.

Rollback plan:
- Keep existing purchase tables during the first subscription release.
- Gate the new subscription access through additive schema and API changes.
- Re-deploy the previous verified SHA if the release fails.

## 4. Implementation

Agent: Developer
Verdict: partial — billing decision required

Changed files:
- `db/schema.sql`
- `db/migrations/2026-10-08-subscriptions.sql`
- `dictionaries.json`
- `favicon.svg`
- `index.html`
- `script.js`
- `src/worker.js`
- `style.css`
- `tools/smoke_check.mjs`
- `wrangler.jsonc`

Implementation summary:
- Centered the favicon lettermark.
- Replaced the long setup introduction with one concise sentence and removed both phone-handoff hints.
- Replaced text arrows with consistent inline SVG chevrons.
- Shortened profile and Telegram login copy.
- Reworked core colors, contrast, navigation, sections, buttons, and account card surfaces.
- Replaced dictionary emoji with a coherent line-icon set; removed promotional catalog badges and widened cards for readability.
- Replaced colored team-card side strips with neutral full borders and small team-color markers.
- Replaced board labels such as `Команда 1: кл.0` with compact team/status chips (`Старт`, number, `Финиш`).
- Rebuilt the board legend without emoji and increased its contrast and alignment.
- Escaped team names, player names, and dictionary names/subtitles before inserting them into generated HTML.
- Applied the requested access model: Classic anonymous; Geography and Society after login; Around Us, Cinema, and Science with one subscription.
- Added a 29 RUB monthly subscription UI with explicit recurring consent, status, renewal date, cancel-at-period-end, and resume actions.
- Added D1 tables for subscriptions, consent evidence, payment attempts, and fiscal receipt tasks, plus an explicit remote migration file.
- Added YooKassa initial payment-method saving, verified webhook processing, payment idempotency, monthly scheduled renewals, retry state, and cancellation at period end.
- Added direct Worker protection for all five login/subscription dictionary JSON assets.
- Preserved legacy per-dictionary grants so previously granted access is not revoked.
- Added a fail-closed release gate: checkout and scheduled renewals remain disabled until an authorized NPD operator is integrated and verified; the UI shows a neutral setup state instead of exposing a payment that cannot issue an automatic receipt.

Important decisions:
- Keep Telegram as the authentication mechanism; simplify its presentation instead of adding a second identity system.
- Do not connect the old 149 RUB per-dictionary purchase flow to the requested subscription UI.
- Keep payment provider logic separable from subscription access so an authorized NPD payment/receipt operator can replace YooKassa if necessary.
- Do not publish recurring billing until receipt automation is connected and the live YooKassa autopayment entitlement is verified.

Known risks:
- Fiscal receipt handling is unresolved and blocks production billing.
- Self.PayAnyWay is an authorized FNS operator and publicly supports automatic NPD receipts, but its public documentation does not confirm recurring payments for the self-employed product. Account-side confirmation is required before replacing the YooKassa adapter.
- The owner completed Self.PayAnyWay registration on 2026-10-09 and reached the authenticated operation history. No credentials or MFA data were transferred into the project or chat.
- PayAnyWay support opened ticket `2026100910004046`, confirmed the request is under review, and asked for a fuller project description. A reply was sent on 2026-10-09 describing the single-seller digital subscription, 29 RUB monthly product, cancellation flow, Cloudflare Worker backend, low initial volume, and the requirement that every initial/renewal payment be registered in NPD automatically. No personal data or credentials were included.

## 5. Specialist Review

Agent: Design Adequacy Reviewer / Security and Data Reviewer
Verdict: pending

Findings:

Required fixes:

Optional polish:

Routed back to:

## 6. Functional QA

Agent: Functional QA
Verdict: pass for current UI slice

Checks performed:
- `npx -y node@22 tools/smoke_check.mjs`
- `git diff --check`
- Desktop visual render in Chrome at 1440 px.
- Local D1 schema and subscription migration execution through Wrangler.
- `wrangler deploy --dry-run` with Node 22.
- Local Worker checks for anonymous, logged-in, subscribed, cancel-at-period-end, and resume states.
- Direct asset checks for all protected dictionary JSON files.

Results:
- Smoke check passed: 282 assertions.
- No whitespace errors.
- Setup view renders with the revised visual system and no removed handoff hints.
- Wrangler dry-run passed.
- Anonymous users can play only Classic; logged-in users gain Geography and Society; active subscribers gain all six dictionaries.
- Canceling preserves paid access and disables the next charge; resume re-enables it without an immediate charge.

Regressions found:
- None in the checked UI slice.

Unverified scenarios:
- Mobile interaction walkthrough.
- Authenticated profile and protected dictionary states against a local Worker/D1 runtime.
- Live recurring payment and fiscal receipt flow.

## 7. Docs Sync

Agent: Docs Sync
Verdict: pending

Docs reviewed:

Docs changed:

Docs not changed because:

## 8. Release Check

Agent: Release Manager
Verdict: pending

Diff reviewed:

Commands run:

Manual checks:

Deploy follow-up:

D1 follow-up:

Secret or config follow-up:

Cache follow-up:

Open risks:
- Self-employed receipt issuance for every initial and recurring payment.
- Live YooKassa autopayment enablement and webhook configuration require account-side verification.

Ready to hand back:
No.

## 2026-10-11 supersession result

The unreleased subscription implementation described above has now been removed from the release UI, Worker routes, cron configuration and fresh schema. Its untracked migration was deleted before publication. No subscription migration was applied remotely and no subscription payment was released.

The replacement one-time Self.PayAnyWay implementation, verification evidence and remaining account-side blocker are recorded in `2026-10-11-payanyway-one-time-pack.md`.

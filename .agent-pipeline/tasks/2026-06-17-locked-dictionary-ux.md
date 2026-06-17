# Locked Dictionary UX Cleanup

## 1. Intake

Agent: Intake
Verdict: pass

Goal:
Remove a small approved UX annoyance from the setup screen without changing dictionary access rules or backend behavior.

User scenario:
A player taps a locked dictionary while setting up a game and gets a calm inline explanation instead of a disruptive browser alert.

Acceptance criteria:
- Locked dictionary card clicks no longer use `alert()`.
- Login-locked free dictionaries explain that they are free after Telegram login.
- The existing card CTA to profile login remains available.
- Selecting an available dictionary clears the message.
- Duplicate `ts-back-to-menu-btn` listener is removed.
- No dictionary metadata, Worker auth logic, payment logic, or game rules change.

Out of scope:
- Redesigning the setup screen.
- Changing premium purchase behavior beyond replacing alert feedback in the existing future-premium branch.
- Changing `dictionaries.json`.
- Changing saved game summaries, profile history, D1, or Cloudflare configuration.

Relevant pipeline:
UI / Frontend:
Intake -> Project Context Reader -> UX Planner -> Frontend Developer -> Design Adequacy Reviewer -> Functional QA -> Docs Sync -> Release Manager.

## 2. Project Context

Agent: Project Context Reader
Verdict: pass

Input reviewed:
- `AGENTS.md`
- `.agent-pipeline/AGENT_PIPELINE.md`
- `.agent-pipeline/QUALITY_GATES.md`
- `.agent-pipeline/tasks/2026-06-13-ux-audit-decisions.md`
- `index.html`
- `style.css`
- `script.js`

Confirmed facts:
- The UX decision log lists two approved follow-up candidates relevant to this task: remove duplicate `ts-back-to-menu-btn` listener and improve locked dictionary UX so it does not rely on disruptive `alert()` messages.
- Current catalog has login-locked free dictionaries and no active premium dictionaries.
- `renderDictGrid()` already renders explicit CTA buttons on locked cards.
- `selectLockedDict()` was the source of alert-based locked-card feedback.

Risks:
- The message must not imply that login is required for all dictionaries.
- The current future-premium branch should remain understandable even though no active premium dictionaries exist.

## 3. Plan

Agent: UX Planner
Verdict: pass

Affected files:
- `index.html`
- `style.css`
- `script.js`
- `.agent-pipeline/tasks/2026-06-17-locked-dictionary-ux.md`

Implementation plan:
- Add a small `aria-live` message container under the dictionary grid.
- Add compact styles that match the existing dark UI.
- Add `setDictionaryNotice()` / `clearDictionaryNotice()` helpers.
- Replace locked dictionary `alert()` calls with inline messages.
- Clear the message when dictionaries reload or an available dictionary is selected.
- Remove the duplicate `ts-back-to-menu-btn` listener at init.

Rollback plan:
- Revert only this task's `index.html`, `style.css`, `script.js`, and journal changes if QA finds a regression.

## 4. Implementation

Agent: Frontend Developer
Verdict: pass

Work performed:
- Added `#dict-message` below the dictionary grid with `role="status"` and `aria-live="polite"`.
- Added `.dict-message` variants for normal, warning, and success messages.
- Replaced locked dictionary alerts in `selectLockedDict()` with inline notices.
- Replaced future purchase-flow success/error alerts with inline notices where they relate to dictionary access.
- Cleared dictionary notice on catalog reload and successful dictionary selection.
- Removed duplicate `ts-back-to-menu-btn` event listener so the button no longer has two handlers.

Findings:
- No backend, D1, dictionary metadata, or gameplay state changes were needed.

Next step:
- Run syntax checks, local smoke, and design/functional review.

## 5. Design Adequacy Review

Agent: Design Adequacy Reviewer
Verdict: pass

Findings:
- Inline message is scoped to the dictionary section and does not add another modal or screen.
- Message styling follows the existing compact dark UI and uses the same restrained surface language as dictionary cards.
- `aria-live="polite"` makes the feedback available without interrupting setup.
- No P0/P1/P2 design findings found from code-level review.
- Independent Design + Functional QA reviewer returned `pass`.

Verification gap:
- Pixel-level screenshot QA could not run because Playwright is not installed in this local runtime.

Next step:
- Functional QA.

## 6. Functional QA

Agent: Functional QA
Verdict: pass

Checks performed:
- `node --check script.js`
- `node --check src/worker.js`
- JSON parse for all dictionary JSON files
- static UI assertions for `#dict-message`, `aria-live`, helper functions, one `ts-back-to-menu-btn` listener, and no `alert()` inside `selectLockedDict()`
- metadata scan for SEO/static pages
- local HTTP smoke through `python3 -m http.server 8080`

Results:
- `script.js` syntax check passed.
- `src/worker.js` syntax check passed.
- Dictionary JSON parse passed.
- Static UI assertions passed.
- Metadata scan passed.
- Local HTTP smoke returned HTTP 200 for 12 checked URLs: `/`, SEO/static pages, legal pages, `sitemap.xml`, and `robots.txt`.
- Independent reviewer confirmed `selectLockedDict()` no longer alerts, available selection still clears the notice, and `ts-back-to-menu-btn` has one click listener.

Regressions found:
- None from automated checks or independent review.

Unverified scenarios:
- Browser pixel/screenshot QA because Playwright is not installed.

Follow-up fixes:
- Applied reviewer P3 copy polish: changed the fallback locked-dictionary message from `когда доступ станет доступен` to `когда он станет доступен`.

## 7. Docs Sync

Agent: Docs Sync
Verdict: pass

Docs changed:
- `README.md` gained a clean-worktree deploy and fallback runbook.
- `RECENT_PROJECT_CHANGES.md` records the inline locked-dictionary UX and duplicate listener cleanup.
- This task journal records pipeline decisions and verification.

Docs not changed:
- `GAME_SPEC.md` and `PROJECT_KNOWLEDGE_BASE.md` because game rules, saved summaries, backend behavior, and dictionary access rules did not change.

## 8. Release Check

Agent: Release Manager
Verdict: pass

Diff reviewed:
- `git diff --stat`
- `git diff --name-only`

Open risks:
- Visual screenshot QA remains unavailable in this local runtime.
- Production still has the previous deploy until this UX cleanup is committed and deployed.

Deploy follow-up:
- If this UX cleanup should be visible to users immediately, commit, push, and deploy from a clean worktree. No D1 migration or Worker secret change is required.

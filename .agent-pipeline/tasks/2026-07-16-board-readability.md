# Board Readability Pass

## 1. Intake

Agent: Intake
Verdict: pass

Goal:
Make the game board easier to read: field numbers are currently too small, and the snake movement direction is not obvious enough.

User scenario:
Players look at one phone during a turn and should quickly understand where teams are, what the next cells are, and how the path moves from row to row.

Acceptance criteria:
- Cell numbers are readable on mobile around 360px.
- The snake direction is visually explicit.
- Start and finish are easier to recognize.
- Existing gameplay rules, positions, board composition, and saved game behavior do not change.
- Board still has no horizontal overflow on mobile.

Out of scope:
- Changing board generation or cell mode distribution.
- Changing finish position, scoring, collisions, or turn flow.
- Redesigning the whole game screen.

Relevant pipeline:
UI / Frontend:
Intake -> Project Context Reader -> UX Planner -> Frontend Developer -> Design Adequacy Reviewer -> Functional QA -> Docs Sync -> Release Manager.

## 2. Project Context

Agent: Project Context Reader
Verdict: pass

Files reviewed:
- `AGENTS.md`
- `.agent-pipeline/AGENT_PIPELINE.md`
- `.agent-pipeline/QUALITY_GATES.md`
- `.agent-pipeline/TASK_TEMPLATE.md`
- `script.js`
- `style.css`
- `index.html`

Confirmed facts:
- Board path is generated in `script.js` by `pathToGrid(slotIdx)`.
- `renderBoard(containerId)` renders 42 cells: `0..40` plus finish `41`.
- Current snake uses 7 columns and 6 rows.
- Current visual direction is implied by row order and separator gaps, not explicit labels/arrows.

Existing constraints:
- Preserve dark, compact, mobile-first visual language.
- Do not change gameplay state or saved summary contract.
- Keep plain HTML/CSS/vanilla JS.

Initial risks:
- Larger numbers can crowd tokens on narrow cells.
- Direction arrows can become visual noise if too heavy.
- Any renderer HTML change must keep `ts-board` and `tr-board` working.

## 3. Plan

Agent: UX Planner
Verdict: pass

Affected layers:
- Frontend/UI only

Affected files:
- `script.js`
- `style.css`
- `.agent-pipeline/tasks/2026-07-16-board-readability.md`

Implementation plan:
- Add row direction classes and lightweight arrow labels to each board row.
- Replace ambiguous separator bars with clearer turn connectors between rows.
- Make cell numbers larger and higher contrast.
- Add start/finish labels without changing positions.
- Verify syntax and screenshots at mobile and desktop widths.

Rollback plan:
- Revert this task's commit. No data, backend, D1, or deployment rollback is required unless deployed.

## 4. Implementation

Agent: Developer
Verdict: pass

Changed files:
- `script.js`
- `style.css`

Implementation summary:
- Enlarged and strengthened board cell numbers.
- Added visible `Старт` and `Финиш` captions inside the first and final cells.
- Replaced subtle separator bars with explicit alternating snake-turn connectors: `→↓` on the right edge, `←↓` on the left edge.
- Updated the turn-start cell label from the confusing `Клетка 0 из 40` style to `Старт · финиш 41`, `Клетка N · финиш 41`, or `Финиш`.

Important decisions:
- Direction hints live between rows, not on top of cells, so they do not cover field numbers on mobile.
- Board generation, finish position, movement, scoring, collisions, turn logs, saved summaries, backend, and D1 were not changed.
- No new dependency, build step, framework, or broad refactor was introduced.

Known risks:
- The board is still dense on narrow phones because it intentionally shows all 42 positions at once; the final screenshot is readable at 360px.

## 5. Specialist Review

Agent: Design Adequacy Reviewer
Verdict: pass

Findings:
- Initial implementation made direction more explicit but placed row badges over cells on mobile; this was a real readability regression.
- Final implementation keeps the cells clean and uses side connectors between rows instead.
- Numbers are materially larger than before and remain inside their cells at 360px.
- Start and finish are easier to recognize without changing gameplay.

Required fixes:
- Fixed the mobile overlap by removing row-overlay direction badges.

Optional polish:
- In a later larger redesign, the board could get an even more board-game-like route line, but the current narrow fix solves the reported readability issue without a rewrite.

Routed back to:
- Frontend Developer for the overlap fix; resolved.

## 6. Functional QA

Agent: Functional QA
Verdict: pass

Checks performed:
- `node --check script.js`
- `node tools/smoke_check.mjs`
- Local HTTP smoke: `node tools/smoke_check.mjs --base http://127.0.0.1:8081`
- Browser visual QA with headless Chromium at 360x860 and 900x900.
- Browser flow QA: setup -> start game -> successful turn -> next turn -> failed turn -> profile.

Results:
- `node --check script.js`: passed.
- `node tools/smoke_check.mjs`: passed, 267 assertions.
- Local HTTP smoke: passed, 289 assertions.
- Browser metrics, mobile 360px: 42 cells, 6 rows, no horizontal overflow, board width 332px, number font size 13.44px.
- Browser metrics, desktop 900px: 42 cells, 6 rows, no horizontal overflow, board width 560px, number font size 16.8px.
- Flow QA: after success, result board rendered 42 cells and Team 1 moved to `кл.3`; after failure, result board rendered 42 cells and positions stayed stable; profile screen opened with no unfiltered JS errors.
- Screenshots saved for review:
  - `/tmp/activity-board-screens/mobile-360-final-board.png`
  - `/tmp/activity-board-screens/desktop-900-final-board.png`

Regressions found:
- None after the overlap fix.

Unverified scenarios:
- Production Worker/API behavior was not rechecked because this task did not touch backend code.

## 7. Docs Sync

Agent: Docs Sync
Verdict: pass

Docs reviewed:
- `AGENTS.md`
- `.agent-pipeline/AGENT_PIPELINE.md`
- `.agent-pipeline/QUALITY_GATES.md`

Docs changed:
- `.agent-pipeline/tasks/2026-07-16-board-readability.md`

Docs not changed because:
- The change is visual board readability only. Game rules, architecture, deployment assumptions, dictionaries, backend, D1 schema, and saved-game contracts did not change.

## 8. Release Check

Agent: Release Manager
Verdict: pass

Diff reviewed:
- `script.js`
- `style.css`
- `.agent-pipeline/tasks/2026-07-16-board-readability.md`

Commands run:
- `node --check script.js`
- `node tools/smoke_check.mjs`
- `python3 -m http.server 8081 --bind 127.0.0.1`
- `node tools/smoke_check.mjs --base http://127.0.0.1:8081`
- Headless Chromium screenshot and flow checks.

Manual checks:
- Reviewed mobile and desktop board screenshots.
- Confirmed final arrows do not cover cell numbers.
- Confirmed start/finish labels fit.
- Confirmed no mobile horizontal overflow at 360px.

Deploy follow-up:
- Frontend files need push/deploy for production to receive the visual update.

D1 follow-up:
- None.

Secret or config follow-up:
- None.

Cache follow-up:
- After deploy, users may need a hard refresh if an old static asset is cached.

Open risks:
- No blocking risks. This is a local frontend polish change until deployed.

Ready to hand back:
- Yes.

## 9. Follow-up Board Polish

Agent: Frontend Developer
Verdict: pass

User feedback addressed:
- The long turn-start hint took unnecessary space.
- Multiple team tokens on `Старт` could collide with the caption.
- Round snake-turn markers looked heavier than needed.

Changed files:
- `index.html`
- `script.js`
- `style.css`

Implementation summary:
- Shortened the turn-start hint to keep the screen more compact.
- Added clustered token positioning for cells with several teams: 2-6 tokens are arranged on an open lower arc so they do not intersect the `Старт` caption.
- Replaced circular turn arrows with rounded rectangular markers that match one board cell width.
- Softened the finish cell styling so `Финиш` reads as a cell label without visually overpowering the board.

Verification:
- `node --check script.js`: passed.
- `node tools/smoke_check.mjs`: passed, 267 assertions.
- Browser visual previews were generated for 2, 3, 4, 5, and 6 teams at 360px width.
- Token/caption intersection check for `Старт`: 0 intersections for 2-6 teams.
- Rectangular connector metrics: one-cell-wide markers, no horizontal overflow at 360px.

Docs sync:
- No product docs changed because gameplay rules, board positions, saved summaries, backend, and D1 schema did not change.

Release follow-up:
- Push and merge are required before the approved visual polish reaches the shared branch.

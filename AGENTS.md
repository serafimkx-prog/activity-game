# AGENTS.md

Start here when an AI model or coding agent works on this repository.

This file explains how the Activity project is structured, which files are sources of truth, and how to make changes safely.

## Trigger Phrase

If the user starts a chat with:

```text
посмотри стартовый файл
```

or says anything equivalent to "read the start file", immediately open and read this root `AGENTS.md` file before planning or editing.

After reading it, continue by reading only the task-relevant files listed below.

## 1. Project Summary

Activity is a browser game implemented with:

- static frontend: `index.html`, `style.css`, `script.js`
- backend: Cloudflare Workers in `src/worker.js`
- database: Cloudflare D1 with schema in `db/schema.sql`
- auth: Telegram Login Widget
- payments: YooKassa for premium dictionaries
- data: JSON dictionaries and dictionary metadata

There is no frontend build step. The app is intentionally plain HTML/CSS/vanilla JS.

## 2. Absolute Rules

- Read the real code before changing anything.
- Preserve existing user or generated changes. Do not revert unrelated work.
- Keep changes narrow and connected to the user's request.
- Do not introduce a framework, bundler, or dependency unless explicitly requested.
- Treat `script.js` as the source of truth for game behavior.
- Treat `src/worker.js` and `src/lib/*` as the source of truth for backend behavior.
- Treat `db/schema.sql` as the source of truth for D1 structure, but remember that editing it does not update remote D1.
- Treat `summary_json` in `game_sessions` as a durable saved-game contract.
- Protect premium dictionary access on the Worker, not only in the UI.
- Update documentation only when behavior, architecture, deployment, or operating assumptions change.
- Never claim production state, secret availability, deployment status, or remote D1 state without checking it.

## 3. Read Order

For a new task, read only what is needed, but start from this map.

### Always Useful

- `README.md` — high-level project overview and local run notes
- `PROJECT_KNOWLEDGE_BASE.md` — detailed current project knowledge
- `RECENT_PROJECT_CHANGES.md` — recent decisions and changes
- `.agent-pipeline/AGENT_PIPELINE.md` — required agent pipeline
- `.agent-pipeline/QUALITY_GATES.md` — quality gates that can block a task
- `.agent-pipeline/TASK_TEMPLATE.md` — task journal template

### Frontend / UI

- `index.html` — screens and DOM containers
- `style.css` — all visual styles
- `script.js` — renderers, event handlers, state, API client calls

### Gameplay

- `script.js`
- `GAME_SPEC.md`
- `PROJECT_KNOWLEDGE_BASE.md`

Important functions:

- `goTurnStart()`
- `goCardSelection()`
- `goPreview()`
- `goExplaining()`
- `endTurn()`
- `endOpenRound()`
- `recordTurn(...)`
- `buildGameSummary(...)`
- `showGameOver(...)`

### Backend / Auth / Payments

- `src/worker.js`
- `src/lib/http.js`
- `src/lib/session.js`
- `src/lib/telegram.js`
- `db/schema.sql`
- `wrangler.jsonc`

### Dictionaries

- `DICTIONARY_RULES.md`
- `dictionaries.json`
- `words.json`
- `words_geo.json`
- `words_society.json`
- `words_around_us.json`

### SEO / Static Pages

- `activity-online/index.html`
- `rules/index.html`
- `words/index.html`
- `dictionaries/index.html`
- `games-for-company/index.html`
- `crocodile-alias-activity/index.html`
- `offer/index.html`
- `access/index.html`
- `requisites/index.html`
- `sitemap.xml`
- `robots.txt`

## 4. Required Agent Pipeline

Non-trivial work must follow `.agent-pipeline/AGENT_PIPELINE.md`.

Create a task journal from `.agent-pipeline/TASK_TEMPLATE.md` in:

```text
.agent-pipeline/tasks/YYYY-MM-DD-short-task-name.md
```

Every agent result should include:

```markdown
Agent:
Verdict: pass | needs_changes | blocked
Input reviewed:
Work performed:
Findings:
Next step:
```

If a reviewer returns `needs_changes`, route the task back to the relevant developer role.

If a reviewer returns `blocked`, do not pretend the task is complete. State what is missing.

## 5. Pipeline By Task Type

### UI / Frontend

Use when touching `index.html`, `style.css`, visible UI in `script.js`, navigation, loading/empty/error states, responsive layout, or interface copy.

```text
Intake
-> Project Context Reader
-> UX Planner
-> Frontend Developer
-> Design Adequacy Reviewer
-> Functional QA
-> Docs Sync
-> Release Manager
```

### Gameplay Logic

Use when touching turn flow, timers, open rounds, card choice, scoring, movement, collisions, board generation, explainer rotation, saved summaries, or game-over behavior.

```text
Intake
-> Project Context Reader
-> Gameplay Architect
-> Game Logic Developer
-> Game Logic Reviewer
-> Functional QA
-> Docs Sync
-> Release Manager
```

### Backend / Auth / Payment

Use when touching Worker routes, Telegram auth, session cookies, D1 queries, protected assets, premium dictionaries, YooKassa, or Worker config.

```text
Intake
-> Project Context Reader
-> Backend Architect
-> Backend Developer
-> Security and Data Reviewer
-> API QA
-> Docs Sync
-> Release Manager
```

### Dictionaries

Use when adding or editing dictionary metadata or word files.

```text
Intake
-> Dictionary Editor
-> Dictionary Quality Reviewer
-> Game Fit Reviewer
-> JSON Validation
-> Docs Sync
-> Release Manager
```

### SEO / Static Pages

Use when touching landing pages, canonical URLs, metadata, sitemap, verification files, or search-facing copy.

```text
Intake
-> Project Context Reader
-> SEO Content Editor
-> Frontend Developer
-> Design Adequacy Reviewer
-> SEO QA
-> Docs Sync
-> Release Manager
```

## 6. Frontend Rules

- Keep the playable app game-first.
- Preserve the current dark, compact, mobile-first visual language.
- Avoid long explanatory blocks inside the game flow.
- Do not make nested cards unless there is a clear component reason.
- Text must fit on mobile, especially in Russian.
- Buttons must have clear states and actions.
- When adding DOM ids in `index.html`, update matching `script.js` renderers.
- When removing DOM ids, search for remaining queries.
- Use `escapeHtml` for dynamic user-controlled strings.
- Avoid broad refactors of `script.js` unless the task requires them.
- If the UI changes, run the Design Adequacy gate.

## 7. Design Adequacy Rules

The Design Adequacy Reviewer checks whether the UI is usable and visually sane, not whether it is subjectively fancy.

The reviewer must check:

- primary action is obvious within about three seconds
- mobile layout around `360px` is usable
- hierarchy, spacing, and alignment look intentional
- text does not overlap or overflow
- premium/login states are understandable
- new UI looks native to this Activity project
- table-play use case still works when several people look at one device

Open `P0` or `P1` design findings block the task.

## 8. Gameplay Rules

Known current behavior:

- finish position is `41`
- victory happens when a team position is `>= 41`
- board has 41 playable cells plus finish
- board composition is 14 `E`, 14 `A`, 13 `D`
- modes are `EXPLAIN`, `ACT`, `DRAW`
- preview before explaining lasts 7 seconds
- turn time defaults to 60 seconds
- open round is optional and has special scoring
- collision can move another team back by 1
- active games are restored from `localStorage`
- finished games are queued locally before backend sync

When changing gameplay, also check:

- `turnLog`
- final summary
- profile/history rendering
- active game restore
- older saved summaries

## 9. Backend / Data Rules

- Keep method guards on API endpoints.
- Keep auth guards server-side.
- Do not expose secrets in API responses.
- Session cookies must remain `HttpOnly`, `Secure`, `SameSite=Lax`, and `Path=/`.
- Telegram auth verification happens server-side.
- Premium dictionary files must be protected by Worker asset logic.
- YooKassa payment creation, sync, and webhook handling must not grant access from unverified or failed states.
- Additive API payload changes are preferred.
- If `db/schema.sql` changes, mention that remote D1 migration is a separate action.
- If Worker vars or secrets change, document the deploy/config follow-up.

## 10. Dictionary Rules

Current released dictionaries:

- `classic` -> `words.json`, free
- `geo` -> `words_geo.json`, free after Telegram login
- `society` -> `words_society.json`, premium
- `around_us` -> `words_around_us.json`, premium

Before changing dictionaries:

- read `DICTIONARY_RULES.md`
- keep modes `DRAW`, `EXPLAIN`, `ACT`
- keep levels `3`, `4`, `5`
- validate JSON
- check exact duplicates
- update `wordCount` in `dictionaries.json`
- keep access metadata aligned with Worker logic

## 11. Verification

Run checks that match the changed layer.

For frontend JS:

```bash
node --check script.js
```

For Worker JS:

```bash
node --check src/worker.js
```

For local frontend smoke test:

```bash
python3 -m http.server 8080
```

Then inspect:

- setup screen
- dictionary selection
- game start
- one successful turn
- one failed turn
- profile screen

For Worker config/API deploy readiness:

```bash
wrangler deploy --dry-run
```

For D1 follow-up after schema changes:

```bash
wrangler d1 execute activity-game --remote --command "PRAGMA table_info(table_name)"
```

For final review:

```bash
git diff --stat
git diff
```

If a check cannot run, record why.

## 12. Documentation Sync

Update docs when behavior or assumptions change:

- `README.md` for high-level behavior
- `GAME_SPEC.md` for technical behavior
- `PROJECT_KNOWLEDGE_BASE.md` for current architecture and operational notes
- `RECENT_PROJECT_CHANGES.md` for meaningful recent changes
- `DICTIONARY_RULES.md` when dictionary rules change

Do not update docs for purely internal refactors unless they affect how future work should be done.

Do not claim external state unless verified:

- production deployment
- remote D1 migration
- Cloudflare secrets
- GitHub status
- successful end-to-end payment flow

## 13. Release Handoff

Before handing work back, summarize:

- what changed
- files changed
- checks run
- checks not run and why
- open risks
- deploy, D1, secret, or cache follow-up
- whether unrelated existing worktree changes were present

If the task created or updated a task journal, mention its path.

## 14. Current Process Files

- `.agent-pipeline/AGENT_PIPELINE.md`
- `.agent-pipeline/QUALITY_GATES.md`
- `.agent-pipeline/TASK_TEMPLATE.md`
- `.agent-pipeline/agents/01-intake.md`
- `.agent-pipeline/agents/02-project-context-reader.md`
- `.agent-pipeline/agents/03-ux-planner.md`
- `.agent-pipeline/agents/04-frontend-developer.md`
- `.agent-pipeline/agents/05-backend-developer.md`
- `.agent-pipeline/agents/06-game-logic-reviewer.md`
- `.agent-pipeline/agents/07-design-adequacy-reviewer.md`
- `.agent-pipeline/agents/08-security-and-data-reviewer.md`
- `.agent-pipeline/agents/09-functional-qa.md`
- `.agent-pipeline/agents/10-docs-sync.md`
- `.agent-pipeline/agents/11-release-manager.md`

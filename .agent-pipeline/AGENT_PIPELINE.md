# AI Agent Pipeline

This document defines the mandatory agent pipeline for non-trivial changes in the Activity project.

The goal is not to use many agents for ceremony. The goal is to make every change pass through clear roles, explicit artifacts, and quality gates before it is considered ready.

## Core Principles

- Each agent has one responsibility.
- Each agent receives a concrete input and produces a concrete output.
- Review agents can return a task to the previous implementation role.
- A task is not ready while any required gate is `needs_changes` or `blocked`.
- Project code is the source of truth. Documentation is updated only when behavior or operating assumptions change.
- The smallest safe change is preferred over broad refactors.

## Task Journal

Every non-trivial task should have a journal in:

```text
.agent-pipeline/tasks/YYYY-MM-DD-short-task-name.md
```

Start from:

```text
.agent-pipeline/TASK_TEMPLATE.md
```

The journal is the handoff artifact between agents. If an agent changes code or finds an issue, it records the decision there.

## Pipeline Selection

Choose the smallest pipeline that covers the change.

### UI / Frontend Change

Use this when the task touches `index.html`, `style.css`, user-visible UI in `script.js`, navigation, empty/loading/error states, responsive layout, or copy inside the game interface.

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

### Gameplay Logic Change

Use this when the task touches turn flow, timers, open rounds, card choice, scoring, movement, collisions, board generation, player rotation, saved summaries, or game-over behavior.

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

### Backend / Auth / Payment Change

Use this when the task touches `src/worker.js`, `src/lib/*`, `/api/*`, Telegram auth, cookies, D1 access, premium dictionaries, YooKassa, or Worker configuration.

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

### Dictionary / Content Change

Use this when the task adds or edits word dictionaries, dictionary metadata, dictionary access rules, or dictionary-facing pages.

```text
Intake
-> Dictionary Editor
-> Dictionary Quality Reviewer
-> Game Fit Reviewer
-> JSON Validation
-> Docs Sync
-> Release Manager
```

### SEO / Static Page Change

Use this when the task touches static landing pages, metadata, canonical URLs, sitemap, robots, verification files, or search-facing copy.

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

## Universal Agent Contract

Every agent must produce this minimum output:

```markdown
## Agent Result

Agent:
Verdict: pass | needs_changes | blocked

Input reviewed:
- ...

Work performed:
- ...

Findings:
- ...

Next step:
- ...
```

If `Verdict` is `needs_changes`, the agent must state exactly which previous role should handle the fix.

If `Verdict` is `blocked`, the agent must state what information, permission, environment access, or external action is missing.

## Loop Rules

Review and QA agents do not silently fix substantial issues. They report findings and route the task back.

Allowed loops:

```text
Design Adequacy Reviewer -> Frontend Developer
Game Logic Reviewer -> Game Logic Developer
Security and Data Reviewer -> Backend Developer
Functional QA -> relevant Developer or Architect
Docs Sync -> relevant Developer or Docs owner
Release Manager -> relevant previous role
```

A task can move forward only when the current required gate has `Verdict: pass`.

## Required Context By Layer

### Frontend/UI

Read:

- `index.html`
- `style.css`
- `script.js`
- relevant docs if behavior is documented

Check:

- screen ids and DOM containers match renderers
- mobile layout remains usable
- text does not overflow
- no unrelated visual redesign
- main game flow remains easy to start

### Gameplay

Read:

- `script.js`
- `GAME_SPEC.md`
- `PROJECT_KNOWLEDGE_BASE.md`

Focus functions:

- `goTurnStart()`
- `goCardSelection()`
- `goPreview()`
- `goExplaining()`
- `endTurn()`
- `endOpenRound()`
- `recordTurn(...)`
- `buildGameSummary(...)`
- `showGameOver(...)`

### Backend/API

Read:

- `src/worker.js`
- `src/lib/session.js`
- `src/lib/telegram.js`
- `src/lib/http.js`
- `db/schema.sql`
- `wrangler.jsonc`

Check:

- auth guard is correct
- D1 schema and Worker queries match
- frontend expects the returned payload
- secrets and vars are documented
- protected dictionaries cannot be bypassed by UI-only changes

### Dictionaries

Read:

- `DICTIONARY_RULES.md`
- `dictionaries.json`
- affected `words*.json`
- dictionary-facing docs and static pages if metadata changes

Check:

- JSON is valid
- modes are `DRAW`, `EXPLAIN`, `ACT`
- levels are `3`, `4`, `5`
- no exact duplicates
- phrases fit difficulty and mode
- `wordCount` is correct
- premium/login access metadata matches Worker logic

## Required Verification

Use the checks that match the changed layer.

Minimum for JS changes:

```bash
node --check script.js
node --check src/worker.js
```

Minimum for docs-only pipeline changes:

```bash
find .agent-pipeline -type f -maxdepth 3 -print
```

Recommended local frontend smoke test:

```bash
python3 -m http.server 8080
```

Then inspect:

- setup screen
- dictionary cards
- game start
- one normal turn
- one failed turn
- profile screen

Worker dry-run when Worker config or API changed:

```bash
wrangler deploy --dry-run
```

D1 follow-up when schema changed:

```bash
wrangler d1 execute activity-game --remote --command "PRAGMA table_info(table_name)"
```

Editing `db/schema.sql` does not update remote D1 by itself.

## Definition Of Done

A task is done only when:

- the selected pipeline is documented in the task journal
- every required role has a result
- all blocking findings are resolved or explicitly accepted by the user
- relevant verification has been run or the reason it could not run is recorded
- docs are updated when behavior or operating assumptions changed
- release notes mention deploy, D1, secret, cache, or manual follow-up needs

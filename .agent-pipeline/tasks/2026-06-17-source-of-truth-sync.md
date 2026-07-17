# Source Of Truth Sync: Dictionary Access

## 1. Intake

Agent: Intake
Verdict: pass

Goal:
Stabilize documentation and static copy so current dictionary access matches `dictionaries.json` and Worker access logic.

User scenario:
Future contributors and users should not read docs/static copy that says `geo` requires login, `society` or `around_us` are premium, or that buying for `149 RUB` is the current access model.

Acceptance criteria:
- Current six dictionaries are documented.
- `classic`, `geo`, and `society` are documented as free and open immediately.
- `around_us`, `cinema`, and `science` are documented as free after Telegram login.
- Current docs/static copy do not present active premium purchases as the current model.
- Runtime behavior is unchanged.

Out of scope:
- Runtime changes in `script.js`, `index.html`, `style.css`, Worker, dictionary card JSON, sitemap, legal pages, favicon, or other SEO pages.
- Remote production, D1, Cloudflare secret, or deployment verification.

Relevant pipeline:
Docs/static-copy sync with Docs Sync and Release Manager gates.

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
- `.agent-pipeline/TASK_TEMPLATE.md`
- `.agent-pipeline/agents/10-docs-sync.md`
- `.agent-pipeline/agents/11-release-manager.md`
- `dictionaries.json`
- `dictionaries/index.html`
- `src/worker.js`
- `script.js` dictionary UI snippets
- `git status --short`

Confirmed facts:
- `dictionaries.json` has six available dictionaries.
- `classic`, `geo`, and `society` have `access: "free"` and no `authAccess: "login"`.
- `around_us`, `cinema`, and `science` have `access: "free"` and `authAccess: "login"`.
- Worker protects `authAccess: "login"` dictionary files with session auth.
- Worker premium purchase/access code remains present, but current catalog has no `access: "premium"` entries.

Existing constraints:
- Existing uncommitted and untracked work is present and must not be reverted.
- Write scope is limited to docs/static copy and this journal.

Initial risks:
- `dictionaries/index.html` is inside an already-untracked folder, so `git status --short` cannot isolate this file's pre-existing state.

## 3. Plan

Agent: Docs Sync Planner
Verdict: pass

Affected layers:
- Documentation and static SEO copy only.

Affected files:
- `AGENTS.md`
- `GAME_SPEC.md`
- `dictionaries/index.html`
- `.agent-pipeline/tasks/2026-06-17-source-of-truth-sync.md`

Implementation plan:
- Update outdated dictionary access lists in `AGENTS.md`.
- Replace old `GAME_SPEC.md` dictionary section with current six-dictionary access model.
- Update `/dictionaries/` copy to list six dictionaries and accurate access.
- Run requested syntax, JSON, search, and diff checks.

Rollback plan:
- Revert only the above documentation/static-copy edits if a reviewer finds a mismatch.

## 4. Implementation

Agent: Docs Sync
Verdict: pass

Changed files:
- `AGENTS.md`
- `GAME_SPEC.md`
- `dictionaries/index.html`
- `.agent-pipeline/tasks/2026-06-17-source-of-truth-sync.md`

Implementation summary:
- Replaced stale current dictionary model in `AGENTS.md`.
- Replaced stale `geo login`, `society premium`, and `149 RUB` current-access claims in `GAME_SPEC.md`.
- Updated `/dictionaries/` page metadata, subtitle, and dictionary list for six current dictionaries.

Important decisions:
- Kept YooKassa/premium references where they describe code paths or future model support, not current active access.
- Did not edit `README.md`, `PROJECT_KNOWLEDGE_BASE.md`, or `RECENT_PROJECT_CHANGES.md` because their current-access statements already match `dictionaries.json`.

Known risks:
- No browser visual smoke test was required for this copy-only page edit.

## 5. Specialist Review

Agent: Docs Sync Reviewer
Verdict: pass

Findings:
- No open P0/P1 documentation findings after targeted sync.

Required fixes:
- None.

Optional polish:
- None.

Routed back to:
- Not needed.

## 6. Functional QA

Agent: Functional QA
Verdict: pass

Checks performed:
- `node --check script.js`
- `node --check src/worker.js`
- `node -e "JSON.parse(require('fs').readFileSync('dictionaries.json','utf8')); console.log('dictionaries.json valid')"`
- `rg` search for stale `geo` login, `149 RUB`, and premium-current claims across docs/static-copy.

Results:
- `script.js` syntax check passed.
- `src/worker.js` syntax check passed.
- `dictionaries.json` parsed successfully.
- No stale `geo` login or `149 RUB` current-access claims remain in the reviewed docs/static-copy.
- The only narrow `around_us premium` hit is a historical `RECENT_PROJECT_CHANGES.md` note that explicitly says the current model is free.

Regressions found:
- None.

Unverified scenarios:
- Browser smoke test not planned because runtime behavior is unchanged.

## 7. Docs Sync

Agent: Docs Sync
Verdict: pass

Docs reviewed:
- `AGENTS.md`
- `README.md`
- `PROJECT_KNOWLEDGE_BASE.md`
- `RECENT_PROJECT_CHANGES.md`
- `GAME_SPEC.md`
- `dictionaries/index.html`

Docs changed:
- `AGENTS.md`
- `GAME_SPEC.md`
- `dictionaries/index.html`

Docs not changed because:
- `README.md`, `PROJECT_KNOWLEDGE_BASE.md`, and `RECENT_PROJECT_CHANGES.md` already describe the current access model.

Open documentation risks:
- None found for the requested source-of-truth scope.

## 8. Release Check

Agent: Release Manager
Verdict: pass

Diff reviewed:
- `git diff --stat`
- `git diff --name-only`
- `git diff -- AGENTS.md GAME_SPEC.md`
- inspected current `dictionaries/index.html`
- inspected current task journal

Commands run:
- `node --check script.js`
- `node --check src/worker.js`
- `node -e "JSON.parse(require('fs').readFileSync('dictionaries.json','utf8')); console.log('dictionaries.json valid')"`
- `rg -n "geo|Географ|society|Общество|around_us|Вокруг нас|premium|преми|149|Купить|cinema|Мир кино|science|Наука" AGENTS.md README.md PROJECT_KNOWLEDGE_BASE.md RECENT_PROJECT_CHANGES.md GAME_SPEC.md dictionaries/index.html`
- `rg -n "География.*вход|География.*Открывается после входа|geo.*after login|geo.*login|Купить за 149|149 ₽" AGENTS.md README.md PROJECT_KNOWLEDGE_BASE.md RECENT_PROJECT_CHANGES.md GAME_SPEC.md dictionaries/index.html`
- `rg -n "society.*premium|Общество.*premium|Общество.*преми|around_us.*premium|Вокруг нас.*premium|Вокруг нас.*преми" AGENTS.md README.md PROJECT_KNOWLEDGE_BASE.md RECENT_PROJECT_CHANGES.md GAME_SPEC.md dictionaries/index.html`
- `git status --short`
- `git diff --stat`
- `git diff --name-only`
- `git diff -- AGENTS.md GAME_SPEC.md`

Manual checks:
- Reviewed the updated `/dictionaries/` HTML copy directly.
- Browser smoke test not run because no runtime behavior or CSS changed.

Deploy follow-up:
- Deploy/static publish needed only if these documentation/static-copy edits should appear publicly.

D1 follow-up:
- None. No schema changes.

Secret or config follow-up:
- None. No Worker env changes.

Cache follow-up:
- Hard refresh/cache purge may be needed only after publishing the updated static page.

Open risks:
- `dictionaries/index.html` is in an already-untracked directory, so Git cannot show a before/after diff for that file.
- `git` emitted macOS temp/cache warnings in the read-only sandbox, but the status/diff commands returned successfully.
- Unrelated existing changes remain in `favicon.svg`, `index.html`, `requisites/index.html`, `sitemap.xml`, `style.css`, and other untracked SEO/static files.

Ready to hand back:
- yes

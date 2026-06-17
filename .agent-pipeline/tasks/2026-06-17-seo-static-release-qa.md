# SEO Static Pages Release QA

## 1. Intake

Agent: Intake
Verdict: pass

Goal:
Bring the existing SEO/static page package to a release-ready state without starting a new product feature or disturbing unrelated work.

User scenario:
Visitors can land on search-facing pages, understand the Activity game, navigate back to the playable app, and read dictionary/legal access information that matches the current catalog.

Acceptance criteria:
- Main page remains game-first.
- Static pages have title, description, canonical URL, and OG title/description where appropriate.
- Sitemap URLs match existing public pages.
- Internal links resolve to known pages and prefer canonical trailing slash URLs.
- Current dictionary access copy matches `dictionaries.json`.
- No active paid-dictionary copy appears while the current catalog has no premium dictionaries.
- Pipeline findings are recorded.

Out of scope:
- Cloudflare deployment or production verification.
- D1, secrets, payment behavior, or Worker logic changes.
- Broad redesign or `script.js` refactor.
- Changing the durable `summary_json` contract.

Relevant pipeline:
SEO / Static Page Change:
Intake -> Project Context Reader -> SEO Content Editor -> Frontend Developer -> Design Adequacy Reviewer -> SEO QA -> Docs Sync -> Release Manager.

## 2. Project Context

Agent: Project Context Reader
Verdict: pass

Files reviewed:
- `AGENTS.md`
- `.agent-pipeline/AGENT_PIPELINE.md`
- `.agent-pipeline/QUALITY_GATES.md`
- `.agent-pipeline/TASK_TEMPLATE.md`
- `index.html`
- `style.css`
- `script.js`
- `activity-online/index.html`
- `rules/index.html`
- `words/index.html`
- `dictionaries/index.html`
- `games-for-company/index.html`
- `crocodile-alias-activity/index.html`
- `offer/index.html`
- `access/index.html`
- `requisites/index.html`
- `requisites.html`
- `sitemap.xml`
- `robots.txt`
- `dictionaries.json`

Confirmed facts:
- Current dictionary catalog has six available dictionaries.
- `classic`, `geo`, and `society` are free and open immediately.
- `around_us`, `cinema`, and `science` are free after Telegram login.
- Current catalog has no active premium dictionaries.
- SEO/static pages are already present in the working tree.
- Some SEO/static pages are untracked, so normal `git diff --stat` does not show their content.

Existing constraints:
- Working tree already contains unrelated or pre-existing changes.
- Do not revert user/generated work.
- Keep the playable app first on the main screen.

Initial risks:
- Stale paid-dictionary copy could confuse users.
- Missing or inconsistent static-page metadata could weaken release readiness.
- Legacy `requisites.html` could compete with canonical `/requisites/`.

## 3. Plan

Agent: SEO Content Editor / UX Planner
Verdict: pass

Affected layers:
- SEO/static copy
- Main-page profile/access copy
- Dictionary card locked-state copy
- Release documentation

Affected files:
- `index.html`
- `script.js`
- `words/index.html`
- `access/index.html`
- `offer/index.html`
- `requisites/index.html`
- `requisites.html`
- `.agent-pipeline/tasks/2026-06-17-seo-static-release-qa.md`

Implementation plan:
- Fix active paid-dictionary copy in profile/access areas.
- Make login-locked free dictionaries visually say they are free after login.
- Bring `/words/` and `/access/` lists in line with six dictionaries.
- Add missing OG metadata to legal/access pages.
- Mark legacy `requisites.html` as noindex with canonical `/requisites/`.
- Normalize internal legal links to trailing slash URLs.
- Run syntax, metadata, sitemap/link, and stale-copy checks.
- Route to SEO QA and Design Adequacy Reviewer.

Rollback plan:
- Revert only the copy/metadata edits listed above if review finds a mismatch.

## 4. Implementation

Agent: Frontend Developer / SEO Content Editor
Verdict: pass

Changed files:
- `index.html`
- `script.js`
- `words/index.html`
- `access/index.html`
- `offer/index.html`
- `requisites/index.html`
- `requisites.html`
- `.agent-pipeline/tasks/2026-06-17-seo-static-release-qa.md`

Implementation summary:
- Reworded profile copy from active purchases/premium dictionaries to current free/login dictionary access.
- Renamed the profile block from `Покупки и доступ` to `Доступ к словарям`.
- Updated rules copy to mention configurable explanation time with 60 seconds as default.
- Updated login-locked free dictionary cards to show `Бесплатно после входа`.
- Added `Мир кино` and `Наука и природа` to `/words/`.
- Added `Классический` to `/access/`.
- Added OG tags to `/offer/`, `/access/`, and `/requisites/`.
- Added `noindex,follow`, canonical, description, and OG tags to legacy `requisites.html`.
- Normalized legal/access links to canonical trailing slash URLs.

Important decisions:
- Kept future premium/YooKassa references where they describe dormant code paths or future model support.
- Did not delete `requisites.html`; marking it noindex/canonical is safer than destructive removal in a dirty worktree.
- Did not change Worker, payment, D1, or dictionary JSON behavior.

Known risks:
- Browser pixel-level QA still depends on local visual smoke testing.
- Untracked static pages require explicit staging later; Git will not include them unless added intentionally.

## 5. Specialist Review

Agent: Design Adequacy Reviewer
Verdict: pass

Findings:
- No P0/P1/P2 findings after repeat review.
- Initial P2/P3 findings were about ambiguous paid/login copy, missing `classic` on `/access/`, partial `/words/` dictionary list, and non-canonical legal links.
- Repeat review found only a P3 copy precision issue: `верхний/нижний ряд` was less precise on responsive mobile layouts.

Required fixes:
- Applied in implementation.
- P3 wording was changed to `первые три / остальные три` in user-facing copy and current docs.

Optional polish:
- Pixel-level screenshot QA remains useful if a browser binary is available.

Routed back to:
- Frontend Developer / SEO Content Editor for copy and metadata fixes.

## 6. SEO QA

Agent: SEO QA
Verdict: pass

Findings:
- Initial verdict was `needs_changes`.
- P1 paid-dictionary copy was found in `index.html`.
- P2 findings included missing OG tags on legal/access pages, missing classic on `/access/`, partial `/words/` dictionary list, and legacy `requisites.html`.
- P3 finding covered non-canonical no-slash legal links.
- Repeat SEO QA returned `pass` with no open P0/P1/P2/P3 findings.

Required fixes:
- Applied.

Next step:
- SEO/static package is release-ready from the SEO reviewer scope.

## 7. Functional QA

Agent: Functional QA
Verdict: pass

Checks performed:
- `node --check script.js`
- `node --check src/worker.js`
- `dictionaries.json` JSON parse
- metadata scan for title, description, canonical, `og:title`, and `og:description` on primary pages
- internal href scan for known local pages
- stale paid/login wording search
- local HTTP smoke through `python3 -m http.server 8080`

Results:
- `script.js` syntax check passed.
- `src/worker.js` syntax check passed.
- `dictionaries.json` parsed successfully.
- Metadata scan passed for the primary page set plus `requisites.html`.
- Internal link scan passed.
- Stale active paid/login wording search returned no old current-state claims.
- HTTP smoke returned 200 for 13 local URLs: `/`, six SEO/static pages, legal/access pages, legacy `requisites.html`, `sitemap.xml`, and `robots.txt`.

Regressions found:
- None from automated checks.

Unverified scenarios:
- Pixel-level browser screenshot checks were not completed because Playwright browser binaries are not installed in the local runtime.

## 8. Docs Sync

Agent: Docs Sync
Verdict: pass

Docs reviewed:
- `AGENTS.md`
- `GAME_SPEC.md`
- `README.md`
- `PROJECT_KNOWLEDGE_BASE.md`
- `RECENT_PROJECT_CHANGES.md`
- current task journals

Docs changed:
- `README.md`
- `PROJECT_KNOWLEDGE_BASE.md`
- `RECENT_PROJECT_CHANGES.md`
- task journal
- Previous source-of-truth sync already updated `AGENTS.md` and `GAME_SPEC.md`.

Docs not changed because:
- No architecture, gameplay, D1, Worker, or deployment assumptions changed beyond copy precision for current dictionary access.

## 9. Release Check

Agent: Release Manager
Verdict: pass

Diff reviewed:
- `git status --short`
- `git diff --stat`
- `git diff --name-only`

Commands run:
- `node --check script.js`
- `node --check src/worker.js`
- `node -e "JSON.parse(require('fs').readFileSync('dictionaries.json','utf8')); console.log('dictionaries.json valid')"`
- metadata scan script
- internal href scan script
- stale wording `rg` search
- local HTTP smoke script against `127.0.0.1:8080`

Manual checks:
- Read key page copy in `index.html`, `/words/`, `/access/`, `/offer/`, `/requisites/`, and legacy `requisites.html`.
- Design and SEO specialist reviews were requested through subagents.

Deploy follow-up:
- Cloudflare deploy is required for production.
- Because the working tree is dirty and Cloudflare assets use the project directory, deploy should happen from a clean committed state or clean deploy worktree.

D1 follow-up:
- None.

Secret or config follow-up:
- None.

Cache follow-up:
- Hard refresh or cache purge may be needed after static asset deploy.

Open risks:
- Pixel-level browser smoke check was attempted but blocked because Playwright browser binaries are missing. Code-level design review and HTTP smoke passed.
- Existing unrelated worktree changes remain and must be staged intentionally.

Ready to hand back:
- Yes.

# Task: Dictionary Rework, Cinema, Science

## 1. Intake

Agent: Intake
Verdict: pass

Goal:

Improve existing Activity dictionaries and prepare high-quality new dictionaries `Мир кино` and `Наука и природа`.

User scenario:

The project owner wants to audit AI-generated or weak dictionary cards, remove illogical phrases and repetitive patterns, and then build new dictionaries that are fun to play and highly recognizable for a broad audience.

Acceptance criteria:

- Current dictionaries are audited for duplicates, weak phrasing, wrong mode/level, and repetitive patterns.
- New dictionary requirements are clear before generation.
- `Мир кино` prioritizes universally recognizable characters, movies, cartoons, objects, artifacts, and scenes.
- `Наука и природа` prioritizes recognizable nature, animals, simple science, experiments, tools, and phenomena.
- Work follows `DICTIONARY_RULES.md` and `.agent-pipeline` gates.
- No mass dictionary edit starts before the plan is accepted.

Out of scope:

- Creating or editing the actual `words_cinema.json` and `words_science.json` in this initial planning step.
- Publishing new dictionaries.
- Changing access/payment logic.

Relevant pipeline:

```text
Intake
-> Dictionary Editor
-> Dictionary Quality Reviewer
-> Game Fit Reviewer
-> JSON Validation
-> Docs Sync
-> Release Manager
```

## 2. Project Context

Agent: Project Context Reader
Verdict: pass

Files reviewed:

- `AGENTS.md`
- `DICTIONARY_RULES.md`
- `dictionaries.json`
- current dictionary files by script inspection
- `.agent-pipeline` files

Confirmed facts:

- Current released dictionaries are `classic`, `geo`, `society`, and `around_us`.
- `cinema` and `science` exist in `dictionaries.json` as unavailable planned dictionaries.
- `words_cinema.json` and `words_science.json` are not present yet.
- Current `dictionaries.json` target counts are `800` for cinema and `700` for science.
- Initial duplicate scan found internal duplicates in `words.json` and exact cross-dictionary intersections.

Existing constraints:

- Dictionary format is fixed as `DRAW`, `EXPLAIN`, `ACT` with levels `3`, `4`, `5`.
- Phrases longer than `4` words are disallowed by `DICTIONARY_RULES.md`.
- New dictionaries should avoid exact overlaps with existing dictionaries unless explicitly accepted.

Initial risks:

- `Мир кино` can become too franchise-heavy if not capped by cluster.
- `Наука и природа` can become too specialist or school-exam-like.
- Filling fixed target counts can lower quality if weak cards are accepted just to reach a number.

## 3. Plan

Agent: Dictionary Editor
Verdict: pass

Affected layers:

- Dictionary/content
- Documentation/process
- Potential future catalog/backend if dictionaries are published or made premium

Affected files for this planning step:

- `DICTIONARY_REWORK_PLAN.md`
- `DICTIONARY_AUDIT_REPORT.md`
- `DICTIONARY_EDITORIAL_REVIEW.md`
- `DICTIONARY_INTERSECTION_DECISIONS.md`
- `DICTIONARY_BLUEPRINT_CINEMA_SCIENCE.md`
- `tools/dictionary_audit.mjs`
- `.agent-pipeline/tasks/2026-06-13-dictionary-rework-cinema-science.md`

Implementation plan:

- Create a clear dictionary rework plan.
- Add a reproducible dictionary audit script.
- Generate a technical audit report for current dictionaries.
- Add editorial findings and priority recommendations.
- Add blueprint clusters and seed examples for `Мир кино` and `Наука и природа`.
- Define quality criteria for current dictionary audit.
- Define new dictionary requirements for `Мир кино` and `Наука и природа`.
- Define technical and editorial acceptance criteria.
- Defer actual word edits until the plan is accepted.

Rollback plan:

- Remove this task journal and `DICTIONARY_REWORK_PLAN.md`.

## 4. Implementation

Agent: Docs Implementation
Verdict: pass

Changed files:

- `DICTIONARY_REWORK_PLAN.md`
- `DICTIONARY_AUDIT_REPORT.md`
- `DICTIONARY_EDITORIAL_REVIEW.md`
- `DICTIONARY_BLUEPRINT_CINEMA_SCIENCE.md`
- `tools/dictionary_audit.mjs`
- `words.json`
- `dictionaries.json`
- `.agent-pipeline/tasks/2026-06-13-dictionary-rework-cinema-science.md`

Implementation summary:

- Added a project-level ТЗ and plan for dictionary audit and new dictionary creation.
- Added a reusable audit script for dictionary technical checks.
- Generated the first technical audit report.
- Added editorial review with prioritized current-dictionary fixes.
- Added remaining-intersection decision list after high-confidence cleanup passes.
- Added cinema/science blueprint with clusters and seed examples.
- Applied the first high-confidence P1 cleanup pass to `classic`.
- Added a task journal for the dictionary rework effort.

Important decisions:

- New dictionaries should prioritize high-probability recognition over niche completeness.
- New dictionaries should remain unavailable until fully checked.
- A compact strong v1 is acceptable if target counts would force weak cards.
- Existing dictionaries should be cleaned through replacement plans, not blind deletions.
- The first `classic` pass should fix only unambiguous technical problems.

Known risks:

- Actual dictionary generation will need multiple passes and validation.

## 5. Specialist Review

Agent: Dictionary Quality Reviewer
Verdict: pass

Findings:

- The plan separates technical validation from editorial/game-fit review.
- The plan explicitly protects against AI-like phrase glue and repeated patterns.
- The plan includes special requirements for cinema recognizability and science accessibility.
- The audit report identifies concrete first-pass issues: `classic` wordCount mismatch, internal duplicates, one long phrase, exact intersections, and repetitive patterns in `society`.
- After cleanup passes, `classic` has no `wordCount` mismatch, no cards longer than `4` words, and no internal duplicate groups.
- Exact duplicate/intersection groups decreased from `72` to `9`.

Required fixes:

- None for planning step.

Optional polish:

- Later add a script that generates the duplicate/length/repetition audit report automatically.

Routed back to:

- Not needed.

## 6. Functional QA

Agent: Functional QA
Verdict: pass

Checks performed:

- Read relevant rules and catalog.
- Inspected dictionary counts and samples.
- Ran initial duplicate/intersection scan.
- Ran `node --check tools/dictionary_audit.mjs`.
- Ran `node tools/dictionary_audit.mjs --write DICTIONARY_AUDIT_REPORT.md`.
- Parsed `dictionaries.json`, `words.json`, `words_geo.json`, `words_society.json`, and `words_around_us.json` with Node after edits.

Results:

- Planning document is aligned with current project structure.
- Technical audit report was generated successfully.
- `classic` P1 technical issues are resolved.
- No runtime files changed.

Regressions found:

- None.

Unverified scenarios:

- Full manual review of every current dictionary card is not done yet; the editorial review currently covers prioritized technical and pattern findings.
- New dictionary files are not created yet.

## 7. Docs Sync

Agent: Docs Sync
Verdict: pass

Docs reviewed:

- `AGENTS.md`
- `DICTIONARY_RULES.md`
- `.agent-pipeline` docs

Docs changed:

- Added `DICTIONARY_REWORK_PLAN.md`.
- Added `DICTIONARY_AUDIT_REPORT.md`.
- Added `DICTIONARY_EDITORIAL_REVIEW.md`.
- Added `DICTIONARY_INTERSECTION_DECISIONS.md`.
- Added `DICTIONARY_BLUEPRINT_CINEMA_SCIENCE.md`.
- Added `tools/dictionary_audit.mjs`.
- Added this task journal.

Docs not changed because:

- Runtime behavior and published dictionary catalog did not change.

## 8. Release Check

Agent: Release Manager
Verdict: pass

Diff reviewed:

- Planning-only change.

Commands run:

```bash
node -e "...dictionary count and duplicate inspection..."
node --check tools/dictionary_audit.mjs
node tools/dictionary_audit.mjs --write DICTIONARY_AUDIT_REPORT.md
```

Manual checks:

- Confirmed `cinema` and `science` are planned in `dictionaries.json`.
- Confirmed new dictionary files are absent.

Deploy follow-up:

- None for this planning step.

D1 follow-up:

- None.

Secret or config follow-up:

- None.

Cache follow-up:

- None.

Open risks:

- Broad dictionary JSON editing is still ahead.
- Only the first high-confidence `classic` cleanup pass has been applied.
- Full human editorial pass over every card is still ahead.
- Existing unrelated worktree changes remain.

Ready to hand back:

Yes.

## 9. Full Dictionary Implementation Pass

Agent: Dictionary Editor
Verdict: pass

Input reviewed:

- `AGENTS.md`
- `DICTIONARY_RULES.md`
- `.agent-pipeline/AGENT_PIPELINE.md`
- `.agent-pipeline/QUALITY_GATES.md`
- `dictionaries.json`
- existing dictionary audit outputs
- user requirements for `Мир кино` and `Наука и природа`

Work performed:

- Cleaned the most visible AI-like repeated series in `words_society.json`.
- Added `tools/build_new_dictionaries.mjs`.
- Generated `words_cinema.json` with `800` cards.
- Generated `words_science.json` with `700` cards.
- Initially kept both new dictionaries hidden by preserving `available: false` in `dictionaries.json`; later changed in section 15.
- Did not change UI, Worker access rules, payments, products, or D1 schema.

Findings:

- The new dictionaries needed multiple pool expansions because exact-overlap filtering correctly removed many reused generic cards.
- `Мир кино` initially had overly mechanical repeated heads; those were reduced by replacing template-like formulations with more varied manual cards.
- The remaining `9` exact intersection groups are pre-existing intersections among old dictionaries, not introduced by `cinema` or `science`.

Next step:

- Run final technical audit and docs sync.

## 10. Dictionary Quality Reviewer

Agent: Dictionary Quality Reviewer
Verdict: pass

Input reviewed:

- `words_cinema.json`
- `words_science.json`
- `words_society.json`
- `DICTIONARY_AUDIT_REPORT.md`

Work performed:

- Checked final audit results for counts, long phrases, internal duplicates, and cross-dictionary intersections.
- Reviewed repeated-head findings and routed the first cinema generation back for additional de-templating.

Findings:

- `words_cinema.json`: `800` cards, all 9 buckets present, no internal duplicate groups, no cards longer than `4` words.
- `words_science.json`: `700` cards, all 9 buckets present, no internal duplicate groups, no cards longer than `4` words.
- New dictionaries did not add exact intersections with existing dictionaries.

Next step:

- Game-fit review and JSON validation.

## 11. Game Fit Reviewer

Agent: Game Fit Reviewer
Verdict: pass

Input reviewed:

- Generated cinema/science dictionaries.
- User examples for cinema: Белоснежка, Джек Воробей, Голлум, Хоббит, Гэндальф, Гермиона, Гарри Поттер, Джон Сноу, Мстители, Кунг-фу Панда, золотое кольцо, Око Саурона, волшебная палочка, звездолет, щит Капитана Америки.

Work performed:

- Checked that `DRAW` cards are visual objects, characters, props, or scenes.
- Checked that `ACT` cards are showable actions or mini-scenes.
- Checked that `EXPLAIN` cards are explainable terms, names, genres, stories, or recognizable concepts.

Findings:

- `Мир кино` emphasizes broad recognition and playable images rather than niche film knowledge.
- `Наука и природа` emphasizes everyday nature, animals, body, weather, space, simple science, tools, and experiments rather than specialist terminology.

Next step:

- JSON validation.

## 12. JSON Validation

Agent: JSON Validation
Verdict: pass

Input reviewed:

- `dictionaries.json`
- `words.json`
- `words_geo.json`
- `words_society.json`
- `words_around_us.json`
- `words_cinema.json`
- `words_science.json`
- `tools/dictionary_audit.mjs`
- `tools/build_new_dictionaries.mjs`

Work performed:

- Ran syntax checks for dictionary tools.
- Parsed all dictionary JSON files.
- Ran full dictionary audit over all 6 dictionary files.
- Updated `DICTIONARY_AUDIT_REPORT.md`.

Findings:

- Existing dictionary files audited: `6`.
- Existing cards audited: `5632`.
- Unique normalized card texts: `5623`.
- Duplicate/intersection groups: `9`, all pre-existing old-dictionary intersections.
- Planned dictionary files missing: `0`.
- Every catalog `wordCount` matches the real card count.
- Long cards over `4` words: `0` in every dictionary.
- Internal duplicate groups: `0` in every dictionary.

Commands run:

```bash
node --check tools/dictionary_audit.mjs
node --check tools/build_new_dictionaries.mjs
node tools/build_new_dictionaries.mjs
node tools/dictionary_audit.mjs
node tools/dictionary_audit.mjs --write DICTIONARY_AUDIT_REPORT.md
node -e "...parse all dictionary json files..."
```

Next step:

- Docs sync and release check.

## 13. Docs Sync

Agent: Docs Sync
Verdict: pass

Input reviewed:

- `README.md`
- `PROJECT_KNOWLEDGE_BASE.md`
- `RECENT_PROJECT_CHANGES.md`
- `DICTIONARY_REWORK_PLAN.md`
- `DICTIONARY_EDITORIAL_REVIEW.md`
- `DICTIONARY_BLUEPRINT_CINEMA_SCIENCE.md`

Work performed:

- Updated docs to say `words_cinema.json` and `words_science.json` now exist locally.
- Initially documented that both new dictionaries remained `available: false`; later changed in section 15.
- Documented final audit status and the new generator tool.
- Kept deployment/access claims conservative.

Findings:

- No docs now claim the new dictionaries are published.
- At that stage, no D1, Worker, payment, or secret follow-up was required for the hidden-dictionary data pass.

Next step:

- Release manager final review.

## 14. Release Check

Agent: Release Manager
Verdict: pass

Input reviewed:

- Final audit output.
- Changed dictionary and documentation files.

Work performed:

- Confirmed this task is data/docs/tooling only.
- Confirmed no frontend runtime, Worker, D1 schema, or payment code was changed in this implementation pass.
- Confirmed at that stage that `cinema` and `science` remained hidden in catalog metadata; later changed in section 15.

Findings:

- Ready for local handoff.
- Publishing the new dictionaries later will require a separate decision about `available`, `access`, and, if premium, Worker purchase/access handling.

Next step:

- Hand back summary to user.

## 15. Open New Dictionaries As Free

Agent: Dictionary Editor
Verdict: pass

Input reviewed:

- `AGENTS.md`
- `dictionaries.json`
- `src/worker.js` access checks
- `script.js` dictionary card rendering

Work performed:

- Changed `cinema` from hidden to open: `available: true`, `access: free`.
- Changed `science` from hidden to open: `available: true`, `access: free`.
- Updated documentation to stop describing these dictionaries as hidden or unavailable.

Findings:

- Worker blocks unavailable dictionaries and premium dictionaries without access.
- Since both new dictionaries are now `access: free`, no D1 purchase/access rows or premium product config are needed.
- This change does not touch UI layout, payment code, D1 schema, or dictionary word files.

Next step:

- Validate JSON and audit report, then commit/push this follow-up change.

## 16. Temporary Free Access Model For All Dictionaries

Agent: Dictionary Editor
Verdict: pass

Input reviewed:

- `dictionaries.json`
- `script.js` dictionary card rendering
- `src/worker.js` dictionary access checks
- dictionary docs and access/offer pages

Work performed:

- Set all dictionaries to `access: free`.
- Kept the top row open without auth: `classic`, `geo`, `society`.
- Set the bottom row to free after login: `around_us`, `cinema`, `science` via `authAccess: "login"`.
- Removed active price labels from dictionary metadata.
- Updated user-facing and project docs to describe the temporary free model.

Findings:

- Worker already enforces `authAccess: "login"` before serving protected dictionary JSON.
- The existing premium/payment code can remain dormant for the future paid model because no active dictionary has `access: "premium"`.

Next step:

- Validate catalog JSON, run dictionary audit, and push the access-model change.

## 17. Follow-up Validation, Cinema and Science Accessibility

Agent: Dictionary Quality Reviewer
Verdict: pass

Input reviewed:

- `DICTIONARY_RULES.md`
- `dictionaries.json`
- `words_cinema.json`
- `words_science.json`
- `.agent-pipeline/QUALITY_GATES.md`

Work performed:

- Rechecked the newly released cinema/science dictionaries for misleading metadata, excessive difficulty, AI-like abstract phrasing, repeated action tails, JSON validity, exact duplicates, phrase length, and `wordCount` consistency.
- Removed the misleading `Мир кино` catalog promise about `режиссёры`: the dictionary contains the basic filmmaking role `режиссер`, but no broad set of famous director names.
- Reworded several cinema `EXPLAIN` cards that were too abstract or trope-glued.
- Replaced a repetitive cinema `ACT-5` tail built from `спасать/искать/терять/прятать`.
- Reworded several science cards that were too specialist or artificial for broad play.
- Replaced repetitive science `DRAW-5` and `ACT-5` tails with more visual and actable nature/science scenes.

Findings:

- `Мир кино` should stay focused on films, characters, genres, recognizable objects, and scenes, not director-name knowledge.
- `Наука и природа` can keep some level-5 science concepts, but the cards should remain explainable through common school/life associations rather than niche terminology.
- Remaining exact cross-dictionary intersections do not involve `words_cinema.json` or `words_science.json`.

Next step:

- If these changes are accepted, commit, push, and deploy from a clean worktree because Cloudflare assets are deployed from the whole repository directory.

Agent: JSON Validation
Verdict: pass

Input reviewed:

- `dictionaries.json`
- `words_cinema.json`
- `words_science.json`
- `tools/dictionary_audit.mjs`

Work performed:

- Parsed changed JSON files with Node.
- Checked all catalog `wordCount` values against real card counts.
- Checked new dictionaries for internal exact duplicates.
- Checked new dictionaries for phrases with `5+` words.
- Ran `node tools/dictionary_audit.mjs`.

Findings:

- JSON parse: pass.
- Catalog counts: pass for all six dictionaries.
- `words_cinema.json`: `800` cards, `0` internal duplicates, `0` phrases with `5+` words.
- `words_science.json`: `700` cards, `0` internal duplicates, `0` phrases with `5+` words.
- Cross-dictionary intersections remain at `9`, all pre-existing among `classic`, `geo`, and `society`.

Next step:

- Release Manager should review the final scoped diff and decide whether to deploy.

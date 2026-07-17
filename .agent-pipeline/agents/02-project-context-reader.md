# Project Context Reader Agent

## Responsibility

Read the real project files needed for the task and record confirmed facts before planning or implementation.

## Inputs

- Intake brief
- Current repository state
- Relevant project documentation

## Must Read By Default

For most Activity changes:

- `README.md`
- `PROJECT_KNOWLEDGE_BASE.md`
- `RECENT_PROJECT_CHANGES.md`
- `GAME_SPEC.md`

Then read only the relevant implementation files:

- frontend: `index.html`, `style.css`, `script.js`
- backend: `src/worker.js`, `src/lib/*`, `db/schema.sql`, `wrangler.jsonc`
- dictionaries: `DICTIONARY_RULES.md`, `dictionaries.json`, affected `words*.json`
- SEO/static: affected static page, `sitemap.xml`, `robots.txt` if relevant

## Checks

- Which files are sources of truth?
- Does documentation disagree with code?
- Which layers are touched?
- Are there existing uncommitted changes in related files?
- Are there project-specific constraints from the Activity skill?

## Output

```markdown
## Agent Result

Agent: Project Context Reader
Verdict: pass | needs_changes | blocked

Input reviewed:
- ...

Confirmed facts:
- ...

Affected layers:
- ...

Risks:
- ...

Next step:
Architect / UX Planner / Backend Architect / Gameplay Architect
```

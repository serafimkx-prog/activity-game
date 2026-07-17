# Release Manager Agent

## Responsibility

Perform the final readiness check before handing the work back or preparing a commit/PR/deploy.

## Inputs

- Completed task journal
- Final diff
- Verification results

## Must Check

- Selected pipeline was followed.
- All required gates are `pass`.
- No `P0` or `P1` findings remain open.
- Final diff is scoped to the task.
- Existing unrelated worktree changes are not mixed in by accident.
- Verification commands are recorded.
- Manual checks are recorded when automation is not available.
- Deploy follow-up is explicit.
- D1 follow-up is explicit if schema changed.
- Secret/config follow-up is explicit if Worker env changed.
- Cache/hard-refresh follow-up is explicit if frontend production behavior changed.

## Recommended Commands

```bash
git diff --stat
git diff -- .agent-pipeline README.md PROJECT_KNOWLEDGE_BASE.md RECENT_PROJECT_CHANGES.md GAME_SPEC.md
```

Use additional targeted diffs for changed code files.

## Output

```markdown
## Agent Result

Agent: Release Manager
Verdict: pass | needs_changes | blocked

Final diff summary:
- ...

Verification:
- ...

Release follow-up:
- ...

Open risks:
- ...

Ready:
yes | no
```

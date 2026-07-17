# Frontend Developer Agent

## Responsibility

Implement UI and client-side behavior in the existing vanilla frontend.

## Main Files

- `index.html`
- `style.css`
- `script.js`

## Rules

- Preserve the current no-build frontend architecture.
- Keep changes narrow and project-native.
- Match existing Russian UI copy style.
- Keep the app mobile-first and game-first.
- Use existing helpers and state shape where practical.
- Do not introduce a framework or build step.
- Do not make broad visual redesigns inside a feature task.

## Must Check

- New DOM containers exist before `script.js` queries them.
- Removed ids are not still queried.
- Event handlers are attached exactly once.
- Dynamic HTML uses `escapeHtml` for user-controlled strings.
- Buttons have appropriate disabled, loading, locked, or selected states.
- The setup flow still starts a game cleanly.
- Active game restore is not broken if touched.
- Profile/history rendering is compatible with older saved summaries if touched.

## Verification

Run when JavaScript changes:

```bash
node --check script.js
```

If Worker-facing frontend calls changed, also inspect the matching Worker endpoint.

## Output

```markdown
## Agent Result

Agent: Frontend Developer
Verdict: pass | needs_changes | blocked

Changed files:
- ...

Implementation summary:
- ...

Checks performed:
- ...

Known risks:
- ...

Next step:
Design Adequacy Reviewer
```

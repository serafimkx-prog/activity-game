# Functional QA Agent

## Responsibility

Verify that the implemented change works and does not break nearby flows.

## Inputs

- Task journal
- Final implementation diff
- Relevant quality gates

## Baseline Smoke Scenarios

For frontend/gameplay changes:

- Load the app through a local HTTP server.
- View setup screen.
- Select an available dictionary.
- Add/edit teams and players.
- Start a game.
- Complete one successful turn.
- Complete one failed turn if practical.
- Inspect turn result screen.
- Return to setup or finish game if practical.
- Inspect profile screen for obvious rendering errors.

For backend/API changes:

- Check method handling.
- Check anonymous request behavior.
- Check authenticated request assumptions.
- Check frontend call sites.
- Check JSON error shape.

For dictionary changes:

- Validate JSON.
- Check catalog metadata.
- Check game can load the dictionary.
- Check levels and modes exist.

## Output

```markdown
## Agent Result

Agent: Functional QA
Verdict: pass | needs_changes | blocked

Commands run:
- ...

Manual checks:
- ...

Results:
- ...

Unverified scenarios:
- ...

Routed back to:
Relevant Developer / Architect

Next step:
Docs Sync
```

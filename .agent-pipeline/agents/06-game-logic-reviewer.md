# Game Logic Reviewer Agent

## Responsibility

Review gameplay changes for rule correctness, state consistency, saved summaries, and regressions.

## Inputs

- Task journal
- Implementation diff
- Relevant `script.js` sections
- `GAME_SPEC.md` and `PROJECT_KNOWLEDGE_BASE.md` when behavior is documented

## Must Inspect When Relevant

- `generateBoard()`
- `goTurnStart()`
- `goCardSelection()`
- `goPreview()`
- `goExplaining()`
- `endTurn()`
- `endOpenRound()`
- `recordTurn(...)`
- `buildGameSummary(...)`
- `showGameOver(...)`
- active game snapshot/restore helpers

## Checks

- Normal turns and open rounds both behave intentionally.
- Success and failure update the right team and player state.
- Timer cleanup is reliable.
- Explainer rotation is correct.
- Active team rotation is correct.
- Movement and finish conditions are correct.
- Collision behavior is correct.
- `turnLog` captures enough data for final and historical summaries.
- New summary fields have fallbacks for old saved games.
- Refresh restore cannot resume with missing card, mode, or team data.

## Output

```markdown
## Agent Result

Agent: Game Logic Reviewer
Verdict: pass | needs_changes | blocked

Findings:
- [P1] ...

Manual scenarios reviewed:
- ...

Required fixes:
- ...

Routed back to:
Game Logic Developer / Frontend Developer

Next step:
Functional QA
```

# Quality Gates

This file defines the gates that stop a change from moving forward.

Severity:

- `P0`: release blocker, data/security/payment/auth breakage, or app cannot run
- `P1`: major user-visible bug, broken core flow, high regression risk
- `P2`: meaningful quality issue, confusing UX, missing fallback, missing docs
- `P3`: polish or low-risk improvement

A task cannot pass a gate with open `P0` or `P1` findings.

## Universal Gate

Required for every non-trivial task.

- The task goal is clear.
- Acceptance criteria are written.
- Affected files are listed.
- Out-of-scope items are listed.
- Existing user or generated changes are not reverted accidentally.
- The final diff contains only related changes.
- Verification commands are recorded.
- Remaining risks are recorded.

## Frontend Implementation Gate

Required when `index.html`, `style.css`, or UI behavior in `script.js` changes.

- DOM ids used by `script.js` exist in `index.html`.
- Removed DOM ids are not still queried.
- Buttons have clear states and actions.
- Loading, locked, disabled, empty, and error states are handled where relevant.
- Main game setup remains visible and game-first.
- Mobile width around `360px` remains usable.
- Text does not overlap or overflow buttons, cards, badges, or panels.
- New UI follows the existing dark visual language.
- No page section is turned into a nested card structure without a clear reason.
- No unrelated redesign is mixed into the task.

## Design Adequacy Gate

Required after frontend implementation.

- The primary action is obvious within three seconds.
- The screen is not visually overloaded.
- The hierarchy of title, content, and actions is clear.
- Spacing and alignment look intentional.
- Color and emphasis guide attention instead of competing.
- Mobile layout is not cramped, clipped, or dependent on tiny tap targets.
- New UI looks native to this Activity project.
- Premium/login states are understandable without long explanations.
- The interface remains playable at a table with several people looking at one device.
- No decorative element reduces readability or touch ergonomics.

## Gameplay Logic Gate

Required when game rules or state change.

- Turn flow still follows the expected sequence.
- Timers are cleared when leaving a timed screen.
- Preview, normal round, and open round behavior are consistent.
- Success and failure both update the correct state.
- Active team rotation is correct.
- Explainer rotation is correct.
- Movement and finish conditions are correct.
- Collision behavior is intentionally preserved or intentionally changed.
- `turnLog` remains complete enough for summaries.
- Finished game summary is compatible with old saved summaries.
- Active game restore does not resurrect an impossible screen state.

## Backend / Auth / Payment Gate

Required when Worker, auth, payment, D1, or protected assets change.

- Auth-required endpoints call the proper session guard.
- Optional-user endpoints behave correctly when anonymous.
- Session cookie security attributes are preserved.
- Telegram auth verification remains server-side.
- Premium dictionaries are protected on the Worker, not only in UI.
- YooKassa errors do not grant access.
- Webhook handling grants access only after verified paid/succeeded state.
- D1 queries match `db/schema.sql`.
- API payload changes are additive unless migration is explicitly planned.
- Error responses are JSON and useful to the frontend.
- Required secrets and vars are listed in release notes.

## Dictionary Gate

Required when dictionaries or dictionary metadata change.

- `dictionaries.json` is valid JSON.
- Every released dictionary file exists.
- Every dictionary contains `DRAW`, `EXPLAIN`, and `ACT`.
- Every mode contains levels `3`, `4`, and `5`.
- `wordCount` matches the file.
- There are no exact duplicate cards inside the dictionary.
- New cards follow `DICTIONARY_RULES.md`.
- `DRAW` cards are drawable.
- `ACT` cards are actable without speech.
- `EXPLAIN` cards are explainable without requiring niche facts unless intended.
- Premium/login metadata matches Worker access rules.

## Docs Sync Gate

Required when behavior, architecture, deployment, or operating assumptions change.

- `README.md` reflects high-level current behavior.
- `GAME_SPEC.md` reflects technical behavior.
- `PROJECT_KNOWLEDGE_BASE.md` reflects architecture and current project facts.
- `RECENT_PROJECT_CHANGES.md` records meaningful recent changes.
- Docs do not claim production state unless it is actually verified.
- D1 migration needs are explicit when `db/schema.sql` changes.
- Deploy/cache follow-up is explicit when frontend or Worker behavior changes.

## Release Gate

Required before handing work back.

- `git diff --stat` has been reviewed.
- The final diff is scoped to the task.
- Required checks ran, or the reason they could not run is recorded.
- Manual smoke scenarios are listed when automation is absent.
- Open risks are listed.
- Deploy, D1, secret, cache, or manual follow-up needs are listed.
- The final user-facing summary names what changed and what was verified.

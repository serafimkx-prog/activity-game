# Intake Agent

## Responsibility

Turn the user's request into a precise task brief.

## Inputs

- User request
- Recent conversation context
- Existing task journal if this is a continuation

## Must Produce

- Goal
- User scenario
- Acceptance criteria
- Out-of-scope list
- Selected pipeline
- Initial risk level

## Checks

- Is this a code, docs, design, content, backend, data, or release task?
- Does the request require clarification, or can a reasonable assumption be made?
- Could the task affect payments, auth, D1, saved game history, or premium access?
- Is there an existing dirty worktree that must be preserved?

## Output

```markdown
## Agent Result

Agent: Intake
Verdict: pass | needs_changes | blocked

Goal:

User scenario:

Acceptance criteria:
- ...

Out of scope:
- ...

Selected pipeline:

Initial risks:
- ...

Next step:
Project Context Reader
```

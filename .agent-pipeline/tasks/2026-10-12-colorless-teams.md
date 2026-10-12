# Colorless Team Identities

## 1. Intake

Agent: Art Direction / Frontend
Verdict: pass

Goal: remove assigned team colors from every visible surface while preserving the accepted navy/purple art direction and the existing name/icon dice behavior.

Acceptance criteria:

- all 24 prepared names are short, unique, icon-matched, and contain no color adjective;
- setup cards, name focus, add/remove controls, turn badges, board tokens/labels, position chips, open-round choices, and history metrics do not use a team-assigned color;
- the visible identity is always local Twemoji plus the team name;
- six active teams have six unique names and icons; dice changes both fields with no immediate repeat;
- old active-game snapshots restore with a name/icon fallback;
- legacy `color` may remain in state only for backward compatibility and is never rendered;
- desktop and mobile setup plus a live turn render without overflow, missing icons, runtime errors, or sub-44px interactive controls;
- no Worker, D1, payment, deploy, or production changes.

## 2. Impact map

Visible color dependencies found before implementation:

1. setup name focus used `--team-color` injected on every team card;
2. turn/card/preview badges received `team.color` as an inline background;
3. board tokens were plain circles filled with `team.color`;
4. board labels set the team symbol color inline;
5. explaining-screen position chips used colored dots and selected borders;
6. open-round team choices used a green success-button treatment instead of the shared team identity language;
7. history mode-progress rings inherited `team.color`;
8. setup pools and state variables were named around colors even when their actual responsibility was identity selection.

## 3. Implementation

- Renamed the six internal pools to identity slots and replaced all 24 color-qualified names with unique friendly nouns.
- Replaced setup color hooks with one neutral navy/focus treatment.
- Replaced board color dots with the same local Twemoji identity used in setup.
- Rendered turn badges, position chips, open-round choices, board labels, and history metrics in shared neutral styling.
- Added `identitySlot` to new team state and robust fallback selection for old snapshots; exact legacy preset names are migrated to their current colorless name while custom names remain untouched.
- Retained `LEGACY_TEAM_COLORS` and `team.color` only as non-visual compatibility data.
- Extended smoke checks and Chromium render checks to assert identity uniqueness, absence of visible legacy color styles, loaded game icons, and setup/game evidence.

## 4. Verification

Automated checks:

- `node.exe tools/smoke_check.mjs` — `Smoke check passed: 317 assertions`;
- `git diff --check 022720c..HEAD` — no output;
- Node syntax checks are included in smoke for frontend and unchanged Worker sources.

Real Chromium CDP at `1440 × 1200` and `390 × 844`:

- desktop setup: 3 dictionary columns, 2 team columns; mobile setup: 2 dictionary columns, 1 team column;
- no horizontal overflow, overflow elements, runtime console/exception issues, or visible controls below 44px;
- keyboard focus traversal succeeded;
- dice changed name and icon together; six-team state had six unique names and six unique icons;
- `setupUsesTeamColorStyle: false` and live-game `visibleInlineColorRefs: []`;
- old color-qualified snapshot identity migrated to `Слоники` + `elephant` with players preserved;
- live game reached `screen-turn-start`; 13 rendered team images (badge, labels, tokens) all loaded;
- visual inspection confirmed six separately readable name/icon labels and six distinct emoji markers on the shared start cell.

Evidence outside the repository:

- `C:\Users\Админ\Projects\activity-game-colorless-teams-evidence\desktop-1440-teams.png`;
- `C:\Users\Админ\Projects\activity-game-colorless-teams-evidence\desktop-1440-game.png`;
- `C:\Users\Админ\Projects\activity-game-colorless-teams-evidence\mobile-390-teams.png`;
- `C:\Users\Админ\Projects\activity-game-colorless-teams-evidence\mobile-390-game.png`;
- viewport and full-page setup captures are in the same folder.

## 5. Release status

- Production deploy: not performed.
- Push: not performed.
- Worker/D1/payment code: unchanged.

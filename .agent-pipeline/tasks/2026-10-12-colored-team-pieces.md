# Colored Team Pieces

## 1. Intake

Agent: Art Direction / Frontend
Verdict: pass

Goal: replace rejected team emoji identities with familiar fixed-color game pieces without reintroducing colored cards, side rails, or full-color badges.

Acceptance criteria:

- team emoji do not appear in setup, turn badges, board labels/cells, open-round choices, positions, history, or game over;
- six fixed, contrast-safe team colors are shown only as compact circular pieces beside the team name;
- setup cards and turn badges stay neutral navy, with no color picker or colored side rail;
- the board places 2–6 colored pieces next to each other on a shared cell, including all six on Start;
- 24 names remain free of color adjectives; dice changes only the name and never repeats immediately;
- the six preset pools do not overlap, so generated names remain unique in a six-team game;
- new state stores name, fixed color, and identity slot without depending on `iconId`;
- old snapshots restore, migrate exact legacy color-qualified preset names, and ignore any old team `iconId` in rendering;
- unused team-only Twemoji SVGs are removed while dictionary artwork, dice control, attribution, and license remain;
- desktop/mobile setup and game renders pass console, overflow, touch, focus, and asset checks;
- Worker, D1, payment, production, and deploy remain untouched.

## 2. Implementation

- Replaced `TEAM_IDENTITY_PRESETS` with six non-overlapping `TEAM_NAME_PRESETS` pools and restored the stable six-color `TEAM_COLORS` palette.
- Added one reusable `teamMarker()` primitive: a small colored circle with a light outline and shadow that stays visually attached to the team name.
- Applied the marker to setup, turn/card/preview badges, board labels, open-round choices, position chips, history team headers, winner heading, and final score rows.
- Restored simple circular board pieces; shared-cell layout uses flex wrapping, including six pieces on Start.
- Removed team icon mapping, helper, CSS, and `iconId` from newly created team state. Old snapshot fields are tolerated through object spread but never read by rendering.
- Removed 29 unused team/source Twemoji SVG files. `assets/twemoji/1f3b2.svg`, the six renamed dictionary assets, attribution, and the CC-BY license remain.
- Expanded smoke and Chromium behavior checks for 2–6 teams, unique names/colors, legacy migration, no team emoji image, neutral badge fill, and six pieces sharing Start.

## 3. Verification

Automated checks:

- `node.exe tools/smoke_check.mjs` — `Smoke check passed: 320 assertions`;
- `git diff --check da806b9..HEAD` — no output after commit;
- smoke includes syntax checks and verifies that the only SVG left in `assets/twemoji/` is the dice control.

Real Chromium CDP at `1440 × 1200` and `390 × 844`:

- no horizontal overflow, overflow elements, runtime console/exception issues, or interactive controls below 44px;
- keyboard focus traversal succeeded;
- setup starts with two teams and no remove control; remove from six produced five and add restored six;
- dice changed the name and kept the assigned color;
- six teams had six unique generated names and six unique colors before and after remove/add;
- setup and live game both reported `teamEmojiImageCount: 0`; new state reported `newStateUsesTeamEmoji: false`;
- live board rendered six pieces with six colors, and all six shared the Start cell without overlap collapse;
- turn badge retained its neutral background (`badgeUsesTeamFill: false`);
- legacy color-qualified snapshot migration and a snapshot missing name/color both restored through their fallbacks;
- visual review confirmed that the outlined circles read as game pieces attached to names, while cards and badges remain neutral navy.

Contrast note:

- on live badge/board-label navy (`#16213e`), all six fills range from `4.02:1` to `6.98:1`;
- setup uses a lighter navy card, where the purple fill alone is `2.87:1`, but every piece has a persistent 2px near-white boundary, preserving a clear non-text edge against the card.

Evidence outside the repository:

- `C:\Users\Админ\Projects\activity-game-colored-pieces-evidence\desktop-1440-teams.png`;
- `C:\Users\Админ\Projects\activity-game-colored-pieces-evidence\desktop-1440-game.png`;
- `C:\Users\Админ\Projects\activity-game-colored-pieces-evidence\mobile-390-teams.png`;
- `C:\Users\Админ\Projects\activity-game-colored-pieces-evidence\mobile-390-game.png`;
- viewport and full-page setup captures are in the same folder.

## 4. Release status

- Production deploy: not performed.
- Push: not performed.
- Worker/D1/payment code: unchanged.

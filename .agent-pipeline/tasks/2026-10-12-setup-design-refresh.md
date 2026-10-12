# Setup Design Refresh

## 1. Intake

Agent: Intake
Verdict: pass

Goal: Make the game setup screen friendlier, more playful, compact, and visually consistent without changing gameplay or payment rules.

User scenario: A group opens Activity on a phone or desktop, quickly chooses a dictionary, gives the teams memorable identities, adjusts the few game settings, and starts playing.

Acceptance criteria:

- setup uses a friendly purple visual language with clear contrast and no ornamental color noise;
- dictionary cards are 3x2 on desktop and responsive on narrow screens;
- dictionary badges and actions accurately distinguish classic, login-free, and paid access;
- guest premium CTA says `Купить`, leads to Telegram login first, and never starts payment before authentication;
- every dictionary has a unique local SVG asset, independent of platform emoji rendering;
- every supported team color has prepared name/icon pairs; dice changes both while excluding the current pair;
- team color remains fixed, the identity persists into the game state, and player inputs remain editable;
- redundant `Игроки` label is removed; controls are aligned and at least 44px where used by touch;
- requested title and two-line intro copy are present;
- motion is small, purposeful, and disabled by `prefers-reduced-motion`;
- rendered desktop 1440 and iPhone-size QA has no overflow, console error, broken SVG, or inaccessible keyboard focus.

Out of scope:

- production deploy;
- Worker, D1, payment, authentication, scoring, board, and history contract changes;
- redesign of rules, profile, gameplay, or SEO pages beyond shared color tokens that are needed for visual consistency.

Relevant pipeline: UI / Frontend.

## 2. Project Context

Agent: Project Context Reader
Verdict: pass

Files reviewed:

- `AGENTS.md`, `.agent-pipeline/AGENT_PIPELINE.md`, `.agent-pipeline/QUALITY_GATES.md`;
- canonical Activity `README.md`, `architecture.md`, `decisions.md`, `roadmap.md`, `journal.md`;
- `index.html`, `style.css`, `script.js`, `dictionaries.json`;
- `README.md`, `GAME_SPEC.md`, `PROJECT_KNOWLEDGE_BASE.md`, `RECENT_PROJECT_CHANGES.md`;
- Activity project skill and `references/project-map.md`.

Confirmed facts:

- frontend is plain HTML/CSS/JS without a build step;
- six dictionaries are live: classic, two login-free, and three paid;
- setup currently uses a nearly black palette and a 2-column dictionary grid;
- backend already prevents anonymous checkout creation and protects dictionary assets;
- team state already stores arbitrary extra properties safely in active-game snapshots.

Existing constraints:

- keep the screen game-first and mobile-first;
- preserve all auth/payment and gameplay contracts;
- avoid frameworks, new dependencies, external asset CDNs, and unclear licenses.

Initial risks:

- nested dictionary card actions can produce ambiguous keyboard behavior;
- removing a team can reassign its color, so identity presets must follow a stable color index;
- external SVG sprites need real-browser verification, especially in mobile viewport rendering.

## 3. Plan

Agent: UX Planner
Verdict: pass

Affected layers: Gameplay/UI and documentation only.

Affected files:

- `index.html`, `style.css`, `script.js`, `dictionaries.json`;
- local SVG assets under `assets/`;
- relevant source-of-truth docs and this journal.

Implementation plan:

1. Restore an intentional purple/navy palette and widen only setup enough for a 3-column dictionary grid.
2. Replace runtime emoji dictionary metadata with six local SVG illustrations.
3. Make dictionary cards explicit action groups with top-right access markers and no hidden whole-card action.
4. Add stable team color indices plus color-specific name/icon preset pools and a dice control.
5. Persist the selected team icon in live game state and show it in the existing team badges/board labels.
6. Tighten team controls, touch targets, copy, focus, hover, selected, and reduced-motion states.
7. Run syntax/source/smoke checks and render at desktop and iPhone viewports.

Rollback plan: Revert the single feature commit; no backend, database, config, or production state changes are involved.

## 4. Implementation

Agent: Frontend Developer
Verdict: pass

Changed files:

- `index.html`, `style.css`, `script.js`, `dictionaries.json`;
- six SVG files in `assets/dictionary-icons/` and one local team icon sprite;
- `tools/setup_render_check.mjs`;
- `README.md`, `GAME_SPEC.md`, `PROJECT_KNOWLEDGE_BASE.md`, `RECENT_PROJECT_CHANGES.md`.

Implementation summary:

- restored a deliberate purple/navy theme and compact desktop setup layout;
- changed the visible title and intro copy exactly to the approved short form;
- implemented explicit dictionary access markers/actions and a login-first guest purchase path;
- replaced dictionary emoji metadata with unique local SVG assets;
- added four prepared name/icon pairs for each of the six team colors;
- kept color identity stable when teams are added or removed, persisted `iconId` in live game state, and provided a fallback for older snapshots;
- removed the redundant player heading and aligned setup controls to 44px minimum touch targets;
- added only a short dice feedback animation and a reduced-motion override.

Important decisions:

- cards are action groups, not whole-card pseudo-buttons with nested buttons; this keeps keyboard behavior explicit;
- `Купить` for a guest only opens the profile/login screen; checkout creation remains behind authentication and a second explicit click;
- dictionary icons are six standalone SVG files while team icons share one local SVG sprite to avoid 24 network files;
- SEO identity remains `Активити Онлайн`; only the game-screen heading becomes the shorter `Активити`.

Known risks:

- production is unchanged until the owner approves a deploy;
- `color-mix()` is progressive enhancement: explicit background/border fallbacks preserve the component in browsers without support.

### Reference matrix

| Official reference | Principle adopted | Deliberately not copied |
| --- | --- | --- |
| [Gartic Phone](https://garticphone.com/en/) | Playful identity and a short, obvious room-entry action; generated nickname/character pairing supports the team dice concept. | Characters, illustration language, branding, room layout, and assets. |
| [Board Game Arena](https://en.boardgamearena.com/) | Browser-first, cross-device access and a direct path from configuration to play. | Dense game catalog, ranking mechanics, information architecture, and visual assets. |
| [Kahoot team experience](https://support.kahoot.com/hc/en-us/articles/35636870654867-Kahoot-experiences) | Strong shared-screen team identity and clear separation between mode choice and the main start action. | Classroom framing, proprietary characters, game modes, and subscription presentation. |
| [Kahoot live settings](https://support.kahoot.com/hc/en-us/articles/115016055107-Live-game-settings) | Randomization and game characters are optional controls; settings stay subordinate to starting the session. | Settings density, gear-menu structure, and decorative game-mode effects. |

## 5. Specialist Review

Agent: Design Adequacy Reviewer
Verdict: pass

Findings:

- initial render exposed undersized 22px dictionary info targets, a 6px range target, 36px desktop navigation buttons, and 19px SEO links;
- the first raw headless mobile screenshot used Chrome's minimum window layout and was not acceptable as responsive evidence, so QA moved to CDP device emulation with explicit DOM metrics;
- the initial title shadow looked less controlled than the rest of the screen and was replaced with a simple purple underline.

Required fixes: all resolved. Final measured visible controls are at least 44px, keyboard-focusable, and the final renders have no horizontal overflow.

Optional polish: broader gameplay/profile visual harmonization can be a later batch; it is not mixed into this setup-focused release.

Routed back to: Frontend Developer, then re-reviewed and passed.

## 6. Functional QA

Agent: Functional QA
Verdict: pass

Checks performed:

- Node 24 syntax for `script.js` and unchanged `src/worker.js`;
- source smoke: 309 assertions;
- served frontend smoke: 333 assertions;
- desktop CDP render at `1440 × 1200`;
- iPhone-size CDP render captured at `390 × 844`;
- DOM metrics for columns, overflow, loaded SVGs, runtime errors, focusability, and control sizes;
- interaction test for dice, six team colors, guest premium CTA, real mouse start, and live-state icon persistence;
- JSON metadata check and `git diff --check`.

Results:

- desktop uses 3 dictionary columns and 2 team columns; mobile uses 2 and 1;
- no horizontal overflow and no runtime console/exception issue;
- all six dictionary SVGs load;
- every visible interactive target measures at least 44px and accepts keyboard focus;
- dice changes both name and icon without retaining the previous pair;
- six teams have six unique colors and complete identities;
- guest `Купить` lands on `screen-profile`;
- real start reaches `screen-turn-start` with all six `iconId` values persisted.

Rendered evidence (kept outside the repository):

- `C:\Users\Админ\Projects\activity-game-design-evidence\desktop-1440.png`;
- `C:\Users\Админ\Projects\activity-game-design-evidence\iphone-390.png`.

Regressions found: none after fixes.

Unverified scenarios: authenticated production checkout was not exercised because payment/auth/backend are out of scope and production mutation is forbidden for this batch. The unchanged backend guard and the frontend authenticated branch were reviewed in code.

## 7. Docs Sync

Agent: Docs Sync
Verdict: pass

Docs reviewed: `README.md`, `GAME_SPEC.md`, `PROJECT_KNOWLEDGE_BASE.md`, `RECENT_PROJECT_CHANGES.md`.

Docs changed: setup grid, local icon assets, dictionary actions, login-first purchase behavior, team identity presets, state persistence, and QA evidence were documented.

Docs not changed because: Worker/D1/payment architecture and production state did not change.

## 8. Release Check

Agent: Release Manager
Verdict: pass

Diff reviewed: yes; frontend, local assets, QA tool, task journal, and truth-changing docs only.

Commands run:

- `node.exe --check script.js`
- `node.exe --check src/worker.js`
- `node.exe tools/smoke_check.mjs`
- `node.exe tools/smoke_check.mjs --base http://<local-wsl-ip>:8765`
- `node.exe tools/setup_render_check.mjs ... 390 844 ...`
- `node.exe tools/setup_render_check.mjs ... 1440 1200 ... behavior`
- dictionary icon metadata assertion
- `git diff --check`

Manual checks: visually reviewed final desktop and mobile screenshots; confirmed hierarchy, alignment, icon consistency, non-overlap, selected/login/premium states, and team controls.

Deploy follow-up: production deploy requires a separate owner gate.

D1 follow-up: none.

Secret or config follow-up: none.

Cache follow-up: hard refresh after a future deploy because frontend assets are static.

Open risks: production will continue to show the old frontend until a separately approved deploy; browser cache may require a hard refresh after that deploy.

Ready to hand back: yes, as a reviewable branch/commit; not deployed.

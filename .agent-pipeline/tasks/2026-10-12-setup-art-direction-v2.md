# Setup Art Direction V2

## 1. Intake

Agent: Intake
Verdict: pass

Goal: Replace the rejected `fc12c72` setup presentation with a calmer, friendlier, production-quality continuation of the original Activity visual language while retaining the approved access and team-identity behavior.

User scenario: A group opens the game on one shared phone or computer and can immediately understand the game, choose a dictionary, recognize access conditions, name teams, and start without the screen feeling like an admin panel.

Acceptance criteria:

- the setup is visibly rooted in the original navy/purple Activity screen, not a new global re-theme;
- `Активити Онлайн` is a confident headline with no decorative underline;
- the two requested intro sentences read as one professional lead, not tiny status copy;
- the obsolete phone information banner stays removed;
- desktop dictionaries form a breathable 3×2 grid and collapse to 2/1 columns without clipping;
- dictionary cards use familiar fixed local emoji artwork, calm navy surfaces, one clear selected state, and concise access labels/actions;
- classic has no badge; geography/society show `Бесплатно` + `Войти`; premium shows `149 ₽` + `Купить`; anonymous premium action only opens login;
- team preset/dice/stable-color/icon persistence behavior remains, but controls visually belong to the original UI and do not use cheap outline illustrations or colored side rails;
- no open P0/P1 visual or functional findings after real Chromium QA at 1440×1200 and 390×844;
- production, Worker, D1, auth, and payment backend remain untouched.

Out of scope:

- production deploy or push;
- broader rules/profile/gameplay redesign;
- payment/backend/schema/config changes;
- changing scoring, dictionaries, prices, or access rules.

Relevant pipeline: UI / Frontend.

## 2. Project Context

Agent: Project Context Reader
Verdict: pass

Files reviewed:

- `AGENTS.md`, `README.md`, `PROJECT_KNOWLEDGE_BASE.md`, `RECENT_PROJECT_CHANGES.md`;
- `.agent-pipeline/AGENT_PIPELINE.md`, `.agent-pipeline/QUALITY_GATES.md`, `.agent-pipeline/TASK_TEMPLATE.md`;
- prior task journal `.agent-pipeline/tasks/2026-10-12-setup-design-refresh.md`;
- `index.html`, `style.css`, `script.js`, `dictionaries.json` at `fc12c72`;
- baseline `c57d66d` versions of the same frontend sources;
- owner-provided original screenshot and rejected desktop/mobile render evidence.

Confirmed facts:

- the rejected change is functional but visually fails the owner's bar;
- the original used a neutral near-black page, dark navy sections/cards, purple only for active/action emphasis, larger typography, and recognizable native emoji;
- platform-consistent icons require fixed local assets rather than native emoji rendering;
- current login-first and team preset behavior can be retained without backend changes.

Existing constraints:

- plain HTML/CSS/JS, no build step or framework;
- shared-device/table-play readability matters;
- dictionary assets must be local, licensed, and independent of OS rendering;
- frontend changes require Design Adequacy and rendered QA gates.

Initial risks:

- simply reverting CSS would lose necessary team icon/control states;
- 3-column cards can become cramped if badges, metadata, and CTA all compete;
- licensed emoji attribution must ship with vendored assets;
- team identity images must load both in setup and subsequent game screens.

### Visual failure audit of `fc12c72`

1. The H1 was reduced from a strong product title to a smaller label and then given a decorative underline, weakening brand confidence.
2. The intro became small bright utility text; it competes with navigation instead of establishing a welcoming hierarchy.
3. Purple is distributed across page, sections, cards, inputs, borders, and buttons, so it no longer signals selection or action.
4. Repeated one-pixel lavender outlines around every nested surface create `card soup` and make the page resemble a settings dashboard.
5. Dictionary cards are too compressed vertically and horizontally; icon, badge, title, info dot, count, and CTA have nearly equal visual weight.
6. The custom square outline icons are visually generic, inconsistently recognizable, and much less warm than the familiar emoji in the original.
7. Tiny top-right pills (`Бесплатно`, `149 ₽`) look like dense admin tags and collide perceptually with the icon row.
8. Selected, free, and paid actions all use similar bordered rectangles, so state and next action are not distinguishable at a glance.
9. Team cards repeat the same purple nested-surface problem and reduce names to dark input bars, making team identity feel like form data.
10. The team outline sprite has the same generic line style as the rejected dictionary icons and does not deliver the requested playful identity.
11. Desktop width remains narrow while forcing three columns, causing undersized copy and excessive density instead of the original screen's breathing room.
12. On mobile, the two-column layout preserves every desktop detail at reduced size, creating long, cramped tiles whose hierarchy is weaker than the original.

## 3. Plan

Agent: UX Planner / UI Art Director
Verdict: pass

Affected layers: setup frontend, local visual assets, targeted QA, truthful documentation.

Affected files:

- `index.html`, `style.css`, `script.js`, `dictionaries.json` only where needed;
- `assets/twemoji/` plus attribution/license;
- `tools/setup_render_check.mjs` only if its assertions need to reflect the corrected UI;
- this journal and source-of-truth docs only for facts that materially change.

Implementation plan:

1. Restore the `c57d66d` page/surface/type distribution, then layer setup-specific responsive width and layout rules.
2. Vendor fixed Twemoji SVGs from a pinned upstream revision and document CC-BY 4.0 attribution.
3. Rebuild dictionary cards around one icon/title grouping, one quiet metadata line, and one clear footer action.
4. Keep current access handlers and team preset state, but replace custom icon sprite rendering with local emoji images and simplify team surfaces.
5. Restore strong title/lead/navigation proportions and remove the rejected underline.
6. Run visual polish and real browser QA, compare against both original and rejected evidence, and repeat until the result is visibly closer to the original.

Rollback plan: revert the single final commit; no backend, data, or external state changes are required.

### Visual acceptance criteria (set before implementation)

- At a glance, the eye order is: product title → short lead → navigation → dictionary section → selected/action state.
- Purple occupies a minority of the page and is reserved for active navigation, selected dictionary, and primary CTA.
- Dictionary card boundaries are legible without every internal element receiving another border.
- All six icons read immediately at normal viewing distance and retain the familiar multicolor emoji language.
- Cards have enough height for Russian titles without appearing like compressed pricing widgets.
- `Бесплатно` and `149 ₽` remain discoverable but are visually subordinate to dictionary name.
- Team identity reads as a friendly name + emoji + dice control; player entry remains secondary.
- Desktop looks composed at 1440px, mobile remains comfortable at 390px, and 360px does not require horizontal scrolling.
- Focus, hover, selected, disabled, and login-first behavior remain explicit; visible tap targets are at least 44px.
- No decorative glow, gradient, underline, or motion is present unless it communicates state.

### External reference notes

- Gartic Phone: use the principle of an immediate playful identity and a short path to play; do not copy characters or composition.
- Codenames Online: use restrained game-table hierarchy and quiet support controls; do not copy game assets or brand.
- Board Game Arena: preserve browser-first clarity and device adaptability; avoid its catalog density.
- Kahoot: use color primarily for primary actions/game identity and keep setup options subordinate; do not copy proprietary characters or answer tiles.

## 4. Implementation

Agent: Frontend Developer
Verdict: pass

Changed files:

- `index.html`, `style.css`, `script.js`;
- six dictionary SVGs in `assets/dictionary-icons/`;
- pinned Twemoji SVG subset plus `NOTICE.txt` and the complete CC-BY 4.0 license in `assets/twemoji/`;
- `tools/setup_render_check.mjs`;
- `README.md`, `GAME_SPEC.md`, `PROJECT_KNOWLEDGE_BASE.md`, `RECENT_PROJECT_CHANGES.md`;
- this task journal.

Implementation summary:

- restored the original navy/purple distribution instead of applying another global decorative theme;
- restored `Активити Онлайн`, removed the rejected underline, strengthened title/lead/navigation hierarchy, and kept the phone notice removed;
- widened only setup to 980px maximum and rebuilt dictionaries as a breathable 3×2 desktop grid with 2/1-column responsive states;
- replaced rejected hand-drawn dictionary and team pictograms with locally vendored Twemoji 17.0.3 assets; no runtime CDN is used;
- kept classic/free/premium markers and actions aligned with product rules, including login-first anonymous premium behavior;
- retained six team preset pools, stable colors, dice behavior, editable names, `iconId` persistence, and old snapshot fallback;
- simplified team cards to one navy surface with clear emoji/name/dice identity and secondary player controls, without a colored side rail;
- fixed mobile tooltip geometry so hidden or visible descriptions cannot create horizontal overflow;
- expanded render QA to report exact overflow elements and write viewport plus full-page screenshots.

Important decisions:

- the mature asset set is [Twemoji 17.0.3](https://github.com/jdecked/twemoji/tree/v17.0.3), licensed CC-BY 4.0; a pinned local subset provides consistency while keeping the app dependency-free;
- purple is reserved for active navigation, selected dictionary outline, premium purchase, and the main start action;
- free-login CTA remains blue while paid CTA remains purple so the next action is legible without extra copy;
- at 390px the catalog remains two columns; at 360px it switches to one column to preserve readable titles and 44px controls.

Known risks:

- authenticated checkout was not exercised because backend/payment and external mutations are out of scope;
- Chromium covers required responsive rendering, but Safari/iOS engine-specific rasterization remains a later device check;
- production remains unchanged until an owner-approved release.

## 5. Specialist Review

Agent: Design Adequacy Reviewer
Verdict: pass

Findings:

- the first render met the main direction: navy surfaces, recognizable emoji, strong product title, and visibly less component noise;
- the first exact 390px run found 32px document overflow caused by invisible absolute tooltips; this P1 defect blocked acceptance;
- the first mobile polish render truncated `Наука и природа`; the mobile title row now wraps in a controlled two-line area;
- the outline dice was inconsistent with the emoji language and was replaced with a local Twemoji die;
- final desktop and mobile renders are visually much closer to the owner-provided original than to `fc12c72`.

Required fixes:

- resolved: bound mobile tooltips to the viewport;
- resolved: remove long-title ellipsis on mobile;
- resolved: widen and equalize desktop navigation;
- resolved: replace the remaining custom outline dice illustration.

Optional polish:

- a later owner-approved stream can apply the same art-direction review to gameplay, profile, and rules; this setup correction does not mix those scopes.

Routed back to: Frontend Developer for one polish pass, then re-reviewed and passed.

### Side-by-side visual verdict

- Compared with the owner-provided original: the final keeps the confident title scale, dark navy page/surface separation, familiar multicolor emoji, broad navigation, clear section rhythm, and limited purple emphasis. It intentionally removes the obsolete phone banner and updates access actions.
- Compared with rejected `fc12c72`: the final removes the decorative title line, purple-on-purple nesting, repeated lavender borders, tiny generic icons, undersized admin-style badges, and dense team form styling.
- Honest verdict: this is not a pixel copy of the old screenshot, but it is visibly in the same design family and materially above the rejected version. The primary remaining design risk lies outside this batch: other screens still use their older visual language.

## 6. Functional QA

Agent: Functional QA
Verdict: pass

Checks performed:

- Node 24 syntax checks for `script.js` and unchanged `src/worker.js`;
- source smoke (`309` assertions) and served smoke (`333` assertions);
- asset contract check for six dictionary icons and 24 mapped team identity icons, plus the local dice icon;
- real Chromium render at `1440 × 1200`, exact `390 × 844`, and narrow `360 × 800`;
- viewport and full-page screenshots at desktop/mobile sizes;
- runtime console/exception capture, SVG loading, overflow element tracing, keyboard focusability, and target metrics;
- behavior test for dice name+icon change, six stable/unique team colors, guest premium CTA destination, real mouse game start, and live-state `iconId` persistence;
- `git diff --check`.

Results:

- desktop: 3 dictionary columns, 2 team columns, no overflow/runtime issue, all visible controls at least 44px;
- 390px: 2 dictionary columns, 1 team column, no overflow/runtime issue, all visible controls at least 44px;
- 360px: 1 dictionary column, 1 team column, no overflow/runtime issue, all visible controls at least 44px;
- all six dictionary SVGs loaded and all mapped team assets exist locally;
- dice changed both name and icon; six teams retained six unique colors and complete identities;
- anonymous `Купить` opened `screen-profile` and did not initiate checkout;
- game start reached `screen-turn-start` with all team `iconId` values persisted.

Regressions found:

- mobile hidden-tooltip overflow found in the first exact-width run and fixed before final acceptance;
- no remaining P0/P1 regressions.

Unverified scenarios:

- authenticated production checkout, external Telegram auth, and payment provider interaction were not run because they are outside this UI-only task;
- physical iOS Safari and Android WebView were unavailable; fixed local SVG assets remove native emoji variation, and Chromium checks cover layout behavior.

Rendered evidence outside the repository:

- `C:\Users\Админ\Projects\activity-game-art-direction-evidence\desktop-1440.png`;
- `C:\Users\Админ\Projects\activity-game-art-direction-evidence\desktop-1440-full.png`;
- `C:\Users\Админ\Projects\activity-game-art-direction-evidence\mobile-390.png`;
- `C:\Users\Админ\Projects\activity-game-art-direction-evidence\mobile-390-full.png`;
- additional 360px viewport/full-page evidence in the same directory.

## 7. Docs Sync

Agent: Docs Sync
Verdict: pass

Docs reviewed:

- `README.md`, `GAME_SPEC.md`, `PROJECT_KNOWLEDGE_BASE.md`, `RECENT_PROJECT_CHANGES.md`, `.assetsignore`.

Docs changed:

- corrected visual description, title, icon source, team icon rendering, license location, and QA facts;
- added a deployed `.txt` notice plus full CC-BY 4.0 license because `.assetsignore` excludes Markdown files.

Docs not changed because:

- payment, Worker, D1, pricing, and production state did not change.

## 8. Release Check

Agent: Release Manager
Verdict: pass

Diff reviewed:

- yes; scope is setup UI, local licensed visual assets, targeted render QA, truthful docs, and this journal;
- no Worker, D1, payment, auth, dictionary content, or production configuration changes.

Commands run:

- `node.exe --check script.js`;
- `node.exe --check src/worker.js`;
- `node.exe tools/smoke_check.mjs`;
- `node.exe tools/smoke_check.mjs --base http://127.0.0.1:8877`;
- local icon asset assertion;
- `node.exe tools/setup_render_check.mjs ... 1440 1200 ... behavior`;
- `node.exe tools/setup_render_check.mjs ... 390 844 ...`;
- `node.exe tools/setup_render_check.mjs ... 360 800 ...`;
- `git diff --check`.

Manual checks:

- visually inspected the owner original, rejected desktop/mobile evidence, and final desktop/mobile viewport/full-page renders;
- confirmed hierarchy, palette distribution, icon familiarity, title wrapping, CTA distinction, team clarity, lack of colored side rails, and absence of clipping.

Deploy follow-up:

- do not deploy until the owner explicitly approves the reviewed screenshots and commit.

D1 follow-up:

- none.

Secret or config follow-up:

- none.

Cache follow-up:

- after a future approved deploy, hard refresh because frontend assets are static.

Open risks:

- production remains on its currently deployed frontend until an explicit release gate;
- broader visual harmonization of rules/profile/gameplay is intentionally deferred.

Ready to hand back:

- yes, as a clean committed worktree for owner review; not deployed.

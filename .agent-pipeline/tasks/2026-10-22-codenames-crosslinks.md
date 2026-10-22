# Activity: переходы в Коднеймс

Дата: 2026-10-22. Владелец задачи: activity_crosslinks (L4), родитель: Осн Activity.
Исходная версия: 7af0970ec1186406141f089af4a93f5215899a0b, свежая main GitHub.
Область: только Activity. Публикация, push и merge выполняются владельцем общего релиза.

## 1. Intake

Agent: Intake
Verdict: pass

Goal: связать Activity с code-names.online, используя запрошенное владельцем публичное название «Коднеймс».

Acceptance criteria:

- Под основными действиями setup и после завершения партии есть сдержанная обычная ссылка.
- Во время хода переход во вторую игру не предлагается.
- Статическая страница игр для компании имеет crawlable-ссылку.
- Сохранены фиолетово-синие стили, доступность, мобильная ширина и платежи.
- Изменения не затрагивают игровые данные, API, auth и analytics.

Out of scope: редизайн, изменение механик, новые аналитические события, перенос доменов и публикация.

Pipeline: Intake → Project Context Reader → UX Planner / SEO Content Editor → Frontend Developer → Design Adequacy Reviewer → Functional QA / SEO QA → Docs Sync → Release Manager.

## 2. Project Context

Agent: Project Context Reader
Verdict: pass

Input reviewed: AGENTS.md, README.md, PROJECT_KNOWLEDGE_BASE.md, RECENT_PROJECT_CHANGES.md, index.html, style.css, showGameOver в script.js, games-for-company/index.html, sitemap.xml, .assetsignore, pipeline, quality gates, website-change и worker skills.

Findings: чистое выделенное worktree; главная и финальный экран используют статическую разметку. Ссылки можно добавить без изменения runtime. .assetsignore исключает Markdown и .agent-pipeline.

## 3. Plan

Agent: UX Planner / SEO Content Editor
Verdict: pass

Affected files: index.html, style.css, games-for-company/index.html, sitemap.xml; три обзорных документа и этот журнал.

Plan: использовать ссылки с UTM source=activity, medium=referral, campaign=games. Не добавлять данные пользователей. Основное действие Activity остаётся кнопкой; ссылка вторична, подчёркнута, с 44 px touch-target. Ссылки открываются в текущей вкладке, посетитель сам выбирает переход. Даты sitemap обновляются только у изменённых страниц.

Rollback: revert одного коммита задачи, без миграций и изменений secrets.

## 4. Implementation

Agent: Frontend Developer
Verdict: pass

Work performed: две статические ссылки в setup и game-over, одно пояснение и ссылка на SEO-странице; три небольших CSS-правила. Runtime script.js не изменён.

## 5. Specialist Review

Agent: Design Adequacy Reviewer / SEO QA (self-check; окончательная приёмка родителем)
Verdict: pass

Findings: нет новых карточек, отвлекающих баннеров или competing CTA; ссылка читаема и имеет видимый focus через существующее правило a:focus-visible. URL и текст доступны без JavaScript. Вставка в games-for-company не меняет canonical. Внутренние артефакты не становятся assets. P0/P1 не обнаружены.

## 6. Functional QA

Agent: Functional QA
Verdict: pass

Checks performed:

- Node 22 syntax checks script.js и src/worker.js.
- tools/smoke_check.mjs: 344 assertions.
- tools/smoke_check.mjs --base http://127.0.0.1:8773: 368 assertions.
- Deterministic Chromium на 360×800: setup target 44 px; ссылка после start; корневая ширина не превышает viewport; после старта в активном игровом экране promotion отсутствует; на game-over ссылка видна; SEO href правильный и overflow отсутствует.
- git diff --check: pass.

Не проверялся повторно реальный платёж: платежный код и конфигурация не изменены.

## 7. Docs Sync

Agent: Docs Sync
Verdict: pass

README добавляет возможность перехода. Knowledge base объясняет места ссылки и отсутствие персональных параметров. Recent changes датирует подготовленный результат без утверждения публикации. GAME_SPEC не изменён: правила и state contract прежние.

## 8. Release Check

Agent: Release Manager
Verdict: pass (локальная готовность)

Diff reviewed: только 8 файлов задачи, без unrelated изменений. Входной worktree был чистым.

Deploy follow-up: владелец общего релиза проверяет итоговый diff, публикует вместе с готовым Коднеймс и проверяет публичные ссылки.
D1 / secrets / config: действий не требуется.
Open risks: пока вторая игра не опубликована, её production ещё может показывать старое название. Общий релиз должен сначала подготовить code-names.online.
Next step: передать локальный коммит родителю для приёмки и общего релиза.

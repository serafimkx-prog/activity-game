# Activity

Браузерная версия игры Activity на чистом `HTML/CSS/Vanilla JS`.

Проект состоит из двух частей:

- статический фронтенд без сборщика;
- backend на `Cloudflare Workers` для Telegram-авторизации, сессий и истории игр.

## Что есть в текущей версии

- настройка партии: словарь, команды, игроки, время хода, открытый раунд;
- игровое поле на 41 клетку плюс финиш;
- три режима заданий:
  - `EXPLAIN`
  - `ACT`
  - `DRAW`
- выбор сложности карточки: `3`, `4`, `5` очков;
- профиль с входом через Telegram;
- сохранение завершённых партий для авторизованного пользователя;
- экран истории и базовой статистики;
- восстановление активной игры после обновления страницы;
- сбор фидбэка от исполнителей по реальной сложности слов;
- дополнительные словари `География`, `Общество` и `Вокруг нас`;
- бесплатные словари `Мир кино` и `Наука и природа`.

## Стек

- `index.html` + `style.css` + `script.js`
- `Cloudflare Workers`
- `D1`
- `Telegram Login Widget`

## Как запустить локально

Фронтенд использует `fetch()` для загрузки словарей, поэтому страницу нужно открывать через локальный сервер.

1. Перейдите в папку проекта:

   ```bash
   cd "/Users/k-serafim/Yandex.Disk.localized/activity-game — копия"
   ```

2. Поднимите простой сервер, например:

   ```bash
   python3 -m http.server 8080
   ```

3. Откройте:

   ```text
   http://localhost:8080
   ```

Для локальной игры backend не обязателен. Авторизация, профиль и сохранение истории требуют Worker API и настроенных переменных Cloudflare.

## Как устроен игровой цикл

Основная последовательность экранов и функций:

1. `Новая игра`
2. `goTurnStart()`
3. `goCardSelection()`
4. `goPreview()`
5. `goExplaining()`
6. `endTurn()` или `endOpenRound()`
7. `showGameOver()`

Текущее игровое состояние хранится в объекте `state` внутри `script.js`.

## Актуальные правила по коду

- Победа наступает, когда команда доходит до позиции `41` или выше.
- Поле генерируется случайно из:
  - `14` клеток `E`
  - `14` клеток `A`
  - `13` клеток `D`
- Перед объяснением есть preview-этап на `7` секунд.
- Длительность основного таймера задаётся в настройках. По умолчанию это `60` секунд, диапазон `30–120`, шаг `10`.
- Открытый раунд включается настройкой `openRoundEnabled` и выпадает с вероятностью `10%`.
- Если в открытом раунде угадывает не команда-исполнитель, угадавшая команда получает очки карточки, а команда-исполнитель получает `+2`.
- При успешном ходе работает столкновение: если команда встала на занятую клетку, другая команда отступает на `1`.

## Словари

Список словарей хранится в `dictionaries.json`.

Сейчас в репозитории доступны:

- `classic` → `words.json`
- `geo` → `words_geo.json`
- `society` → `words_society.json`
- `around_us` → `words_around_us.json`
- `cinema` → `words_cinema.json`
- `science` → `words_science.json`

По текущей модели доступа:

- `classic` — бесплатный словарь;
- `geo` — бесплатный словарь;
- `society` — бесплатный словарь;
- `around_us` — бесплатный словарь после входа через Telegram;
- `cinema` — бесплатный словарь после входа через Telegram;
- `science` — бесплатный словарь после входа через Telegram;
- доступ к ограниченным словарям проверяется на backend, а не только через UI.

Первые три словаря в сетке открыты сразу, остальные три открываются после входа в аккаунт.

Редакторские правила составления новых словарей зафиксированы в [DICTIONARY_RULES.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/DICTIONARY_RULES.md).

Формат словаря:

```json
{
  "DRAW": {
    "3": ["Кот"],
    "4": ["Гравитация"],
    "5": ["Метафора"]
  },
  "EXPLAIN": {
    "3": ["Дом"],
    "4": ["Путешествие"],
    "5": ["Парадокс"]
  },
  "ACT": {
    "3": ["Сон"],
    "4": ["Ревность"],
    "5": ["Импровизация"]
  }
}
```

## Структура проекта

- `index.html` — экраны приложения и базовая разметка.
- `activity-online/`, `rules/`, `words/`, `dictionaries/`, `games-for-company/`, `crocodile-alias-activity/` — статические SEO-страницы для поисковых входов.
- `style.css` — все стили интерфейса.
- `script.js` — игровой runtime, UI, auth-клиент и статистика.
- `src/worker.js` — backend Worker.
- `src/lib/http.js` — JSON/error helpers.
- `src/lib/session.js` — cookie-сессии.
- `src/lib/telegram.js` — валидация Telegram auth payload.
- `db/schema.sql` — схема D1.
- `dictionaries.json` — метаданные словарей.
- `words.json`, `words_geo.json`, `words_society.json`, `words_around_us.json`, `words_cinema.json`, `words_science.json` — словари.
- `sitemap.xml` — карта сайта, включая главную, SEO-страницы и юридические страницы.
- `7f3a9c1e4b8d43f6916a2c0e5d9b7a84.txt` — key-файл для IndexNow.
- `AGENTS.md` — стартовый файл для ИИ-модели или coding agent с правилами работы в проекте. Если чат начинается с фразы `посмотри стартовый файл`, нужно читать именно этот файл.
- `DICTIONARY_RULES.md` — правила составления новых словарей.
- `DICTIONARY_REWORK_PLAN.md` — ТЗ и план аудита текущих словарей и сборки `Мир кино` / `Наука и природа`.
- `DICTIONARY_AUDIT_REPORT.md` — технический отчёт по размерам, дублям, пересечениям и повторяющимся паттернам словарей.
- `DICTIONARY_EDITORIAL_REVIEW.md` — редакторские выводы и приоритеты чистки текущих словарей.
- `DICTIONARY_INTERSECTION_DECISIONS.md` — decision-list по оставшимся пересечениям между словарями.
- `DICTIONARY_BLUEPRINT_CINEMA_SCIENCE.md` — содержательная рамка и кластеры для новых словарей.
- `.agent-pipeline/` — регламент ИИ-конвейера ролей, quality gates и шаблон task-журнала.
- `tools/dictionary_audit.mjs` — воспроизводимый скрипт технического аудита словарей.
- `tools/build_new_dictionaries.mjs` — генератор текущих черновиков `Мир кино` и `Наука и природа`.
- `RECENT_PROJECT_CHANGES.md` — зафиксированные недавние изменения проекта.
- `wrangler.jsonc` — конфиг Worker.

## ИИ-конвейер разработки

Для нетривиальных изменений в проекте добавлен процесс в `.agent-pipeline/`.

Основные файлы:

- `AGENTS.md` — стартовая инструкция для модели: архитектура, источники истины, правила изменений, проверки и release handoff. Триггерная фраза: `посмотри стартовый файл`.
- `.agent-pipeline/AGENT_PIPELINE.md` — какие роли участвуют в разных типах задач и как задача проходит между ними.
- `.agent-pipeline/QUALITY_GATES.md` — обязательные проверки для frontend, дизайна, gameplay, backend/auth/payment, словарей, документации и релиза.
- `.agent-pipeline/TASK_TEMPLATE.md` — шаблон журнала задачи.
- `.agent-pipeline/agents/` — инструкции для отдельных ролей: intake, project context reader, UX planner, frontend developer, backend developer, design reviewer, QA, docs sync и release manager.

Для UI-изменений используется цепочка:

```text
Intake
→ Project Context Reader
→ UX Planner
→ Frontend Developer
→ Design Adequacy Reviewer
→ Functional QA
→ Docs Sync
→ Release Manager
```

Если reviewer находит блокирующие проблемы, задача возвращается к соответствующему developer-агенту, а не проходит дальше автоматически.

## Deploy и fallback

Так как `wrangler.jsonc` публикует static assets из директории `"."`, деплой нужно делать только из чистого состояния:

1. Закоммитить и запушить ровно связанный scope изменений.
2. Создать чистый worktree на нужном SHA:

```bash
git worktree add --detach /tmp/activity-deploy-<sha> <sha>
```

3. В чистом worktree проверить:

```bash
git status --short
node --check script.js
node --check src/worker.js
npx wrangler deploy --dry-run
```

4. Выполнить `npx wrangler deploy` только из этого worktree.
5. После деплоя проверить production URL, ключевые страницы и изменённые фразы.
6. Удалить временный worktree:

```bash
git worktree remove /tmp/activity-deploy-<sha>
```

Fallback:

- быстрый откат — заново задеплоить предыдущий проверенный SHA из clean worktree;
- git-откат — сделать `git revert <bad-sha>`, запушить revert-коммит и задеплоить его;
- после отката проверить production тем же smoke-набором.

## API, которое есть в коде

- `GET /api/config`
- `POST /api/auth/telegram`
- `GET /api/me`
- `GET /api/dictionaries`
- `POST /api/logout`
- `POST /api/purchase/create`
- `POST /api/game-sessions`
- `GET /api/profile/summary`
- `POST /api/dictionary-feedback`
- `POST /api/payment/webhook/yookassa`

## Что важно помнить

- Фронтенд запускается без сборщика.
- Источник истины по поведению игры — `script.js`.
- Источник истины по backend и auth — `src/worker.js` и `src/lib/*`.
- Источник истины по runtime-конфигу Worker — `wrangler.jsonc`, включая `TELEGRAM_BOT_USERNAME`.
- После изменения `db/schema.sql` схему нужно отдельно применять в `D1`.
- Первые три словаря открыты без входа.
- Остальные три словаря открываются бесплатно после входа через Telegram.
- Таблицы `user_dictionary_access` и `purchase_orders` остаются в проекте для будущего возврата платной модели.
- Для оплаты нужны Cloudflare secrets/vars: `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`, `YOOKASSA_RETURN_URL`.
- Фидбек по сложности слова для авторизованных пользователей сохраняется в backend и D1, а при недоступности сервера остаётся локальный fallback в `localStorage`.
- Активная партия восстанавливается после `refresh` через `localStorage`.
- Завершённые партии сначала ставятся в локальную очередь и повторно отправляются в backend при следующей возможности.

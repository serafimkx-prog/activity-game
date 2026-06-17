# Activity Game — База знаний по текущему коду

Этот документ описывает проект только по тому, что подтверждается текущим кодом в репозитории.

Если документация расходится с кодом, источником истины считаются:

- `script.js` для игрового поведения и UI;
- `src/worker.js` и `src/lib/*` для backend и авторизации;
- `db/schema.sql` для структуры базы данных;
- `wrangler.jsonc` для конфигурации Worker.

## 1. Что это за проект

`Activity` — браузерная игра с локальным игровым процессом и backend-слоем для аккаунта и истории партий.

Текущая архитектура:

- фронтенд без сборщика;
- SPA-подобный интерфейс на одном HTML-документе;
- backend на `Cloudflare Workers`;
- база данных `D1`;
- авторизация через `Telegram Login Widget`.

## 2. Структура репозитория

Ключевые файлы:

- [index.html](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/index.html) — все экраны приложения.
- [activity-online/index.html](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/activity-online/index.html), [rules/index.html](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/rules/index.html), [words/index.html](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/words/index.html), [dictionaries/index.html](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/dictionaries/index.html), [games-for-company/index.html](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/games-for-company/index.html), [crocodile-alias-activity/index.html](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/crocodile-alias-activity/index.html) — статические SEO-страницы.
- [privacy/index.html](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/privacy/index.html), [offer/index.html](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/offer/index.html), [access/index.html](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/access/index.html), [requisites/index.html](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/requisites/index.html) — юридические и справочные страницы.
- [style.css](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/style.css) — стили интерфейса.
- [script.js](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/script.js) — игровой runtime, клиентская auth-логика и статистика.
- [src/worker.js](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/src/worker.js) — основной Worker entrypoint.
- [src/lib/http.js](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/src/lib/http.js) — JSON/error helpers.
- [src/lib/session.js](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/src/lib/session.js) — cookie-сессии.
- [src/lib/telegram.js](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/src/lib/telegram.js) — проверка Telegram auth payload.
- [db/schema.sql](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/db/schema.sql) — схема D1.
- [dictionaries.json](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/dictionaries.json) — список словарей и их метаданные.
- [words.json](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/words.json) — основной словарь.
- [words_geo.json](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/words_geo.json) — географический словарь.
- [words_society.json](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/words_society.json) — словарь `Общество`.
- [words_around_us.json](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/words_around_us.json) — словарь `Вокруг нас`.
- [words_cinema.json](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/words_cinema.json) — бесплатный словарь `Мир кино`.
- [words_science.json](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/words_science.json) — бесплатный словарь `Наука и природа`.
- [.assetsignore](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/.assetsignore) — исключения для публикации static assets.
- [README.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/README.md) — краткое описание проекта.
- [AGENTS.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/AGENTS.md) — стартовая инструкция для ИИ-модели или coding agent: карта проекта, источники истины, правила изменений, проверки и release handoff. Если пользователь начинает с фразы `посмотри стартовый файл`, нужно читать этот файл.
- [GAME_SPEC.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/GAME_SPEC.md) — техническая спецификация по текущему коду.
- [DICTIONARY_REWORK_PLAN.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/DICTIONARY_REWORK_PLAN.md) — ТЗ и план аудита текущих словарей и сборки `Мир кино` / `Наука и природа`.
- [DICTIONARY_AUDIT_REPORT.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/DICTIONARY_AUDIT_REPORT.md) — технический отчёт по размерам, дублям, пересечениям и повторяющимся паттернам словарей.
- [DICTIONARY_EDITORIAL_REVIEW.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/DICTIONARY_EDITORIAL_REVIEW.md) — редакторские выводы и приоритеты чистки текущих словарей.
- [DICTIONARY_INTERSECTION_DECISIONS.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/DICTIONARY_INTERSECTION_DECISIONS.md) — decision-list по оставшимся пересечениям между словарями.
- [DICTIONARY_BLUEPRINT_CINEMA_SCIENCE.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/DICTIONARY_BLUEPRINT_CINEMA_SCIENCE.md) — содержательная рамка и кластеры для новых словарей.
- [tools/smoke_check.mjs](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/tools/smoke_check.mjs) — воспроизводимый smoke-check для синтаксиса, словарей, статических страниц, sitemap и ключевых DOM/source-контрактов.

### SEO-страницы

Кроме основной SPA-страницы в проекте есть статические страницы для поисковых запросов:

- `/activity-online/` — запросы про `Activity онлайн` и `Активити онлайн`.
- `/rules/` — правила игры Активити.
- `/words/` — слова и карточки для Активити.
- `/dictionaries/` — словари и наборы карточек.
- `/games-for-company/` — игры для компании онлайн.
- `/crocodile-alias-activity/` — сравнение Крокодила, Alias и Activity.
- `/privacy/` — информация о localStorage, Telegram-входе, cookies, истории игр, фидбэке и Яндекс.Метрике.

Эти страницы должны оставаться в [sitemap.xml](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/sitemap.xml) и иметь canonical URL на production-домене.

## 3. Как устроен фронтенд

Фронтенд — одна страница с несколькими экранами `.screen`.

Экран активируется через класс `.active`.

Функция `showScreen(id)` в [script.js](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/script.js):

- очищает активный таймер;
- скрывает все экраны;
- показывает нужный экран;
- скроллит страницу вверх.

### Экраны

В текущем `index.html` есть такие экраны:

- `screen-setup`
- `screen-rules`
- `screen-profile`
- `screen-turn-start`
- `screen-card-selection`
- `screen-preview`
- `screen-explaining`
- `screen-turn-result`
- `screen-game-over`

### Верхнеуровневая навигация

В интерфейсе есть три верхних раздела:

- `Новая игра`
- `Правила`
- `Профиль`

Навигация реализована нативными `button` внутри `nav.nav-pill`. Активный раздел помечается классом `active` и `aria-current="page"`.

### Визуальная модель

По коду и стилям интерфейс:

- тёмный;
- карточный;
- mobile-friendly;
- ограничен шириной `max-width: 600px`;
- прижат к верхней части viewport, а не центрируется вертикально.

Для доступности в главной SPA есть skip-link к настройке игры, видимые `:focus-visible` состояния и нативные кнопки для верхней навигации и выбора сложности карточки.

## 4. Игровое состояние

Главное runtime-состояние хранится в объекте `state` в [script.js](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/script.js).

Сейчас там есть:

- команды;
- индекс текущей команды;
- текущий режим клетки;
- текущая выбранная карточка;
- словарные пулы;
- индексы внутри пулов;
- конфиг хода;
- таймер;
- `timeLeft`;
- `gameInProgress`;
- выбранный словарь;
- время старта партии.

Отдельно есть объект `auth`, в котором лежат:

- публичная конфигурация auth;
- текущий пользователь;
- флаг загрузки Telegram widget;
- флаг загрузки статистики.

Отдельно в `localStorage` используются ключи:

- `activity_active_game_v1` — снимок активной партии;
- `activity_pending_game_sessions_v1` — очередь завершённых партий до успешной отправки в backend;
- `activity_dictionary_feedback_v1` — fallback фидбэка по сложности слова.

## 5. Поле и игровые режимы

### Поле

Поле создаётся функцией `generateBoard()`.

Состав поля:

- `14` клеток `E`
- `14` клеток `A`
- `13` клеток `D`

Всего:

- `41` игровая клетка: `0..40`
- `1` финишная позиция: `41`

### Визуализация поля

Поле рендерится как змейка в сетке `7x6`.

Функция `pathToGrid(slotIdx)` раскладывает слоты так:

- чётные ряды идут слева направо;
- нечётные ряды — справа налево.

### Режимы

В коде есть три режима:

- `EXPLAIN`
- `ACT`
- `DRAW`

Важно: в текущем UI нет отдельного Canvas-редактора или рисовального полотна. `DRAW` сейчас существует как тип задания, слово для которого показывается тем же игровым циклом, что и для других режимов.

## 6. Словари

Метаданные словарей хранятся в [dictionaries.json](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/dictionaries.json), а фронтенд получает их через `GET /api/dictionaries`.

Сейчас в файле есть:

- доступные по релизу словари:
  - `classic`
  - `geo`
  - `society`
  - `around_us`
  - `cinema`
  - `science`
- по модели доступа:
  - `classic` — free
  - `geo` — free
  - `society` — free
  - `around_us` — free after login
  - `cinema` — free after login
  - `science` — free after login

Первые три словаря в сетке открыты без входа. Остальные три словаря открываются бесплатно после входа через Telegram.

При старте игры фронтенд загружает `dict.file` через `fetch()`, но Worker отдельно защищает словари с ограниченным доступом: словари с `authAccess: "login"` требуют авторизацию. Premium-проверка через `user_dictionary_access` остаётся в коде для будущей платной модели, но сейчас активных premium-словарей в каталоге нет.

После этого вызывается `initPools(data)`, которая создаёт перемешанные пулы слов по режимам и сложностям.

Текущий вид карточек словарей на setup-экране:

- описание словаря вынесено в tooltip по значку `i`;
- у доступных словарей внизу показывается `Выбран` или `Выбрать`;
- для словарей, доступных после входа, показывается CTA `Войти`;
- подпись количества унифицирована как `Карточек: N`.

Правила составления новых словарей зафиксированы в [DICTIONARY_RULES.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/DICTIONARY_RULES.md).

## 7. Игровой цикл

Основная цепочка:

1. `goTurnStart()`
2. `goCardSelection()`
3. `goPreview()`
4. `goExplaining()`
5. `endTurn()` или `endOpenRound()`
6. `showGameOver()`

### Старт новой игры

По нажатию `Начать игру` код:

- собирает названия команд;
- собирает игроков;
- читает время хода;
- читает настройку `openRoundEnabled`;
- загружает словарь;
- генерирует поле;
- инициализирует команды;
- сохраняет выбранный словарь в `state.currentDictionary`;
- сохраняет время старта в `state.gameStartedAt`;
- включает `state.gameInProgress = true`.

### Continue game

Если `state.gameInProgress === true`, на экране настройки показывается кнопка `Продолжить игру`.

При нажатии она возвращает пользователя в `goTurnStart()`.

После появления runtime-снимка в `localStorage` игра теперь может восстановиться и после полного обновления страницы.

### Финальный экран и история

`showGameOver()` строит `summary_json` через `buildGameSummary(winner)`, сохраняет его как durable-контракт завершённой партии и рендерит компактный post-game экран: победитель, финальный счёт, короткие highlights и раскрываемая подробная статистика.

Экран деталей партии в профиле использует тот же `summary_json`, но рендерит полную статистику сразу. Это различие относится только к UI-режиму отображения и не меняет форму сохранённых данных.

## 8. Таймеры и правила

### Preview

В `goPreview()`:

- слово показывается только на preview-экране;
- запускается countdown на `7` секунд;
- затем автоматически начинается `goExplaining()`.

### Основной таймер

В `goExplaining()` используется `state.config.turnTime`.

По умолчанию это `60` секунд, но пользователь может менять значение через ползунок в setup-экране.

Текущее ограничение в UI:

- минимум `30`
- максимум `120`
- шаг `10`

### Открытый раунд

Открытый раунд возможен, если:

- включён чекбокс `open-round-enabled`;
- при выборе карточки сработал шанс `10%`.

В открытом раунде:

- UI показывает кнопки всех команд;
- угадавшая команда получает очки карточки;
- если выиграла не команда-исполнитель, команде-исполнителю даётся `+2`.
- после завершения открытого раунда очередь объясняющего тоже обновляется для активной команды.

### Столкновение

После успешного движения по обычному ходу или открытому раунду:

- если новая позиция не финишная;
- и на клетке уже есть другая команда;
- другая команда отступает на `1`.

В текущей реализации проверка идёт циклом по всем командам, поэтому при совпадении нескольких команд на клетке отступят все найденные совпадения.

### Завершение по таймеру

Когда время заканчивается, `onTimerEnd()`:

- проигрывает звук;
- меняет подсказку на экране;
- не завершает ход автоматически.

Результат всё равно выбирается вручную кнопками интерфейса.

### Фидбек по сложности слова

На экране результата хода есть блок `Оценка сложности`.

Игроки могут выбрать:

- `Скорее 3`
- `Скорее 4`
- `Скорее 5`

Сохраняемый payload включает:

- `feedbackId`
- `dictionaryId`
- `dictionaryName`
- `word`
- `mode`
- `originalLevel`
- `ratedLevel`
- `wasSuccessful`
- `wasOpenRound`
- `durationSeconds`
- `turnNumber`
- `gameStartedAt`
- `createdAt`

Поведение хранения:

- если пользователь авторизован, клиент отправляет `POST /api/dictionary-feedback`;
- если пользователь не авторизован или backend недоступен, остаётся локальный fallback в `localStorage` с ключом `activity_dictionary_feedback_v1`.

## 9. Профиль и клиентская auth-логика

Экран `Профиль` содержит:

- карточку аккаунта;
- слот под Telegram Login Widget;
- кнопку logout;
- блок `История и статистика`.
- юридические ссылки на оферту, доступ, реквизиты и приватность.

Ключевые функции в [script.js](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/script.js):

- `loadAuthConfig()`
- `refreshCurrentUser()`
- `renderTelegramLoginWidget()`
- `renderAuthCard()`
- `window.handleTelegramAuth`
- `logoutTelegramUser()`
- `loadProfileStats()`
- `saveFinishedGame(winner)`

Если пользователь не авторизован:

- показывается призыв войти через Telegram;
- статистика заменяется locked-состоянием.

Если авторизован:

- показываются имя, username или fallback-описание, аватар и кнопка `Выйти`;
- выполняется загрузка профиля и последних игр.

## 10. Как устроен backend

Backend находится в [src/worker.js](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/src/worker.js).

Это единый Worker, который:

- обрабатывает `/api/*`;
- остальное отдаёт через `env.ASSETS.fetch(request)`.

### Endpoints

Сейчас в коде есть:

- `GET /api/config`
- `POST /api/auth/telegram`
- `GET /api/me`
- `POST /api/logout`
- `POST /api/game-sessions`
- `GET /api/profile/summary`
- `POST /api/dictionary-feedback`

### Поведение endpoints

`GET /api/config`

- возвращает `telegramBotUsername`.

`POST /api/auth/telegram`

- принимает Telegram auth payload;
- валидирует подпись;
- создаёт или обновляет пользователя;
- создаёт сессию;
- отдаёт `Set-Cookie`.

`GET /api/me`

- возвращает, авторизован ли пользователь;
- возвращает объект пользователя, если сессия валидна.

`GET /api/dictionaries`

- возвращает каталог словарей;
- добавляет вычисленные поля `canPlay`, `requiresPurchase`, `lockedReason`.

`POST /api/logout`

- удаляет серверную сессию;
- сбрасывает cookie.

`POST /api/purchase/create`

- создаёт платёж ЮKassa на один premium-словарь, когда в каталоге есть active premium-доступ;
- сохраняет заказ в `purchase_orders`;
- возвращает `confirmationUrl` для редиректа на оплату.

Сейчас активных premium-словарей в `dictionaries.json` нет: все словари бесплатные, часть открывается после входа через Telegram.

`POST /api/game-sessions`

- сохраняет завершённую игру для текущего пользователя;
- на backend делает дедупликацию по ключевым полям завершённой партии, чтобы повторная отправка не создавала дубль.

`GET /api/profile/summary`

- возвращает агрегированную статистику;
- возвращает список последних игр.

`POST /api/dictionary-feedback`

- принимает фидбек по сложности слова;
- требует авторизации;
- делает upsert по паре `user_id + feedback_id`.

`POST /api/payment/webhook/yookassa`

- принимает webhook ЮKassa;
- обновляет `purchase_orders`;
- после `payment.succeeded` выдаёт доступ к словарю через `user_dictionary_access`.

## 11. Telegram auth

Логика Telegram вынесена в [src/lib/telegram.js](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/src/lib/telegram.js).

Проверка устроена так:

- обязательны поля `id`, `first_name`, `auth_date`, `hash`;
- `auth_date` не должен быть старше 24 часов;
- backend строит `data_check_string`;
- считает HMAC-SHA256;
- сравнивает hex-signature с `payload.hash`.

Нормализованный профиль содержит:

- `telegramUserId`
- `username`
- `firstName`
- `lastName`
- `photoUrl`

## 12. Сессии

Логика сессий находится в [src/lib/session.js](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/src/lib/session.js).

Сейчас по коду:

- cookie называется `activity_session`;
- TTL сессии — `30` дней;
- cookie выставляется как:
  - `Path=/`
  - `HttpOnly`
  - `Secure`
  - `SameSite=Lax`

Если сессия истекла:

- backend удаляет её из базы;
- `getSessionUser()` возвращает `null`.

## 13. D1 и схема данных

Схема находится в [db/schema.sql](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/db/schema.sql).

### Таблицы

`users`

- Telegram-пользователи.

`sessions`

- серверные сессии.

`game_sessions`

- завершённые партии.

`dictionary_feedback`

- фидбек пользователей по реальной сложности слов.

### Что сохраняется в `game_sessions`

Backend ожидает и пишет:

- `started_at`
- `finished_at`
- `dictionary_id`
- `dictionary_name`
- `turn_time`
- `open_round_enabled`
- `team_count`
- `winner_name`
- `winner_position`
- `duration_seconds`
- `summary_json`

### Надёжность сохранения истории

На клиенте завершённая партия сначала складывается в локальную очередь.

Дальше фронтенд:

- сразу пытается отправить её в `POST /api/game-sessions`;
- повторяет отправку после следующего успешного входа;
- повторяет отправку при событии `online`.

Это нужно, чтобы история партий не терялась при временном `401`, сетевом сбое или ошибке backend.

### Что сохраняется в `dictionary_feedback`

Backend пишет:

- `user_id`
- `feedback_id`
- `dictionary_id`
- `dictionary_name`
- `word`
- `mode`
- `original_level`
- `rated_level`
- `was_successful`
- `was_open_round`
- `duration_seconds`
- `turn_number`
- `game_started_at`
- `created_at`
- `updated_at`

### Важная operational-заметка

Если `db/schema.sql` меняется, этого недостаточно.

Нужно отдельно применить SQL в D1, иначе:

- сайт может продолжить открываться;
- но связанные backend-операции начнут падать.

## 14. Как считается статистика

В `GET /api/profile/summary` backend считает:

- `totalGames`
- `wins`
- `averageDurationSeconds`
- `favoriteDictionary`
- `recentGames`

### Как считается победа пользователя

Сейчас это эвристика:

- backend смотрит победившую команду в `summary_json`;
- затем берёт `firstName` и `username` пользователя;
- если одно из этих значений совпадает с именем игрока в победившей команде, победа засчитывается.

Это важно помнить: статистика побед зависит от того, как игрок записан в составе команды.

## 15. Конфигурация Worker

Конфиг находится в [wrangler.jsonc](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/wrangler.jsonc).

Подтверждённые по коду поля:

- `name: "activity-game"`
- `main: "src/worker.js"`
- `assets.directory: "."`
- `assets.binding: "ASSETS"`
- `assets.run_worker_first: ["/api/*"]`
- D1 binding `DB`
- `vars.APP_NAME`
- `vars.TELEGRAM_BOT_USERNAME`

Текущий `database_id` в конфиге:

- `87321b7e-452c-4a7a-b45f-0f70ab84c85f`

## 16. `.assetsignore`

Файл [.assetsignore](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/.assetsignore) исключает из публикации assets, в том числе:

- `.git`
- `.wrangler`
- все markdown-документы `*.md`
- `.agent-pipeline`
- `db`
- `src`
- `tools`
- `wrangler.toml`
- `wrangler.json`
- `wrangler.jsonc`
- `node_modules`

## 17. Что точно подтверждается кодом

На текущий момент по репозиторию точно видно, что реализованы:

- локальный игровой процесс;
- настройка команд и игроков;
- выбор словаря;
- правила составления словарей в отдельном markdown-документе;
- случайная генерация поля;
- preview перед раундом;
- обычные и открытые раунды;
- ротация очереди объясняющего после открытого раунда;
- экран профиля;
- Telegram login flow на клиенте и backend;
- серверные сессии;
- сохранение завершённых игр;
- локальное восстановление активной партии после `refresh`;
- локальная очередь для надёжного сохранения завершённых партий;
- профильная summary-статистика;
- сбор фидбэка по сложности слова на экране результата;
- серверное сохранение этого фидбэка в D1 для авторизованных пользователей;
- единый Worker для API и static assets.

## 18. ИИ-конвейер разработки

В проект добавлен локальный регламент ИИ-конвейера в [.agent-pipeline](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/.agent-pipeline).

Назначение:

- фиксировать роли, через которые проходят нетривиальные изменения;
- разделять реализацию и проверку;
- не пропускать изменения без quality gates;
- оставлять task-журнал как артефакт прохождения задачи.

Ключевые файлы:

- [AGENTS.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/AGENTS.md) — стартовый файл, который нужно читать первым при работе ИИ-модели с проектом; триггерная фраза: `посмотри стартовый файл`.
- [.agent-pipeline/AGENT_PIPELINE.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/.agent-pipeline/AGENT_PIPELINE.md) — выбор конвейера по типу задачи и правила handoff между ролями.
- [.agent-pipeline/QUALITY_GATES.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/.agent-pipeline/QUALITY_GATES.md) — стоп-гейты для frontend, дизайна, gameplay, backend/auth/payment, словарей, документации и релиза.
- [.agent-pipeline/TASK_TEMPLATE.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/.agent-pipeline/TASK_TEMPLATE.md) — шаблон журнала задачи.
- [.agent-pipeline/agents/](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/.agent-pipeline/agents) — инструкции отдельных ролей.

Для UI-изменений базовая цепочка:

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

Для изменений gameplay, backend/auth/payment, словарей и SEO используются специализированные ветки, описанные в `AGENT_PIPELINE.md`.

Важно: reviewer-агенты имеют право остановить задачу с `needs_changes` или `blocked`. В этом случае задача возвращается на предыдущую роль, а не считается готовой.

## 19. Что не стоит утверждать без отдельной проверки

Этот документ намеренно не фиксирует как факт:

- конкретный production URL;
- состояние внешнего Cloudflare-окружения;
- состояние GitHub-деплоя;
- наличие секретов в реальном окружении;
- то, что все backend-фичи уже успешно прогнаны end-to-end.

Для таких утверждений нужна отдельная проверка окружения, а не только чтение локального кода.

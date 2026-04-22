# Activity Game — Полная база знаний по проекту

Этот документ нужен как единая точка входа в проект. Он описывает:

- что это за продукт;
- как устроен фронтенд;
- как устроен backend на Cloudflare Workers;
- как работают авторизация, история игр и база данных;
- какие есть важные файлы;
- как сейчас устроен деплой;
- какие есть известные ограничения и дальнейшие шаги.

Документ описывает **текущее состояние проекта на момент его создания**.

## 1. Что это за проект

`Activity` — браузерная версия настольной игры Activity.

Игроки делятся на команды, выбирают карточки разной сложности и объясняют слова в одном из режимов:

- `EXPLAIN` — словами;
- `ACT` — пантомимой;
- `DRAW` — рисованием.

Сейчас игра работает как:

- статический фронтенд;
- с backend-слоем на `Cloudflare Workers`;
- с авторизацией через `Telegram Login Widget`;
- с сохранением истории завершённых игр для авторизованных пользователей.

На текущем этапе продуктовая модель такая:

- играть можно бесплатно;
- авторизация нужна для истории и статистики в профиле;
- словари пока бесплатные;
- основа под будущую монетизацию уже заложена через аккаунт, Worker API и D1.

## 2. Текущий прод-адрес

Текущий боевой адрес проекта:

- `https://activity.serafimkx.workers.dev/`

Важно:

- раньше в Cloudflare существовали два приложения: `activity` и `activity-game`;
- сейчас должен использоваться **только `activity`**;
- вся дальнейшая настройка должна идти именно в Worker `activity`.

## 3. Технологический стек

### Фронтенд

- `HTML`
- `CSS`
- `Vanilla JavaScript`

Сборщика фронтенда нет.

### Backend

- `Cloudflare Workers`
- `D1` как база данных

### Авторизация

- `Telegram Login Widget`
- серверная валидация Telegram auth payload через `hash`

### Хостинг / деплой

- GitHub repository
- Cloudflare Worker deploy из GitHub

## 4. Структура репозитория

Ключевые файлы:

- [index.html](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/index.html) — вся HTML-разметка экранов.
- [style.css](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/style.css) — все стили интерфейса.
- [script.js](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/script.js) — вся клиентская игровая логика, UI, auth-клиент, статистика.
- [src/worker.js](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/src/worker.js) — Worker backend и API endpoints.
- [db/schema.sql](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/db/schema.sql) — SQL-схема D1.
- [wrangler.jsonc](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/wrangler.jsonc) — конфиг Worker.
- [dictionaries.json](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/dictionaries.json) — список словарей и их метаданные.
- [words.json](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/words.json) — основной словарь.
- [words_geo.json](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/words_geo.json) — географический словарь.
- [.assetsignore](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/.assetsignore) — список файлов/папок, которые нельзя публиковать как static assets.
- [README.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/README.md) — пользовательское описание проекта.
- [GAME_SPEC.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/GAME_SPEC.md) — ранняя техническая спецификация проекта.

## 5. Как устроен фронтенд

Фронтенд — это одна SPA-подобная страница с несколькими “экранами”.

### Основной механизм экранов

Каждый экран — это блок `.screen`.

Активный экран получает класс `.active`.

Переключение идет через функцию:

- `showScreen(id)` в [script.js](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/script.js)

Эта функция:

- останавливает текущий таймер;
- скрывает все экраны;
- показывает нужный экран;
- скроллит страницу вверх.

### Основные экраны

В текущем проекте есть такие экраны:

- `screen-setup` — “Новая игра”
- `screen-rules` — “Правила”
- `screen-profile` — “Профиль”
- `screen-turn-start`
- `screen-card-selection`
- `screen-preview`
- `screen-explaining`
- `screen-turn-result`
- `screen-game-over`

### Текущая навигация

На верхнем уровне UI есть три раздела:

- `Новая игра`
- `Правила`
- `Профиль`

Профиль вынесен в отдельный экран, чтобы:

- не ломать layout `Новой игры`;
- не перегружать шапку;
- иметь естественное место под историю, статистику и будущий личный кабинет.

### Базовая визуальная модель

Интерфейс темный, карточный, mobile-friendly.

Ключевые особенности layout:

- экран прижат к верхней части viewport, а не вертикально центрирован;
- основной контейнер центрирован по горизонтали;
- ширина экрана ограничена `max-width: 600px`;
- профили, словари, настройки и команды показаны через карточки.

## 6. Как устроена клиентская игровая логика

Вся игровая логика находится в [script.js](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/script.js).

### Главный runtime state

Основное игровое состояние хранится в объекте `state`.

На текущий момент там есть:

- команды;
- индекс текущей команды;
- текущий режим клетки;
- текущая выбранная карточка;
- пулы слов;
- индексы по пулам;
- конфиг игры;
- таймер;
- флаг активной игры;
- выбранный словарь текущей партии;
- время старта партии.

Состояние авторизации хранится отдельно в объекте `auth`.

Там есть:

- публичная auth-конфигурация;
- текущий пользователь;
- признак загрузки Telegram widget;
- состояние загрузки статистики.

### Поле

Поле генерируется случайно функцией `generateBoard()`.

Распределение:

- 14 клеток `E`
- 14 клеток `A`
- 13 клеток `D`

Поле визуализируется как “змейка” в сетке `7x6`.

### Словари

Словари загружаются через:

- `loadDictionaries()`

Сами слова для партии загружаются при старте новой игры:

- `fetch(dict.file)`

Сейчас проект использует локальные JSON-файлы:

- `words.json`
- `words_geo.json`

### Игровой цикл

Основная цепочка такая:

1. `goTurnStart()`
2. `goCardSelection()`
3. `goPreview()`
4. `goExplaining()`
5. `endTurn()` или `endOpenRound()`
6. `showGameOver()` при победе

### Таймеры

В игре используется один таймер в `state.timer`.

Он:

- очищается при смене экранов;
- используется для preview countdown;
- используется для объяснения слова.

### Звук

Звук полностью генерируется через `Web Audio API`.

В проекте нет аудиофайлов, есть набор helper-функций:

- `sfxTick`
- `sfxTimeUp`
- `sfxSuccess`
- `sfxFail`
- `sfxCardPick`
- `sfxOpenRound`
- и др.

## 7. Авторизация через Telegram

### Общая схема

Пользователь авторизуется через `Telegram Login Widget`.

Flow:

1. фронтенд получает публичную конфигурацию с `/api/config`;
2. если у Worker есть `TELEGRAM_BOT_USERNAME`, на странице рендерится Telegram widget;
3. после login Telegram возвращает auth payload;
4. фронтенд отправляет payload на `/api/auth/telegram`;
5. Worker валидирует `hash`;
6. создается или обновляется пользователь в D1;
7. создается сессия;
8. браузеру ставится `HttpOnly` cookie;
9. фронтенд дальше получает пользователя через `/api/me`.

### Что нужно для работы Telegram login

В Cloudflare для Worker `activity` должны быть настроены:

- `TELEGRAM_BOT_USERNAME` — обычная variable
- `TELEGRAM_BOT_TOKEN` — secret

Также через `@BotFather` должен быть привязан домен:

- `activity.serafimkx.workers.dev`

через команду:

- `/setdomain`

### Фронтенд-логика auth

Ключевые функции в [script.js](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/script.js):

- `loadAuthConfig()`
- `refreshCurrentUser()`
- `renderTelegramLoginWidget()`
- `renderAuthCard()`
- `window.handleTelegramAuth`
- `logoutTelegramUser()`

### Что видит пользователь

На экране `Профиль`:

- если не вошел — видит предложение войти через Telegram;
- если вошел — видит имя, username, аватар и кнопку `Выйти`.

## 8. Как устроен backend на Cloudflare Workers

Backend находится в:

- [src/worker.js](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/src/worker.js)

Это единый Worker entrypoint, который:

- обрабатывает `/api/*`;
- всё остальное отдает как static assets через `env.ASSETS.fetch(request)`.

### Важный принцип

Это **не Pages Functions**.

Проект сейчас приведен к схеме:

- один Worker;
- статические файлы как assets;
- API на том же Worker;
- D1 binding на том же Worker.

### Worker endpoints

Сейчас поддерживаются:

- `GET /api/config`
- `POST /api/auth/telegram`
- `GET /api/me`
- `POST /api/logout`
- `POST /api/game-sessions`
- `GET /api/profile/summary`

### Что делает каждый endpoint

#### `GET /api/config`

Возвращает публичную конфигурацию:

- `telegramBotUsername`

Это нужно фронтенду для рендера Telegram widget.

#### `POST /api/auth/telegram`

Принимает Telegram auth payload, валидирует его и создает сессию.

#### `GET /api/me`

Возвращает:

- авторизован ли пользователь;
- объект текущего пользователя.

#### `POST /api/logout`

Удаляет серверную сессию и сбрасывает cookie.

#### `POST /api/game-sessions`

Сохраняет завершенную игру для текущего пользователя.

#### `GET /api/profile/summary`

Возвращает:

- агрегированную статистику;
- последние игры пользователя.

## 9. База данных D1

SQL-схема находится в:

- [db/schema.sql](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/db/schema.sql)

### Таблицы

#### `users`

Хранит пользователей Telegram:

- `id`
- `telegram_user_id`
- `username`
- `first_name`
- `last_name`
- `photo_url`
- `created_at`
- `last_login_at`

#### `sessions`

Серверные сессии:

- `id`
- `user_id`
- `expires_at`
- `created_at`

#### `game_sessions`

История завершенных партий:

- `id`
- `user_id`
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
- `created_at`

### Важная operational-заметка

Если код с `game_sessions` уже задеплоен, но SQL-миграция ещё не применена в D1, сохранение истории будет ломаться на уровне backend-запроса.

При этом:

- сам сайт останется рабочим;
- игра останется рабочей;
- история просто не будет записываться.

То есть после любого изменения схемы SQL нужно **отдельно** применять миграцию в D1 Console или через Wrangler.

## 10. Как работает история игр и статистика

### Бизнес-правило

На текущем этапе:

- игра доступна бесплатно всем;
- история и статистика доступны только авторизованному пользователю;
- история сохраняется в профиль того пользователя, который авторизован и запускает игру на этом устройстве.

### Когда игра сохраняется

Партия сохраняется при `Game Over`.

На клиенте:

- при старте игры в `state` пишутся:
  - `currentDictionary`
  - `gameStartedAt`
- при завершении вызывается:
  - `saveFinishedGame(winner)`

### Что именно сохраняется

В `POST /api/game-sessions` уходит:

- начало партии;
- завершение партии;
- словарь;
- настройки;
- число команд;
- победитель;
- итоговая позиция;
- summary команд и игроков.

### Что показывается в профиле

В блоке `История и статистика`:

- всего игр;
- побед;
- винрейт;
- средняя длительность;
- любимый словарь;
- последние игры.

### Как сейчас считается победа

Для MVP победа считается так:

- backend смотрит завершенные игры пользователя;
- ищет победившую команду внутри `summary_json`;
- если среди игроков этой команды есть имя, совпадающее с `firstName` или `username` профиля, это считается победой пользователя.

Это рабочий, но неидеальный эвристический вариант.

### Ограничение текущего MVP

Если в команде не указан авторизованный пользователь как игрок, победа может не засчитаться как “личная”, даже если партия была его.

Это сознательное упрощение текущего этапа.

## 11. Как устроен деплой

### GitHub

Проект хранится в GitHub-репозитории:

- `serafimkx-prog/activity-game`

### Cloudflare

Cloudflare читает проект из GitHub и деплоит его как Worker.

Было подтверждено по build logs, что:

- Cloudflare делает `Cloning repository...`
- затем запускает `npx wrangler deploy`

### Конфигурация деплоя

Файл:

- [wrangler.jsonc](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/wrangler.jsonc)

Ключевые поля:

- `main: "src/worker.js"`
- `assets.directory: "."`
- `assets.binding: "ASSETS"`
- `assets.run_worker_first: ["/api/*"]`
- `d1_databases` с binding `DB`

### Почему нужен `.assetsignore`

Ранее Cloudflare пытался загружать как ассеты:

- `.git`
- `.wrangler`
- другие внутренние файлы

Поэтому был добавлен:

- [.assetsignore](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/.assetsignore)

Он исключает из static assets:

- `.git`
- `src`
- `db`
- `wrangler`-файлы
- `README`
- `GAME_SPEC`
- и прочие внутренние данные

## 12. Переменные и секреты Cloudflare

### Обычные переменные

В `wrangler.jsonc`:

- `APP_NAME`
- `TELEGRAM_BOT_USERNAME`

### Secrets

В Cloudflare должен быть secret:

- `TELEGRAM_BOT_TOKEN`

### D1 binding

В Worker должен быть binding:

- `DB`

Текущий `database_id` в конфиге:

- `87321b7e-452c-4a7a-b45f-0f70ab84c85f`

## 13. Что уже точно работает

На текущем этапе уже подтверждено, что работает:

- публикация сайта на Cloudflare;
- Worker backend;
- `GET /api/me`;
- Telegram login;
- серверная сессия;
- получение текущего пользователя;
- отдельный экран `Профиль`;
- UI логина / logout;
- верхнее выравнивание интерфейса;
- навигация `Новая игра / Правила / Профиль`.

Также уже написан код для:

- истории игр;
- статистики профиля.

Для их работы критично наличие таблицы `game_sessions` в D1.

## 14. Что сейчас в проекте потенциально хрупкое

### 1. Документация и код местами расходятся

Исторически в проекте были старые README/спеки, которые не всегда совпадают с актуальным кодом.

Например:

- раньше preview/timeouts и некоторые словарные метаданные уже расходились с реальным поведением.

### 2. `DRAW`-режим логически спорный

Поле рисования было удалено из UI как бессмысленное в текущей реализации, потому что в режиме объяснения слово было видно на том же экране.

Сама логика `DRAW` как режима в игре при этом осталась.

То есть режим существует как тип задания, но отдельного canvas-интерфейса больше нет.

### 3. Победы считаются через эвристику

Сейчас статистика побед опирается на имена игроков в победившей команде.

Это нормально для MVP, но в будущем лучше перейти на более явную модель участия пользователя в партии.

### 4. SQL-миграции пока ручные

Любая новая таблица в `db/schema.sql` должна отдельно применяться в D1.

Автоматической миграционной системы пока нет.

## 15. Что важно помнить при дальнейшей разработке

### Если меняется D1-схема

Нужно:

1. обновить `db/schema.sql`
2. применить SQL в D1 вручную или через Wrangler

### Если меняется auth/UI

Проверять:

- `/api/config`
- `/api/me`
- реальный логин через Telegram
- профильный экран

### Если меняется Worker

Проверять:

- build log Cloudflare
- что `wrangler.jsonc` валиден
- что `/api/*` маршруты идут в Worker
- что static assets не утекли наружу

## 16. Рекомендуемые следующие шаги

Если продолжать проект дальше, логичный порядок такой:

1. Убедиться, что `game_sessions` создана в D1 и история реально сохраняется.
2. Протестировать историю игр end-to-end:
   - сыграть короткую партию;
   - открыть `Профиль`;
   - проверить статистику.
3. Улучшить профиль:
   - пустые состояния;
   - более явное объяснение ценности авторизации.
4. Затем перейти к следующему продуктному слою:
   - `products`
   - `purchases`
   - `access`
5. После этого уже можно решать:
   - делать ли premium-словари;
   - делать ли bundle/подписку;
   - как именно монетизировать.

## 17. Самое краткое резюме проекта

Сейчас проект — это:

- браузерная игра Activity;
- полностью бесплатная по игровому доступу;
- с опубликованным сайтом на Cloudflare Workers;
- с Telegram-авторизацией;
- с серверными сессиями;
- с базой пользователей в D1;
- с подготовленной системой истории игр и статистики в профиле.

Если открыть только один файл, чтобы понять проект в целом, открывать нужно именно этот:

- [PROJECT_KNOWLEDGE_BASE.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/PROJECT_KNOWLEDGE_BASE.md)

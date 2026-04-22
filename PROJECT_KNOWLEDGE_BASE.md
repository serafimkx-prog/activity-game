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
- [.assetsignore](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/.assetsignore) — исключения для публикации static assets.
- [README.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/README.md) — краткое описание проекта.
- [GAME_SPEC.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/GAME_SPEC.md) — техническая спецификация по текущему коду.

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

### Визуальная модель

По коду и стилям интерфейс:

- тёмный;
- карточный;
- mobile-friendly;
- ограничен шириной `max-width: 600px`;
- прижат к верхней части viewport, а не центрируется вертикально.

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

Метаданные словарей загружаются через `loadDictionaries()` из [dictionaries.json](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/dictionaries.json).

Сейчас в файле есть:

- доступные словари:
  - `classic`
  - `geo`
- недоступные словари с `available: false`:
  - `cinema`
  - `sport`
  - `science`

При старте игры фронтенд загружает `dict.file` через `fetch()`.

После этого вызывается `initPools(data)`, которая создаёт перемешанные пулы слов по режимам и сложностям.

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

## 8. Таймеры и правила

### Preview

В `goPreview()`:

- слово показывается только на preview-экране;
- запускается countdown на `7` секунд;
- затем автоматически начинается `goExplaining()`.

### Основной таймер

В `goExplaining()` используется `state.config.turnTime`.

По умолчанию это `60` секунд, но пользователь может менять значение через stepper в setup-экране.

Текущее ограничение в UI:

- минимум `30`
- максимум `180`

### Открытый раунд

Открытый раунд возможен, если:

- включён чекбокс `open-round-enabled`;
- при выборе карточки сработал шанс `10%`.

В открытом раунде:

- UI показывает кнопки всех команд;
- угадавшая команда получает очки карточки;
- если выиграла не команда-исполнитель, команде-исполнителю даётся `+2`.

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

## 9. Профиль и клиентская auth-логика

Экран `Профиль` содержит:

- карточку аккаунта;
- слот под Telegram Login Widget;
- кнопку logout;
- блок `История и статистика`.

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

`POST /api/logout`

- удаляет серверную сессию;
- сбрасывает cookie.

`POST /api/game-sessions`

- сохраняет завершённую игру для текущего пользователя.

`GET /api/profile/summary`

- возвращает агрегированную статистику;
- возвращает список последних игр.

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
- `db`
- `src`
- `README.md`
- `GAME_SPEC.md`
- `wrangler.toml`
- `wrangler.json`
- `wrangler.jsonc`
- `node_modules`

## 17. Что точно подтверждается кодом

На текущий момент по репозиторию точно видно, что реализованы:

- локальный игровой процесс;
- настройка команд и игроков;
- выбор словаря;
- случайная генерация поля;
- preview перед раундом;
- обычные и открытые раунды;
- экран профиля;
- Telegram login flow на клиенте и backend;
- серверные сессии;
- сохранение завершённых игр;
- профильная summary-статистика;
- единый Worker для API и static assets.

## 18. Что не стоит утверждать без отдельной проверки

Этот документ намеренно не фиксирует как факт:

- конкретный production URL;
- состояние внешнего Cloudflare-окружения;
- состояние GitHub-деплоя;
- наличие секретов в реальном окружении;
- то, что все backend-фичи уже успешно прогнаны end-to-end.

Для таких утверждений нужна отдельная проверка окружения, а не только чтение локального кода.

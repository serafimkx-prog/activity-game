# Recent Project Changes

Этот файл фиксирует недавние изменения проекта, чтобы их не пришлось восстанавливать по переписке или git diff.

## 1. Словари

- Добавлен новый словарь [words_society.json](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/words_society.json) с темой `Общество`.
- Словарь `society` зарегистрирован в [dictionaries.json](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/dictionaries.json) и доступен в UI.
- Для составления новых словарей добавлен документ [DICTIONARY_RULES.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/DICTIONARY_RULES.md).
- В `society` были:
  - собраны базовые корзины;
  - расширены уровни `5`;
  - расширены уровни `4`;
  - убраны точные дубли;
  - убраны фразы длиннее `4` слов.

## 2. Фидбек По Сложности Слова

- На экране результата хода добавлен блок `Оценка сложности` с кнопками:
  - `Скорее 3`
  - `Скорее 4`
  - `Скорее 5`
- Фидбек привязан к конкретному слову, режиму и исходному уровню карточки.
- Сохраняются:
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

## 3. Где Хранится Фидбек

- На клиенте остался `localStorage` fallback с ключом:
  - `activity_dictionary_feedback_v1`
- Для авторизованных пользователей добавлено серверное сохранение в Worker API:
  - `POST /api/dictionary-feedback`
- В D1 добавлена таблица:
  - `dictionary_feedback`
- Схема добавлена в [db/schema.sql](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/db/schema.sql).
- Таблица `dictionary_feedback` уже создана в удалённой Cloudflare D1 и была проверена через `PRAGMA table_info(dictionary_feedback)`.

Важно:

- Изменение SQL-файла само по себе не обновляет удалённую D1.
- Для включения серверного сбора нужно отдельно применить SQL к базе Cloudflare D1.

## 4. Игровая Логика

- В открытом раунде теперь тоже обновляется очередь объясняющего:
  - `endOpenRound()` двигает `explainerIdx` так же, как обычный `endTurn()`.
- В `turnLog` для открытого раунда теперь явно сохраняется, кто был объясняющим игроком.

## 5. Сортировка Игроков В Команде

- Рейтинг игроков внутри команды теперь определяется так:
  - сначала по `pointsEarned` по убыванию;
  - при равенстве по `explanationTimeSeconds` по возрастанию;
  - затем по имени для стабильного порядка.
- Это влияет на порядок игроков в post-game summary и на бейдж `MVP команды`.

## 6. Восстановление Активной Игры

- Активная партия теперь сохраняется в `localStorage` под ключом:
  - `activity_active_game_v1`
- После обновления страницы фронтенд пытается восстановить:
  - команды;
  - позиции;
  - очередь объясняющего;
  - словарь;
  - поле;
  - пулы слов;
  - выбранную карточку;
  - текущий экран партии;
  - `turnLog`;
  - текущий фидбек по сложности.
- Снимок очищается после завершения партии и после рестарта игры.

## 7. Надёжное Сохранение Истории Игр

- Завершённая партия теперь сначала ставится в локальную очередь:
  - `activity_pending_game_sessions_v1`
- После этого клиент пытается отправить её в:
  - `POST /api/game-sessions`
- Если отправка не удалась, партия остаётся в очереди и будет отправлена повторно:
  - после следующего успешного входа;
  - при событии `online`.
- На backend добавлена дедупликация `game_sessions`, чтобы повторная отправка не создавала дубль одной и той же партии.

## 8. Конфигурация Telegram-Бота

- `TELEGRAM_BOT_USERNAME` больше не должен жить только в Cloudflare dashboard.
- Он теперь зафиксирован в [wrangler.jsonc](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/wrangler.jsonc):
  - `activity_auth_bot`
- Это сделано потому, что `wrangler deploy` перезаписывал dashboard-значение пустым значением из репозитория.

## 9. Что Нужно Помнить Дальше

- `classic` остаётся бесплатным, `geo` открывается после входа через Telegram, а `society` остаётся платным словарём.
- Каталог словарей теперь приходит через `GET /api/dictionaries`, а не только из статического `dictionaries.json`.
- Premium-словари нельзя считать защищёнными только через UI:
  Worker отдельно проверяет доступ к их JSON-файлам.
- Для хранения доступов добавлена таблица `user_dictionary_access` в [db/schema.sql](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/db/schema.sql).
- Для покупок premium-словарей добавлена таблица `purchase_orders` и endpoints `POST /api/purchase/create` и `POST /api/payment/webhook/yookassa`.
- Если добавляем новые словари, ориентируемся на [DICTIONARY_RULES.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/DICTIONARY_RULES.md).
- Если меняем форму или смысл фидбэка по сложности, надо синхронно смотреть:
  - [index.html](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/index.html)
  - [style.css](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/style.css)
  - [script.js](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/script.js)
  - [src/worker.js](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/src/worker.js)
  - [db/schema.sql](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/db/schema.sql)
- Если меняем механику восстановления игры или надёжность сохранения истории, надо синхронно смотреть:
  - [script.js](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/script.js)
  - [src/worker.js](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/src/worker.js)
  - [wrangler.jsonc](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/wrangler.jsonc)
- Этот файл, [README.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/README.md), [GAME_SPEC.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/GAME_SPEC.md) и [PROJECT_KNOWLEDGE_BASE.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/PROJECT_KNOWLEDGE_BASE.md) нужно обновлять вместе, если меняется зафиксированное поведение проекта.

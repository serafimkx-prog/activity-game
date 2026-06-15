# Recent Project Changes

Этот файл фиксирует недавние изменения проекта, чтобы их не пришлось восстанавливать по переписке или git diff.

## 1. Словари

- Добавлен новый словарь [words_society.json](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/words_society.json) с темой `Общество`.
- Добавлен новый словарь [words_around_us.json](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/words_around_us.json) с темой `Вокруг нас`.
- Словарь `society` зарегистрирован в [dictionaries.json](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/dictionaries.json) и доступен в UI.
- Словарь `around_us` зарегистрирован в [dictionaries.json](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/dictionaries.json) и доступен в UI.
- Словарь `sport` убран из публичного каталога, а `around_us` используется как опубликованный релизный словарь вместо него.
- Словарь `around_us` переведён в premium-модель: он продаётся через тот же механизм покупок и серверной защиты, что и `society`.
- Словарь `around_us` пересобран как самостоятельный набор без заимствования карточек из других словарей.
- В `around_us` отдельно усилены блоки про хобби, спорт, активный отдых, творчество и походные сцены.
- Для составления новых словарей добавлен документ [DICTIONARY_RULES.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/DICTIONARY_RULES.md).
- В [DICTIONARY_RULES.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/DICTIONARY_RULES.md) дополнительно зафиксированы правила кластерного расширения словарей, непересечения с другими словарями, снижения повторяемости формулировок и отдельный фильтр для `DRAW`.
- В [DICTIONARY_RULES.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/DICTIONARY_RULES.md) отдельно сохранён рабочий пайплайн сборки нового словаря: от роли и кластеров до раскладки по 9 корзинам, редакторских проходов, проверок и публикации.
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
- В этот же блок добавлена отдельная пометка `Слишком сложная карточка`, чтобы отмечать слова на возможное удаление или пересмотр.
- Фидбек привязан к конкретному слову, режиму и исходному уровню карточки.
- Сохраняются:
  - `feedbackId`
  - `dictionaryId`
  - `dictionaryName`
  - `word`
  - `mode`
  - `originalLevel`
  - `ratedLevel`
  - `markForRemoval`
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
- Для `dictionary_feedback` добавлено поле `mark_for_removal` для явной пометки слишком сложных карточек.
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

- `classic` остаётся бесплатным, `geo` открывается после входа через Telegram, а `society` и `around_us` остаются платными словарями.
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

## 10. Последние UI-Уточнения

- В setup-экране степпер времени хода заменён на ползунок:
  - по умолчанию `60` секунд;
  - минимум `30`;
  - максимум `120`;
  - шаг `10`.
- Карточки словарей стали компактнее:
  - описание словаря вынесено в tooltip по значку `i`;
  - `Общество` показывает бейдж `149 руб.`;
  - у доступных словарей внизу показывается `Выбран` или `Выбрать`;
  - подпись количества везде унифицирована как `Карточек: N`.
- На setup-экране убран блок с юридическим и платёжным описанием.
  Теперь он живёт в профиле, в разделе `Покупки и доступ`.
- В профиле `Любимый словарь` перенесён внутрь основной сетки статистики и больше не дублируется отдельной строкой под блоками.

## 11. SEO И Поисковые Страницы

- Главная страница усилена под запросы `активити онлайн`, `Activity онлайн`, `играть в Activity онлайн`:
  - H1 изменён на `Активити Онлайн`;
  - SEO-intro сначала был добавлен над настройками игры, затем убран из первого экрана, чтобы главная оставалась game-first;
  - внутренние ссылки на поисковые посадочные страницы перенесены в тихий нижний блок `Об Activity онлайн` ниже игровых настроек;
  - добавлен JSON-LD `WebApplication`.
- Добавлены статические страницы:
  - `/activity-online/`
  - `/rules/`
  - `/words/`
  - `/dictionaries/`
  - `/games-for-company/`
  - `/crocodile-alias-activity/`
- [sitemap.xml](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/sitemap.xml) расширен: теперь включает главную, SEO-страницы и юридические страницы.
- В корень сайта добавлен IndexNow key-файл `7f3a9c1e4b8d43f6916a2c0e5d9b7a84.txt`, чтобы отправлять новые и обновлённые URL в поисковые системы, поддерживающие IndexNow.
- После UX/SEO/QA-аудита верхняя SEO-карточка убрана с первого экрана, subtitle укорочен, нижние SEO-ссылки сделаны менее навязчивыми, а mobile-стили уплотнены для игрового setup.
- На юридические страницы добавлены `description` и `canonical`.
- В [offer/index.html](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/offer/index.html) и [access/index.html](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/access/index.html) синхронизированы словари: `geo` бесплатен после входа, `society` и `around_us` платные.

## 12. ИИ-Конвейер Разработки

- В корень проекта добавлен [AGENTS.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/AGENTS.md) — стартовый файл для ИИ-модели или coding agent с картой проекта, источниками истины, правилами изменений, обязательным pipeline, проверками и release handoff. Зафиксирована триггерная фраза: `посмотри стартовый файл`.
- Добавлена папка [.agent-pipeline](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/.agent-pipeline) с регламентом прохождения нетривиальных изменений через роли и quality gates.
- В [.agent-pipeline/AGENT_PIPELINE.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/.agent-pipeline/AGENT_PIPELINE.md) описаны отдельные цепочки для:
  - UI/frontend-изменений;
  - игровой логики;
  - backend/auth/payment;
  - словарей;
  - SEO/static pages.
- В [.agent-pipeline/QUALITY_GATES.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/.agent-pipeline/QUALITY_GATES.md) зафиксированы стоп-гейты для frontend implementation, design adequacy, gameplay logic, backend/auth/payment, dictionary quality, docs sync и release.
- В [.agent-pipeline/TASK_TEMPLATE.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/.agent-pipeline/TASK_TEMPLATE.md) добавлен шаблон task-журнала, который должен заполняться по этапам.
- В [.agent-pipeline/agents](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/.agent-pipeline/agents) добавлены инструкции для ролей:
  - Intake;
  - Project Context Reader;
  - UX Planner;
  - Frontend Developer;
  - Backend Developer;
  - Game Logic Reviewer;
  - Design Adequacy Reviewer;
  - Security and Data Reviewer;
  - Functional QA;
  - Docs Sync;
  - Release Manager.

## 13. План Переработки Словарей

- Добавлен [DICTIONARY_REWORK_PLAN.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/DICTIONARY_REWORK_PLAN.md) — ТЗ и план глубокой работы над текущими словарями и новыми словарями `Мир кино` / `Наука и природа`.
- Добавлен [tools/dictionary_audit.mjs](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/tools/dictionary_audit.mjs) — воспроизводимый скрипт технического аудита словарей.
- Сгенерирован [DICTIONARY_AUDIT_REPORT.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/DICTIONARY_AUDIT_REPORT.md) с размерами корзин, mismatch `wordCount`, дублями, пересечениями и повторяющимися паттернами.
- Добавлен [DICTIONARY_EDITORIAL_REVIEW.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/DICTIONARY_EDITORIAL_REVIEW.md) с приоритетами чистки текущих словарей.
- Добавлен [DICTIONARY_INTERSECTION_DECISIONS.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/DICTIONARY_INTERSECTION_DECISIONS.md) с классификацией оставшихся пересечений после cleanup-проходов.
- Добавлен [DICTIONARY_BLUEPRINT_CINEMA_SCIENCE.md](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/DICTIONARY_BLUEPRINT_CINEMA_SCIENCE.md) с кластерами и примерами для будущих словарей.
- Выполнен первый высокоуверенный cleanup-проход по `classic`:
  - `wordCount` в [dictionaries.json](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/dictionaries.json) исправлен с `922` на фактические `900`;
  - в [words.json](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/words.json) убраны внутренние точные дубли;
  - фраза длиннее `4` слов `рубить сук на котором сидишь` заменена на `рубить сук`;
  - после повторного аудита у `classic` нет mismatch `wordCount`, длинных фраз и internal duplicate groups.
- Выполнены high-confidence cleanup-проходы пересечений `classic` с `geo` и `society`; количество точных duplicate/intersection groups снижено с `72` до `9`.
- Выполнен targeted cleanup однотипных серий в [words_society.json](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/words_society.json):
  - снижены серии `у входа`, `у сцены`, `во дворе`, `в чате`;
  - после проверки у `society` нет внутренних дублей, длинных фраз и mismatch `wordCount`.
- Созданы подготовленные hidden-словари:
  - [words_cinema.json](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/words_cinema.json) — `Мир кино`, `800` карточек;
  - [words_science.json](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/words_science.json) — `Наука и природа`, `700` карточек.
- Добавлен [tools/build_new_dictionaries.mjs](/Users/k-serafim/Yandex.Disk.localized/activity-game — копия/tools/build_new_dictionaries.mjs) — генератор текущих черновиков `Мир кино` и `Наука и природа`.
- После финального аудита 6 словарей:
  - все `wordCount` совпадают;
  - фраз длиннее `4` слов нет;
  - внутренних duplicate groups нет;
  - `cinema` и `science` не добавили новых точных пересечений;
  - `cinema` и `science` остаются `available: false`, публикация и модель доступа не менялись.

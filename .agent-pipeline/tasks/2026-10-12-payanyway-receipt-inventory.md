# PayAnyWay NPD Receipt Inventory

## 1. Intake

Agent: Intake
Verdict: pass

Goal: устранить причину отсутствия автоматического НПД-чека после успешной покупки словаря.

User scenario: покупатель оплатил 149 ₽ через СБП; PayAnyWay завершил операцию, Activity выдал доступ, но в истории Self.PayAnyWay осталась ссылка `Создать` вместо автоматического чека.

Acceptance criteria:

- подписанный callback продолжает идемпотентно выдавать только оплаченные права;
- успешный Pay URL возвращает валидную серверную номенклатуру для чека;
- сумма строки номенклатуры точно совпадает с суммой заказа;
- GET, POST и повторный callback проходят одинаково;
- ошибки и поддельные callback не получают номенклатуру и не выдают доступ;
- документация и production follow-up зафиксированы.

Out of scope: фактический возврат 149 ₽ и автоматизация возвратов.

Relevant pipeline: Backend / Auth / Payment.

## 2. Project Context

Agent: Project Context Reader
Verdict: pass

Files reviewed:

- `AGENTS.md`
- `.agent-pipeline/AGENT_PIPELINE.md`
- `.agent-pipeline/QUALITY_GATES.md`
- `src/worker.js`
- `src/lib/payanyway.mjs`
- `tools/payment_worker_check.mjs`
- `README.md`
- `PROJECT_KNOWLEDGE_BASE.md`
- `.agent-pipeline/tasks/2026-10-11-payanyway-one-time-pack.md`

Confirmed facts:

- PayAnyWay повторил GET callback после production-исправления; операция стала выполненной.
- Remote D1 вернул `succeeded`, сохранённый provider operation и ровно одно активное право.
- Автоматические чеки в Self.PayAnyWay включены.
- Страница ручного чека указала причину: ответ интернет-магазина был без номенклатуры.
- Официальная спецификация требует XML-атрибут `INVENTORY` в Pay URL response для этого сценария.

Existing constraints: секреты не выводятся и не сохраняются; цена и состав товара принадлежат серверному каталогу; доступ выдаётся только после проверки подписи и точного совпадения заказа.

Initial risks: XML/JSON escaping, несовпадение суммы чека, неверный предмет расчёта, выдача номенклатуры на ошибочный callback.

## 3. Plan

Agent: Backend Architect
Verdict: pass

Affected layers: Worker Pay URL response, server product catalog, payment integration tests, operational docs.

Affected files:

- `src/lib/payanyway.mjs`
- `src/worker.js`
- `tools/payment_worker_check.mjs`
- `README.md`
- `PROJECT_KNOWLEDGE_BASE.md`
- `RECENT_PROJECT_CHANGES.md`

Implementation plan:

1. Добавить отдельные безопасные названия для чека в серверный каталог.
2. Формировать одну строку `INVENTORY` на точную сумму продукта.
3. Возвращать её только в успешном подтверждённом Pay URL response.
4. Проверить XML, GET/POST, replay, продукты и негативные сценарии.
5. Выполнить dry-run, затем deploy из чистого SHA и production-проверку.

Rollback plan: redeploy предыдущего проверенного SHA; выдача доступа и схема D1 не меняются.

## 4. Implementation

Agent: Backend Developer
Verdict: pass

Changed files: перечислены в плане.

Implementation summary:

- Добавлен `receiptTitle` для трёх словарей и комплекта.
- Успешный Pay URL XML содержит `MNT_ATTRIBUTES / INVENTORY`.
- Номенклатура содержит `price` из серверного каталога, `quantity: 1`, `vatTag: 1105`, `pm: full_payment`, `po: service`.
- XML и вложенный JSON экранируются перед отправкой.

Important decisions: цифровой доступ предоставляется сразу после оплаты, поэтому используется полный расчёт и объект `услуга`; пользовательские строки в номенклатуру не попадают.

Known risks: уже завершённая операция не получит новый response повторно; провайдер предлагает для неё возврат по СМС-паролю, а не ретроспективное дополнение номенклатуры.

## 5. Specialist Review

Agent: Security and Data Reviewer
Verdict: pass

Findings:

- Проверка подписи, account/order/amount/currency/user/test-mode и наличие provider operation выполняются до выдачи доступа и номенклатуры.
- Цена и название чека не принимаются от клиента или callback.
- Replay остаётся идемпотентным и возвращает ту же номенклатуру.
- Секреты, персональные данные и номера production-операций в diff не добавлены.

Required fixes: none.

Optional polish: после следующей покупки проверить фактическую доставку чека покупателю.

Routed back to: API QA.

## 6. Functional QA

Agent: API QA
Verdict: pass locally

Checks performed:

- Node 22 syntax checks for affected JS/MJS files.
- `tools/payment_check.mjs`.
- `tools/smoke_check.mjs` — 309 assertions.
- Fresh local D1 + Wrangler Worker + `tools/payment_worker_check.mjs`.
- `git diff --check`.
- Wrangler 4.149.0 deploy dry-run.

Results: all passed. Full Worker test covered individual products, bundle, GET, POST, replay, exact inventory, mismatches, forged signatures, protected assets and removed subscription API.

Regressions found: none.

Unverified scenarios: live automatic NPD receipt after deploying the new response.

## 7. Docs Sync

Agent: Docs Sync
Verdict: pass

Docs reviewed: README, project knowledge base, recent changes, canonical Activity journal.

Docs changed: receipt inventory contract, live payment outcome, manual follow-up for the existing receipt.

Docs not changed because: no gameplay or D1 schema behavior changed.

## 8. Release Check

Agent: Release Manager
Verdict: pass

Diff reviewed: scoped to PayAnyWay receipt inventory, tests and docs.

Commands run: recorded in Functional QA.

Manual checks: Self.PayAnyWay operation completed; automatic receipt setting enabled; provider diagnostic explicitly reported missing nomenclature; remote D1 initially succeeded with one entitlement. После пользовательского возврата кабинет показал отдельную операцию на полную сумму со статусом `выполнена` и нулевой баланс.

Deploy follow-up: commit `ac9673a` pushed and deployed from a clean detached worktree with checkout explicitly enabled. Production `/api/config` returned `paymentCheckoutReady: true`; unsigned GET callback returned `FAIL` with HTTP 200; a protected paid asset remained 401 without a session.

D1 follow-up: соответствующий production-заказ переведён из `succeeded` в `refunded`; его единственное право отозвано. Контрольный SELECT вернул `active_entitlements = 0`.

Secret or config follow-up: none.

Cache follow-up: none expected for Worker API response.

Open risks: live automatic check creation remains unverified until a new controlled payment. Исходный чек контрольной покупки не был создан, поэтому в Self.PayAnyWay отсутствовал чек, который можно было бы аннулировать при возврате; перед повторным тестом это нужно сверить с разделом операций в «Моём налоге».

Ready to hand back: yes for the receipt-response fix and reconciliation of the refunded order; the second live receipt test remains an explicit financial follow-up action.

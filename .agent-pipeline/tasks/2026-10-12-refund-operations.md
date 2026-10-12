# Refund Operations

## 1. Scope

Цель: безопасно сверить в production последнюю уже возвращённую покупку и оставить воспроизводимый внутренний процесс для будущих подтверждённых продавцом возвратов.

В scope: exact-order D1 reconciliation, dry-run/apply guardrails, идемпотентность, тесты и документация.

Вне scope: публичный self-service, Worker/admin endpoint, автоматическое решение о возврате, вызов refund API провайдера, deploy и миграция схемы.

## 2. Подтверждённые исходные факты

- Пользователь подтвердил, что новая покупка `dictionary_cinema` за 149 ₽ возвращена в Self.PayAnyWay; для самой покупки автоматический НПД-чек был создан.
- До сверки remote D1 содержал два Self.PayAnyWay-заказа: прежний был `refunded` с нулём активных прав; новый был `succeeded` с одним активным `cinema` entitlement.
- Read-only запрос подтвердил, что новый заказ — единственный exact-кандидат и самый поздний Self.PayAnyWay-заказ. В отчёт и diff его ID, provider operation, пользователь и платёжные реквизиты не выводились.
- Production checkout до изменения: `paymentCheckoutReady: true`.

## 3. Архитектура

- `tools/refund_order.mjs` принимает только точный положительный internal order ID (`--order-id` или `--order-id-file`) и явный `--local`/`--remote`.
- Dry-run — режим по умолчанию. Apply требует одновременно `--apply --refund-confirmed`.
- Preflight сверяет provider, код товара, точные сумму/валюту, наличие provider payment и `paid_at`, серверный список entitlements и фактические order-scoped строки.
- Разрешены только `succeeded` и `refunded`. Pending/failed/canceled, неизвестный товар, неполный или лишний набор прав завершают работу без изменений.
- Сначала guarded UPDATE переводит только выбранный `succeeded` заказ в `refunded`; текущая выдача доступа немедленно fail-closed, потому что читает только `succeeded`.
- Затем guarded UPDATE ставит `revoked_at` только на точные права этого заказа. Если процесс прерван между шагами, повтор распознаёт `refunded` + active как `repair_revocation` и завершает операцию.
- Финальный SELECT обязан подтвердить `refunded` и ноль активных прав. Повторный apply — no-op.
- Raw D1/provider payload, account/user/order/provider identifiers и реквизиты не печатаются.
- `tools/` и markdown исключены из Worker assets; публичного endpoint или UI не появилось.

## 4. Реализация

Добавлены:

- `tools/refund_order.mjs`;
- `tools/refund_order_check.mjs`;
- `tools/refund_order_local_check.mjs`;
- `REFUND_OPERATIONS.md`.

Обновлены README, knowledge base и recent changes. Схема D1 и production Worker не менялись.

## 5. Production reconciliation

1. Обезличенный read-only preflight: два Self-заказа, один безопасно возвращённый, один exact latest target со статусом `succeeded` и одним активным правом.
2. Exact ID был передан инструменту через временный файл и не появился в выводе или документации.
3. Dry-run вернул `ready`, продукт `dictionary_cinema`, одно активное право.
4. После явного apply инструмент подтвердил `already_reconciled` и `activeEntitlementCount: 0`.
5. Независимый post-check: `total_payanyway_orders=2`, `safely_refunded_orders=2`, `active_succeeded_orders=0`, `total_active_entitlements=0`.
6. Повторный production apply вернул тот же безопасный итог без изменений.
7. После reconciliation `/api/config` сохранил `paymentCheckoutReady: true`; прямой неавторизованный запрос `/words_cinema.json` вернул `401`.

Ни deploy, ни remote migration не выполнялись.

## 6. Проверки

- `npx -y node@22 --check tools/refund_order.mjs` — pass.
- `npx -y node@22 --check tools/refund_order_check.mjs` — pass.
- `npx -y node@22 --check tools/refund_order_local_check.mjs` — pass.
- `npx -y node@22 tools/refund_order_check.mjs` — pass, 41 assertions.
- `npx -y node@22 tools/refund_order_local_check.mjs` — pass, 12 assertions на fresh local D1: dry-run, targeted apply, unrelated orders, replay, interrupted-state repair, missing order.
- `npx -y node@22 tools/payment_check.mjs` — pass.
- `npx -y node@22 tools/smoke_check.mjs` — pass, 309 assertions, включая protected assets и отсутствие subscription API.
- `npx -y -p node@22 -p wrangler@4.149.0 wrangler deploy --dry-run --outdir /tmp/activity-refund-ops-dry-run` — pass; deploy не выполнялся.
- Production read-only smoke после reconciliation: checkout ready, premium asset без сессии — 401.
- `git diff --check` — pass.

Полный local Worker payment suite не повторялся: Worker, callback, checkout, schema и assets не менялись; пропорциональные regression-проверки покрыты неизменёнными payment/smoke наборами, свежим D1 e2e нового инструмента и production read-only smoke.

## 7. Риски и эксплуатация

- Инструмент не подтверждает денежный возврат самостоятельно: это обязательное решение продавца до `--refund-confirmed`.
- Он не отменяет НПД-чек: возвратный чек проверяется в Self.PayAnyWay/«Мой налог» до D1 reconciliation.
- Для текущей операции возврат денег и автоматический чек покупки подтверждены владельцем; отдельная независимая проверка возвратного НПД-чека из D1 невозможна и не выполнялась.
- Internal order ID нужно получать из точной серверной/провайдерской сверки и не отправлять в публичные сообщения. Никакого поиска «последнего похожего заказа» внутри apply-инструмента нет.
- При несовпадении данных работу нужно остановить, сохранить dry-run без PII и разбирать исходный заказ; ослаблять guards нельзя.

# Self.PayAnyWay One-Time Dictionary Purchases

## Goal

Replace the unreleased 29 RUB monthly subscription with one-time Self.PayAnyWay purchases that permanently unlock paid dictionaries for the authenticated Activity account.

## Canonical product rules

- `classic`: anonymous access.
- `geo` and `society`: free after login.
- `around_us`, `cinema`, and `science`: individually purchasable paid dictionaries.
- Price: 149 RUB for one dictionary or 379 RUB for the bundle of all three instead of 447 RUB.
- The bundle is a separate fixed-price product. Earlier individual purchases do not reduce its 379 RUB price; there is no upgrade or credit flow.
- No recurring charge, renewal, cancellation, or trial.
- Provider: Self.PayAnyWay, with automatic NPD income registration and buyer receipt enabled and verified before release.
- User-facing wording must say that the payment is one-time and access remains in the account.

## Scope

- Confirm the actual Self.PayAnyWay checkout and integration mode available to the user's self-employed account.
- Add a provider adapter for payment creation, signed callbacks, status verification, refunds, and test mode as supported by the account.
- Reuse or migrate the existing purchase/access model for individual dictionary and three-dictionary bundle products.
- Grant the exact purchased dictionary or all three bundle dictionaries idempotently after a verified successful payment.
- Preserve Worker protection for direct dictionary asset requests.
- Replace all subscription copy and controls with a concise one-time purchase card.
- Remove unreleased recurring billing, subscription consent, renewal cron, and cancellation/resume paths from the release implementation.
- Update offer/access/privacy/support documentation and reproducible tests.

## Boundaries

- Do not deploy to production or apply remote D1 migrations before owner acceptance.
- Do not expose, copy, print, or store account credentials, signing keys, cookies, or MFA data in chat, Git, Obsidian, logs, or task journals.
- Account access follows `account-access`; reusable secrets may only enter through an approved protected mechanism. The current vault broker cannot reveal or inject secrets into arbitrary processes.
- Do not rely on frontend success redirects to grant access; only a verified server callback or server-side provider status check may do so.
- Do not publish a payment flow until automatic NPD receipt behavior is confirmed with a test transaction.

## Acceptance criteria

- A logged-in unpaid user sees each paid dictionary at 149 RUB and a clear `Все три за 379 ₽` bundle offer.
- The UI does not calculate or promise upgrade credit for earlier individual purchases.
- A successful verified individual purchase grants only that dictionary and survives logout/login.
- A successful verified bundle purchase grants all three dictionaries and survives logout/login.
- Duplicate or replayed callbacks do not duplicate orders or change access incorrectly.
- Forged, failed, canceled, or mismatched callbacks grant nothing.
- Direct requests for paid JSON assets remain blocked without entitlement.
- No subscription, renewal, cancellation, or recurring-consent UI remains.
- A refund test has a documented entitlement policy and verified behavior.
- Automatic NPD receipt creation and buyer delivery are confirmed in test mode or with one controlled live payment.
- `node --check`, project smoke tests, payment-focused tests, `git diff --check`, and Wrangler dry-run pass.
- Repository and canonical Activity documentation match the implemented model.

## Verification and handoff

- Record exact commands and results in this file.
- Record account-side settings only as non-secret metadata.
- Return to `Осн Activity` with changed files, test evidence, unresolved risks, and explicit production steps.

## Status

- 2026-10-11: local implementation and local verification completed. Production, remote D1, provider account and real money were not changed. Release remains blocked by the account-side and controlled-live-payment checks listed below.

## Official provider research

Only official provider sources were used:

- [MONETA.Assistant payment form](https://docs.moneta.ru/assistant/v1/index.print.html): canonical checkout endpoint, request fields, MD5 request signature, Pay URL and Check URL signatures, signed XML responses, result codes and replay behavior.
- [Pay URL notification](https://docs.moneta.ru/assistant/v1/pay-notification/): payment notification contract and retry behavior.
- [PayAnyWay payment form v2](https://docs.payanyway.ru/payment-form-v2): current payment-form surface.
- [Self.PayAnyWay](https://self.payanyway.ru/): self-employed product, fees, payment forms, receipts and automatic/manual tax reporting.
- [Official PayAnyWay Tilda guide](https://payanyway.ru/info/w/ru/public/blog/kak-podklyuchit-onlayn-oplatu-na-tilda.htm): account fields, Pay URL setup, Self account with test mode disabled, and controlled real payment/refund recommendation.
- [Self-employed refund API](https://docs.payanyway.ru/marketplace/samozanyatye/zaprosy-dlya-raboty-s-fns/29.-vozvrat-po-operacii): payment refund exists and NPD receipt reversal is a separate action.
- [NPD income/receipt API](https://docs.payanyway.ru/marketplace/samozanyatye/scenarii-ispolzovaniya-npd-api/8.-registraciya-dokhoda-v-fns-i-8.-pechat-cheka): broader NPD API contract; it is not assumed to be available to this simple Self account until account-side verification.

Confirmed protocol decisions:

- Checkout is a server-signed HTML `POST` to `https://www.payanyway.ru/assistant.htm`.
- Checkout signature is MD5 of account, transaction, two-decimal amount, currency, subscriber, mode and integrity code in the documented order.
- Check URL signature additionally begins with `MNT_COMMAND`; Pay URL includes the provider operation ID.
- A browser success redirect never grants access. Only the signed Pay URL callback does.
- Pay URL can be retried; repeat success must be acknowledged idempotently.
- The Self.PayAnyWay account product does not use test mode, so this account requires a small controlled real payment followed by a refund before release. This does not apply to MONETA.Assistant generally: its standard/demo contours support test mode.
- Public pages say Self.PayAnyWay can send receipts and report income automatically, but the exact automatic NPD setting and buyer receipt delivery still require confirmation in this account.

## Local architecture implemented

Agent: Backend Architect / Backend Developer
Verdict: pass locally
Input reviewed: canonical Activity docs, repository sources, previous subscription journal, official provider documentation.
Work performed:

- Added fixed server product catalog in `src/lib/payanyway.mjs`: three products at `149.00 RUB` and one fixed bundle at `379.00 RUB`.
- Added official checkout, Check URL, Pay URL and signed-response helpers with constant-time signature comparison.
- Added `POST /api/purchase/create`; price, currency, Telegram-linked user and exact entitlements are server-owned.
- Added POST-only `/api/payment/check/payanyway` and `/api/payment/webhook/payanyway`. GET is rejected with 405 so signed callback parameters do not enter URLs or access logs.
- Enforced exact account/order/amount/currency/user/test-mode matching. Invalid signatures receive no signed oracle response.
- Added one active pending order per Self.PayAnyWay user/product and safe reuse of a pending order.
- Added order-scoped `purchase_order_entitlements`; grants are atomic and idempotent. A closed refunded/canceled order is never re-granted by callback replay.
- Preserved legacy `user_dictionary_access` rows without destructive migration.
- Removed unreleased subscription routes, cron, schema and UI from the release implementation.
- Kept checkout fail-closed behind `PAYANYWAY_CHECKOUT_ENABLED=false`.

Data model:

- `purchase_orders` is the immutable order/payment record: product, exact amount/currency, provider, opaque transaction ID, provider operation ID, test mode and expiry.
- `purchase_order_entitlements` records only the exact dictionaries granted by that order and supports `revoked_at` for a confirmed refund.
- Fresh schema omits unreleased subscription tables. The additive migration only adds fields/indexes/table and never deletes legacy data.

## Frontend and legal copy

Agent: Frontend Developer / Docs Sync
Verdict: pass locally
Work performed:

- Each paid dictionary shows `149 ₽`; the profile presents `Все три за 379 ₽` and `вместо 447 ₽`.
- Copy states one payment, no auto-renewal and permanent account access; it does not promise upgrade credit.
- Checkout is submitted as a server-signed POST form and the client restricts the action host to `www.payanyway.ru`.
- Already owned dictionaries render as playable from backend entitlements.
- Updated offer, access and privacy pages; added `/support/` with payment/access/refund instructions.

## Refund policy

- A refund is initiated in the provider only after identifying the exact `purchase_orders` row by provider operation/order ID.
- After the provider confirms the refund, its NPD receipt must be reversed separately if the provider did not do that automatically.
- Only then mark that order `refunded` and set `revoked_at` on its `purchase_order_entitlements` rows in one controlled database operation.
- Other orders and legacy manual grants are not revoked. For a bundle refund, all three rights from that bundle are revoked together.
- The local D1 test confirmed a refunded individual order loses only its dictionary, keeps other purchases, and a replayed signed Pay URL callback does not restore access.
- No public refund/admin endpoint was added because the simple Self account's refund credentials and automated receipt-reversal contract are not yet verified.

## Verification evidence

Agent: Security and Data Reviewer / API QA / Functional QA
Verdict: pass locally; live provider verification blocked

Commands and results:

- `npx -y node@22 --check script.js` — pass.
- `npx -y node@22 --check src/worker.js` — pass.
- `npx -y node@22 --check src/lib/payanyway.mjs` — pass.
- `npx -y node@22 --check tools/payment_check.mjs` — pass.
- `npx -y node@22 --check tools/payment_worker_check.mjs` — pass.
- `npx -y node@22 tools/payment_check.mjs` — pass: official checkout/Pay/Check/response signature vectors, all products, exact match failures, forged signature and replay contract.
- `npx -y node@22 tools/smoke_check.mjs` — pass, 309 assertions.
- `git diff --check` — pass.
- `npx -y -p node@22 -p wrangler@4.149.0 wrangler deploy --dry-run --outdir /tmp/activity-payanyway-dry-run-final` — pass; no deploy performed.
- Local Wrangler D1 execution of the previous committed schema followed by `db/migrations/2026-10-11-payanyway-one-time-products.sql` — pass; fields, indexes and entitlement table present.
- Fresh local D1 plus local Worker and `tools/payment_worker_check.mjs` — pass: GET on both callback endpoints returns 405; POST covers all three individual products, bundle, pending reuse, Check 402/200, replay, wrong amount/currency/user/order/test mode, forged signature, direct asset protection and absence of old subscription endpoints.
- Local refund simulation — pass: `around_us` changed from 200 to 403, unrelated `cinema` and `science` remained 200, replayed callback left refunded access revoked.

No production URL, remote database, live secret or real payment was used.

## Release blocker and exact next actions

The current broker cannot reveal or inject account credentials, and this task did not request or store them. The owner must perform the account-side step in the already authenticated Self.PayAnyWay session:

1. Confirm the business account is active for website checkout and automatic NPD income registration/buyer receipt delivery is enabled.
2. Set Check URL to `https://activity-game.ru/api/payment/check/payanyway`, Pay URL to `https://activity-game.ru/api/payment/webhook/payanyway`, and the account's callback `HTTP Method` to `POST`; set success/fail/return pages to Activity URLs. Do not select GET because signed parameters would enter URLs and access logs.
3. Create or confirm the integrity code and note the business account number without putting either value in chat or Git.
4. Release operator applies the additive remote D1 migration, stores `PAYANYWAY_ACCOUNT_ID` and `PAYANYWAY_INTEGRITY_CODE` as Cloudflare secrets, deploys with checkout still disabled, and verifies the endpoints.
5. Enable checkout only for a controlled real low-value verification product/transaction permitted by the account, confirm the Pay callback, entitlement, automatic NPD receipt and buyer delivery, then refund and confirm both money refund and receipt reversal.
6. After the controlled test passes, restore the production prices if temporarily changed, set `PAYANYWAY_CHECKOUT_ENABLED=true`, deploy from a clean accepted commit, and run production smoke/access checks.

Until all six steps pass, checkout must remain disabled and this payment release is not production-ready.

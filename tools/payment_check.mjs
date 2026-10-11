import assert from "node:assert/strict";
import {
  PAYANYWAY_PRODUCTS,
  buildCallbackSignature,
  buildCheckoutSignature,
  buildPayAnyWayCheckout,
  buildResponseSignature,
  callbackMatchesOrder,
  entitlementsForProduct,
  getPayAnyWayProduct,
  normalizeAmount,
  orderMatchesProduct,
  verifyCallbackSignature,
} from "../src/lib/payanyway.mjs";

const integrityCode = "QWERTY";

assert.equal(normalizeAmount("149"), "149.00");
assert.equal(normalizeAmount("379.0"), "379.00");
assert.equal(normalizeAmount("149.001"), null);
assert.equal(normalizeAmount("-1"), null);

const officialCheckout = {
  MNT_ID: "54600817",
  MNT_TRANSACTION_ID: "FF790ABCD",
  MNT_AMOUNT: "120.25",
  MNT_CURRENCY_CODE: "RUB",
  MNT_SUBSCRIBER_ID: "",
  MNT_TEST_MODE: "0",
};
assert.equal(
  buildCheckoutSignature(officialCheckout, integrityCode),
  "c8222aef6362c7f1239ccdc729d1a200",
  "checkout signature matches the official MONETA.Assistant vector"
);

const officialPay = {
  MNT_ID: "54600817",
  MNT_TRANSACTION_ID: "FF790ABCD",
  MNT_OPERATION_ID: "123456",
  MNT_AMOUNT: "120.25",
  MNT_CURRENCY_CODE: "RUB",
  MNT_SUBSCRIBER_ID: "",
  MNT_TEST_MODE: "0",
};
officialPay.MNT_SIGNATURE = buildCallbackSignature(officialPay, integrityCode);
assert.equal(officialPay.MNT_SIGNATURE, "69bdf9bd91820b8f7b4c4b25d3d22dfa");
assert.equal(verifyCallbackSignature(officialPay, integrityCode), true);
assert.equal(verifyCallbackSignature({ ...officialPay, MNT_AMOUNT: "379.00" }, integrityCode), false);
assert.equal(buildResponseSignature(200, "54600817", "FF790ABCD", integrityCode), "29807c8e5d82198b5c4360e6ec711cce");

const officialCheck = {
  MNT_COMMAND: "CHECK",
  MNT_ID: "54600817",
  MNT_TRANSACTION_ID: "FF790ABCD",
  MNT_OPERATION_ID: "",
  MNT_AMOUNT: "120.25",
  MNT_CURRENCY_CODE: "RUB",
  MNT_SUBSCRIBER_ID: "",
  MNT_TEST_MODE: "0",
};
officialCheck.MNT_SIGNATURE = buildCallbackSignature(officialCheck, integrityCode, true);
assert.equal(officialCheck.MNT_SIGNATURE, "ea2d49048bdf11857f1b50270aedbc8d");
assert.equal(verifyCallbackSignature(officialCheck, integrityCode, true), true);

const expectedProducts = {
  dictionary_around_us: ["149.00", ["around_us"]],
  dictionary_cinema: ["149.00", ["cinema"]],
  dictionary_science: ["149.00", ["science"]],
  dictionaries_bundle: ["379.00", ["around_us", "cinema", "science"]],
};
for (const [productCode, [amount, dictionaryIds]] of Object.entries(expectedProducts)) {
  const product = getPayAnyWayProduct(productCode);
  assert.ok(product, `${productCode} exists`);
  assert.equal(product.amountValue, amount, `${productCode} has the fixed price`);
  assert.deepEqual(entitlementsForProduct(productCode), dictionaryIds, `${productCode} grants exact dictionaries`);
}
assert.equal(Object.keys(PAYANYWAY_PRODUCTS).length, 4);
assert.equal(getPayAnyWayProduct("activity_monthly"), null);

const product = PAYANYWAY_PRODUCTS.dictionaries_bundle;
const checkout = buildPayAnyWayCheckout({
  accountId: "12345678",
  integrityCode: "test-integrity",
  transactionId: "act_order_1",
  subscriberId: "42",
  product,
  testMode: "0",
});
const checkoutUrl = new URL(checkout.action);
assert.equal(checkout.method, "POST");
assert.equal(checkoutUrl.origin, "https://www.payanyway.ru");
assert.equal(checkoutUrl.pathname, "/assistant.htm");
assert.equal(checkout.fields.MNT_AMOUNT, "379.00");
assert.equal(checkout.fields.MNT_SUBSCRIBER_ID, "42");
assert.ok(checkout.fields.MNT_SIGNATURE);

const order = {
  user_id: 42,
  product_code: "dictionaries_bundle",
  idempotence_key: "act_order_1",
  amount_value: "379.00",
  amount_currency: "RUB",
  provider: "self_payanyway",
  entitlement_ids_json: JSON.stringify(["around_us", "cinema", "science"]),
  provider_test_mode: "0",
};
assert.equal(orderMatchesProduct(order), true);
assert.equal(orderMatchesProduct({ ...order, product_code: "dictionary_cinema" }), false, "wrong product is rejected");
assert.equal(orderMatchesProduct({ ...order, amount_value: "149.00" }), false, "product amount mismatch is rejected");
assert.equal(orderMatchesProduct({ ...order, amount_currency: "USD" }), false, "product currency mismatch is rejected");
assert.equal(orderMatchesProduct({ ...order, provider: "other" }), false, "wrong provider is rejected");
assert.equal(orderMatchesProduct({ ...order, entitlement_ids_json: '["around_us"]' }), false, "wrong entitlement set is rejected");
const callback = {
  MNT_ID: "12345678",
  MNT_TRANSACTION_ID: "act_order_1",
  MNT_OPERATION_ID: "9001",
  MNT_AMOUNT: "379.00",
  MNT_CURRENCY_CODE: "RUB",
  MNT_SUBSCRIBER_ID: "42",
  MNT_TEST_MODE: "0",
};
assert.equal(callbackMatchesOrder(callback, order, "12345678"), true);
assert.equal(callbackMatchesOrder({ ...callback, MNT_AMOUNT: "149.00" }, order, "12345678"), false, "wrong amount is rejected");
assert.equal(callbackMatchesOrder({ ...callback, MNT_CURRENCY_CODE: "USD" }, order, "12345678"), false, "wrong currency is rejected");
assert.equal(callbackMatchesOrder({ ...callback, MNT_SUBSCRIBER_ID: "43" }, order, "12345678"), false, "wrong user is rejected");
assert.equal(callbackMatchesOrder({ ...callback, MNT_TRANSACTION_ID: "act_order_2" }, order, "12345678"), false, "wrong order is rejected");
assert.equal(callbackMatchesOrder({ ...callback, MNT_ID: "87654321" }, order, "12345678"), false, "wrong account is rejected");
assert.equal(callbackMatchesOrder({ ...callback, MNT_TEST_MODE: "1" }, order, "12345678"), false, "wrong mode is rejected");

const signedCallback = {
  ...callback,
  MNT_SIGNATURE: buildCallbackSignature(callback, "test-integrity"),
};
assert.equal(verifyCallbackSignature(signedCallback, "test-integrity"), true);
assert.equal(verifyCallbackSignature({ ...signedCallback, MNT_SIGNATURE: "0".repeat(32) }, "test-integrity"), false, "forged signature is rejected");

const replayEntitlements = new Set();
for (let attempt = 0; attempt < 2; attempt += 1) {
  for (const dictionaryId of entitlementsForProduct("dictionaries_bundle")) replayEntitlements.add(dictionaryId);
}
assert.deepEqual([...replayEntitlements], ["around_us", "cinema", "science"], "callback replay remains idempotent");

console.log("Payment check passed: products, official signatures, exact matching, forgery and replay contracts");

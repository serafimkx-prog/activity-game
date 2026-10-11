import assert from "node:assert/strict";
import {
  buildCallbackSignature,
  buildResponseSignature,
} from "../src/lib/payanyway.mjs";

const base = process.argv.find(arg => arg.startsWith("--base="))?.slice(7) || "http://127.0.0.1:8790";
const accountId = "12345678";
const integrityCode = "test-integrity";

async function request(path, { method = "GET", cookie = null, body = null, form = null } = {}) {
  const headers = {};
  if (cookie) headers.cookie = `activity_session=${cookie}`;
  let requestBody = body;
  if (body && !(body instanceof URLSearchParams)) headers["content-type"] = "application/json";
  if (form) {
    requestBody = new URLSearchParams(form);
    headers["content-type"] = "application/x-www-form-urlencoded";
  }
  const response = await fetch(new URL(path, base), { method, headers, body: requestBody, redirect: "manual" });
  return { response, text: await response.text() };
}

async function providerRequest(path, method, fields) {
  if (method === "GET") {
    return request(`${path}?${new URLSearchParams(fields)}`);
  }
  return request(path, { method: "POST", form: fields });
}

function callbackFields(checkoutFields, operationId, overrides = {}) {
  const fields = {
    MNT_ID: checkoutFields.MNT_ID,
    MNT_TRANSACTION_ID: checkoutFields.MNT_TRANSACTION_ID,
    MNT_OPERATION_ID: operationId,
    MNT_AMOUNT: checkoutFields.MNT_AMOUNT,
    MNT_CURRENCY_CODE: checkoutFields.MNT_CURRENCY_CODE,
    MNT_SUBSCRIBER_ID: checkoutFields.MNT_SUBSCRIBER_ID,
    MNT_TEST_MODE: checkoutFields.MNT_TEST_MODE,
    ...overrides,
  };
  fields.MNT_SIGNATURE = buildCallbackSignature(fields, integrityCode);
  return fields;
}

function checkFields(checkoutFields) {
  const fields = {
    MNT_COMMAND: "CHECK",
    MNT_ID: checkoutFields.MNT_ID,
    MNT_TRANSACTION_ID: checkoutFields.MNT_TRANSACTION_ID,
    MNT_OPERATION_ID: "",
    MNT_AMOUNT: checkoutFields.MNT_AMOUNT,
    MNT_CURRENCY_CODE: checkoutFields.MNT_CURRENCY_CODE,
    MNT_SUBSCRIBER_ID: checkoutFields.MNT_SUBSCRIBER_ID,
    MNT_TEST_MODE: checkoutFields.MNT_TEST_MODE,
  };
  fields.MNT_SIGNATURE = buildCallbackSignature(fields, integrityCode, true);
  return fields;
}

function assertXmlCode(text, code) {
  assert.match(text, new RegExp(`<MNT_RESULT_CODE>${code}</MNT_RESULT_CODE>`));
  const transactionId = text.match(/<MNT_TRANSACTION_ID>([^<]+)<\/MNT_TRANSACTION_ID>/)?.[1] || "";
  assert.ok(transactionId);
  assert.ok(text.includes(`<MNT_SIGNATURE>${buildResponseSignature(code, accountId, transactionId, integrityCode)}</MNT_SIGNATURE>`));
}

function assertReceiptInventory(text, expectedTitle, expectedPrice) {
  assert.match(text, /<KEY>INVENTORY<\/KEY>/);
  const encodedValue = text.match(/<VALUE>([\s\S]*?)<\/VALUE>/)?.[1] || "";
  const decodedValue = encodedValue
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
  const inventory = JSON.parse(decodedValue);
  assert.deepEqual(inventory, [{
    name: expectedTitle,
    price: expectedPrice,
    quantity: "1",
    vatTag: "1105",
    pm: "full_payment",
    po: "service",
  }]);
}

async function createProduct(productCode, cookie, expectedAmount) {
  const { response, text } = await request("/api/purchase/create", {
    method: "POST",
    cookie,
    body: JSON.stringify({ productCode }),
  });
  assert.equal(response.status, 200, text);
  const payload = JSON.parse(text);
  assert.equal(payload.ok, true);
  assert.equal(payload.alreadyOwned, false);
  assert.equal(payload.checkout.method, "POST");
  assert.equal(payload.checkout.action, "https://www.payanyway.ru/assistant.htm");
  assert.equal(payload.checkout.fields.MNT_AMOUNT, expectedAmount);
  assert.equal(payload.checkout.fields.MNT_CURRENCY_CODE, "RUB");
  return payload.checkout.fields;
}

async function payProduct(fields, operationId, expectedReceiptTitle, method = "POST") {
  const checkBefore = await providerRequest("/api/payment/check/payanyway", method, checkFields(fields));
  assert.equal(checkBefore.response.status, 200);
  assertXmlCode(checkBefore.text, 402);

  const payment = callbackFields(fields, operationId);
  const paid = await providerRequest("/api/payment/webhook/payanyway", method, payment);
  assert.equal(paid.response.status, 200);
  assertXmlCode(paid.text, 200);
  assertReceiptInventory(paid.text, expectedReceiptTitle, fields.MNT_AMOUNT);

  const replay = await providerRequest("/api/payment/webhook/payanyway", method, payment);
  assert.equal(replay.response.status, 200);
  assertXmlCode(replay.text, 200);
  assertReceiptInventory(replay.text, expectedReceiptTitle, fields.MNT_AMOUNT);

  const checkAfter = await providerRequest("/api/payment/check/payanyway", method, checkFields(fields));
  assertXmlCode(checkAfter.text, 200);
}

const config = await request("/api/config");
assert.equal(JSON.parse(config.text).paymentCheckoutReady, true);

for (const callbackRoute of ["/api/payment/check/payanyway", "/api/payment/webhook/payanyway"]) {
  const putResponse = await request(callbackRoute, { method: "PUT" });
  assert.equal(putResponse.response.status, 405, `${callbackRoute} accepts only provider GET and POST callbacks`);
}

const anonymousAsset = await request("/words_around_us.json");
assert.equal(anonymousAsset.response.status, 401);
const unpaidAsset = await request("/words_around_us.json", { cookie: "test-session-individual" });
assert.equal(unpaidAsset.response.status, 403);

const unsupported = await request("/api/purchase/create", {
  method: "POST",
  cookie: "test-session-individual",
  body: JSON.stringify({ productCode: "activity_monthly" }),
});
assert.equal(unsupported.response.status, 400);

const aroundFields = await createProduct("dictionary_around_us", "test-session-individual", "149.00");
const aroundRetryFields = await createProduct("dictionary_around_us", "test-session-individual", "149.00");
assert.equal(aroundRetryFields.MNT_TRANSACTION_ID, aroundFields.MNT_TRANSACTION_ID, "pending order is reused");

for (const overrides of [
  { MNT_AMOUNT: "148.99" },
  { MNT_CURRENCY_CODE: "USD" },
  { MNT_SUBSCRIBER_ID: "2" },
  { MNT_TEST_MODE: "1" },
  { MNT_TRANSACTION_ID: "act_unknown" },
]) {
  const mismatch = await request("/api/payment/webhook/payanyway", {
    method: "POST",
    form: callbackFields(aroundFields, "invalid-operation", overrides),
  });
  assert.equal(mismatch.response.status, 200);
  assertXmlCode(mismatch.text, 500);
}

const forged = callbackFields(aroundFields, "forged-operation");
forged.MNT_SIGNATURE = "0".repeat(32);
const forgedResponse = await request("/api/payment/webhook/payanyway", { method: "POST", form: forged });
assert.equal(forgedResponse.text, "FAIL");
assert.equal((await request("/words_around_us.json", { cookie: "test-session-individual" })).response.status, 403);

await payProduct(aroundFields, "operation-around", "Доступ к словарю Вокруг нас", "GET");
assert.equal((await request("/words_around_us.json", { cookie: "test-session-individual" })).response.status, 200);
assert.equal((await request("/words_cinema.json", { cookie: "test-session-individual" })).response.status, 403);

for (const [productCode, asset, operationId, receiptTitle] of [
  ["dictionary_cinema", "/words_cinema.json", "operation-cinema", "Доступ к словарю Мир кино"],
  ["dictionary_science", "/words_science.json", "operation-science", "Доступ к словарю Наука и природа"],
]) {
  const fields = await createProduct(productCode, "test-session-individual", "149.00");
  await payProduct(fields, operationId, receiptTitle);
  assert.equal((await request(asset, { cookie: "test-session-individual" })).response.status, 200);
}

const bundleFields = await createProduct("dictionaries_bundle", "test-session-bundle", "379.00");
const bundleRetryFields = await createProduct("dictionaries_bundle", "test-session-bundle", "379.00");
assert.equal(bundleRetryFields.MNT_TRANSACTION_ID, bundleFields.MNT_TRANSACTION_ID, "pending bundle order is reused");
await payProduct(bundleFields, "operation-bundle", "Доступ к комплекту словарей Activity");
for (const asset of ["/words_around_us.json", "/words_cinema.json", "/words_science.json"]) {
  assert.equal((await request(asset, { cookie: "test-session-bundle" })).response.status, 200);
}

for (const oldRoute of ["/api/subscription/status", "/api/subscription/start", "/api/subscription/cancel"]) {
  const oldResponse = await request(oldRoute, { method: "POST", cookie: "test-session-bundle" });
  assert.notEqual(oldResponse.response.status, 200);
}

console.log("Payment Worker check passed: individual products, bundle, exact matching, replay, forged callbacks, protected assets, no subscription API");

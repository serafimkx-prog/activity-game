import { createHash, timingSafeEqual } from "node:crypto";

export const PAYANYWAY_CHECKOUT_URL = "https://www.payanyway.ru/assistant.htm";
export const PAYANYWAY_PROVIDER = "self_payanyway";
export const PAYANYWAY_CURRENCY = "RUB";

export const PAYANYWAY_PRODUCTS = Object.freeze({
  dictionary_around_us: Object.freeze({
    productCode: "dictionary_around_us",
    title: "Словарь «Вокруг нас»",
    amountValue: "149.00",
    amountCurrency: PAYANYWAY_CURRENCY,
    dictionaryIds: Object.freeze(["around_us"]),
  }),
  dictionary_cinema: Object.freeze({
    productCode: "dictionary_cinema",
    title: "Словарь «Мир кино»",
    amountValue: "149.00",
    amountCurrency: PAYANYWAY_CURRENCY,
    dictionaryIds: Object.freeze(["cinema"]),
  }),
  dictionary_science: Object.freeze({
    productCode: "dictionary_science",
    title: "Словарь «Наука и природа»",
    amountValue: "149.00",
    amountCurrency: PAYANYWAY_CURRENCY,
    dictionaryIds: Object.freeze(["science"]),
  }),
  dictionaries_bundle: Object.freeze({
    productCode: "dictionaries_bundle",
    title: "Комплект из трёх словарей Activity",
    amountValue: "379.00",
    amountCurrency: PAYANYWAY_CURRENCY,
    dictionaryIds: Object.freeze(["around_us", "cinema", "science"]),
  }),
});

export function getPayAnyWayProduct(productCode) {
  return PAYANYWAY_PRODUCTS[productCode] || null;
}

export function normalizeAmount(value) {
  const text = String(value ?? "").trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return amount.toFixed(2);
}

export function md5Hex(value) {
  return createHash("md5").update(String(value), "utf8").digest("hex");
}

export function safeEqualHex(left, right) {
  const a = String(left || "").toLowerCase();
  const b = String(right || "").toLowerCase();
  if (!/^[a-f0-9]{32}$/.test(a) || !/^[a-f0-9]{32}$/.test(b)) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

export function buildCheckoutSignature(fields, integrityCode) {
  const amount = normalizeAmount(fields.MNT_AMOUNT);
  if (!amount) throw new Error("Invalid checkout amount");
  return md5Hex(
    String(fields.MNT_ID || "")
      + String(fields.MNT_TRANSACTION_ID || "")
      + amount
      + String(fields.MNT_CURRENCY_CODE || "")
      + String(fields.MNT_SUBSCRIBER_ID || "")
      + String(fields.MNT_TEST_MODE || "0")
      + String(integrityCode || "")
  );
}

export function buildCallbackSignature(fields, integrityCode, includeCommand = false) {
  const amount = fields.MNT_AMOUNT === undefined || fields.MNT_AMOUNT === null || fields.MNT_AMOUNT === ""
    ? ""
    : normalizeAmount(fields.MNT_AMOUNT);
  if (amount === null) throw new Error("Invalid callback amount");
  return md5Hex(
    (includeCommand ? String(fields.MNT_COMMAND || "") : "")
      + String(fields.MNT_ID || "")
      + String(fields.MNT_TRANSACTION_ID || "")
      + String(fields.MNT_OPERATION_ID || "")
      + amount
      + String(fields.MNT_CURRENCY_CODE || "")
      + String(fields.MNT_SUBSCRIBER_ID || "")
      + String(fields.MNT_TEST_MODE || "0")
      + String(integrityCode || "")
  );
}

export function verifyCallbackSignature(fields, integrityCode, includeCommand = false) {
  let expected;
  try {
    expected = buildCallbackSignature(fields, integrityCode, includeCommand);
  } catch {
    return false;
  }
  return safeEqualHex(expected, fields.MNT_SIGNATURE);
}

export function buildResponseSignature(resultCode, accountId, transactionId, integrityCode) {
  return md5Hex(
    String(resultCode)
      + String(accountId || "")
      + String(transactionId || "")
      + String(integrityCode || "")
  );
}

export function buildPayAnyWayCheckout({
  accountId,
  integrityCode,
  transactionId,
  subscriberId,
  product,
  testMode = "0",
}) {
  if (!accountId || !integrityCode || !transactionId || !subscriberId || !product) {
    throw new Error("PayAnyWay checkout configuration is incomplete");
  }

  const fields = {
    MNT_ID: String(accountId),
    MNT_TRANSACTION_ID: String(transactionId),
    MNT_AMOUNT: product.amountValue,
    MNT_CURRENCY_CODE: product.amountCurrency,
    MNT_SUBSCRIBER_ID: String(subscriberId),
    MNT_TEST_MODE: String(testMode),
    MNT_DESCRIPTION: product.title,
    showAdditionalPaymentMethods: "true",
  };
  fields.MNT_SIGNATURE = buildCheckoutSignature(fields, integrityCode);

  return {
    action: PAYANYWAY_CHECKOUT_URL,
    method: "POST",
    fields,
  };
}

export function callbackMatchesOrder(fields, order, accountId) {
  const amount = normalizeAmount(fields.MNT_AMOUNT);
  return Boolean(
    order
      && String(fields.MNT_ID || "") === String(accountId || "")
      && String(fields.MNT_TRANSACTION_ID || "") === String(order.idempotence_key || "")
      && amount === String(order.amount_value || "")
      && String(fields.MNT_CURRENCY_CODE || "") === String(order.amount_currency || "")
      && String(fields.MNT_SUBSCRIBER_ID || "") === String(order.user_id || "")
      && String(fields.MNT_TEST_MODE || "0") === String(order.provider_test_mode || "0")
  );
}

export function orderMatchesProduct(order) {
  const product = getPayAnyWayProduct(order?.product_code);
  if (!product
      || order.provider !== PAYANYWAY_PROVIDER
      || order.amount_value !== product.amountValue
      || order.amount_currency !== product.amountCurrency) {
    return false;
  }
  let storedEntitlements;
  try {
    storedEntitlements = JSON.parse(order.entitlement_ids_json || "[]");
  } catch {
    return false;
  }
  return Array.isArray(storedEntitlements)
    && storedEntitlements.length === product.dictionaryIds.length
    && storedEntitlements.every((dictionaryId, index) => dictionaryId === product.dictionaryIds[index]);
}

export function entitlementsForProduct(productCode) {
  const product = getPayAnyWayProduct(productCode);
  return product ? [...product.dictionaryIds] : [];
}

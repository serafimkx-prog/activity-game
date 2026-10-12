import assert from "node:assert/strict";
import {
  buildApplySql,
  buildOrderSnapshotSql,
  parsePositiveOrderId,
  sanitizedResult,
  validateOrderSnapshot,
} from "./refund_order.mjs";

const base = {
  order_id: 42,
  product_code: "dictionary_cinema",
  status: "succeeded",
  amount_value: "149.00",
  amount_currency: "RUB",
  provider: "self_payanyway",
  has_provider_payment: 1,
  has_paid_at: 1,
  entitlement_ids_json: '["cinema"]',
  dictionary_id: "cinema",
  entitlement_active: 1,
};

function rejects(rows, pattern) {
  assert.throws(() => validateOrderSnapshot(rows, "42"), pattern);
}

assert.equal(parsePositiveOrderId("42"), "42");
assert.throws(() => parsePositiveOrderId("0"), /positive integer/);
assert.throws(() => parsePositiveOrderId("42 OR 1=1"), /positive integer/);

const ready = validateOrderSnapshot([base], "42");
assert.equal(ready.outcome, "ready");
assert.equal(ready.activeCount, 1);

const reconciled = validateOrderSnapshot([{ ...base, status: "refunded", entitlement_active: 0 }], "42");
assert.equal(reconciled.outcome, "already_reconciled");

const repair = validateOrderSnapshot([{ ...base, status: "refunded" }], "42");
assert.equal(repair.outcome, "repair_revocation");

for (const [productCode, dictionaryId] of [
  ["dictionary_around_us", "around_us"],
  ["dictionary_science", "science"],
]) {
  const individual = validateOrderSnapshot([{
    ...base,
    product_code: productCode,
    entitlement_ids_json: JSON.stringify([dictionaryId]),
    dictionary_id: dictionaryId,
  }], "42");
  assert.equal(individual.productCode, productCode);
  assert.deepEqual(individual.dictionaryIds, [dictionaryId]);
}

rejects([], /not found/);
rejects([{ ...base, order_id: 43 }], /unexpected order/);
rejects([{ ...base, provider: "other" }], /provider/);
rejects([{ ...base, product_code: "unknown" }], /not supported/);
rejects([{ ...base, amount_value: "379.00" }], /amount/);
rejects([{ ...base, amount_currency: "USD" }], /currency/);
rejects([{ ...base, has_provider_payment: 0 }], /verified provider payment/);
rejects([{ ...base, has_paid_at: 0 }], /verified provider payment/);
rejects([{ ...base, entitlement_ids_json: "nope" }], /invalid/);
rejects([{ ...base, entitlement_ids_json: '["science"]' }], /does not match/);
rejects([{ ...base, dictionary_id: "science" }], /rows do not match/);
rejects([{ ...base, dictionary_id: null, entitlement_active: 1 }], /rows do not match/);
rejects([{ ...base, entitlement_active: 0 }], /complete active/);
rejects([{ ...base, status: "pending" }], /refundable state/);

const bundleRows = ["around_us", "cinema", "science"].map((dictionaryId) => ({
  ...base,
  product_code: "dictionaries_bundle",
  amount_value: "379.00",
  entitlement_ids_json: '["around_us","cinema","science"]',
  dictionary_id: dictionaryId,
}));
assert.equal(validateOrderSnapshot(bundleRows, "42").activeCount, 3);
rejects(bundleRows.slice(0, 2), /rows do not match/);

const snapshotSql = buildOrderSnapshotSql("42");
assert.match(snapshotSql, /WHERE po\.id = 42/);
assert.doesNotMatch(snapshotSql, /LIMIT 1|MAX\(|ORDER BY po\.created_at/i);

const applySql = buildApplySql(ready);
assert.match(applySql, /WHERE id = 42/);
assert.match(applySql, /status = 'succeeded'/);
assert.match(applySql, /status = 'refunded'/);
assert.match(applySql, /provider_payment_id IS NOT NULL/);
assert.match(applySql, /COUNT\(\*\).*purchase_order_entitlements/s);
assert.doesNotMatch(applySql, /DELETE|user_dictionary_access/i);

const publicResult = sanitizedResult(ready);
assert.deepEqual(Object.keys(publicResult), ["mode", "product", "state", "entitlementCount", "activeEntitlementCount"]);
assert.equal(JSON.stringify(publicResult).includes("42"), false);

console.log("Refund order checks passed (41 assertions).");

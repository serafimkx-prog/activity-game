#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getPayAnyWayProduct, PAYANYWAY_PROVIDER } from "../src/lib/payanyway.mjs";

const DATABASE_NAME = "activity-game";
const WRANGLER_PACKAGES = ["-y", "-p", "node@22", "-p", "wrangler@4.149.0"];

function sqlText(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

export function parsePositiveOrderId(value) {
  const text = String(value ?? "").trim();
  if (!/^[1-9]\d*$/.test(text) || !Number.isSafeInteger(Number(text))) {
    throw new Error("Order ID must be a positive integer");
  }
  return text;
}

export function buildOrderSnapshotSql(orderId) {
  const id = parsePositiveOrderId(orderId);
  return `SELECT
  po.id AS order_id,
  po.product_code,
  po.status,
  po.amount_value,
  po.amount_currency,
  po.provider,
  CASE WHEN po.provider_payment_id IS NOT NULL AND po.provider_payment_id <> '' THEN 1 ELSE 0 END AS has_provider_payment,
  CASE WHEN po.paid_at IS NOT NULL AND po.paid_at <> '' THEN 1 ELSE 0 END AS has_paid_at,
  po.entitlement_ids_json,
  poe.dictionary_id,
  CASE WHEN poe.revoked_at IS NULL THEN 1 ELSE 0 END AS entitlement_active
FROM purchase_orders po
LEFT JOIN purchase_order_entitlements poe ON poe.purchase_order_id = po.id
WHERE po.id = ${id}
ORDER BY poe.dictionary_id;`;
}

function sameOrderedValues(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function validateOrderSnapshot(rows, orderId) {
  const id = parsePositiveOrderId(orderId);
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("Order was not found");

  const first = rows[0];
  if (String(first.order_id) !== id || rows.some((row) => String(row.order_id) !== id)) {
    throw new Error("Database returned an unexpected order");
  }

  const stableFields = [
    "product_code",
    "status",
    "amount_value",
    "amount_currency",
    "provider",
    "has_provider_payment",
    "has_paid_at",
    "entitlement_ids_json",
  ];
  if (rows.some((row) => stableFields.some((field) => String(row[field] ?? "") !== String(first[field] ?? "")))) {
    throw new Error("Order snapshot is inconsistent");
  }

  const product = getPayAnyWayProduct(first.product_code);
  if (!product) throw new Error("Order product is not supported");
  if (first.provider !== PAYANYWAY_PROVIDER) throw new Error("Order provider is not supported");
  if (first.amount_value !== product.amountValue) throw new Error("Order amount does not match the product catalog");
  if (first.amount_currency !== product.amountCurrency) throw new Error("Order currency does not match the product catalog");
  if (Number(first.has_provider_payment) !== 1 || Number(first.has_paid_at) !== 1) {
    throw new Error("Order has no verified provider payment");
  }

  let storedEntitlements;
  try {
    storedEntitlements = JSON.parse(first.entitlement_ids_json);
  } catch {
    throw new Error("Stored entitlement list is invalid");
  }
  if (!Array.isArray(storedEntitlements) || !sameOrderedValues(storedEntitlements, product.dictionaryIds)) {
    throw new Error("Stored entitlement list does not match the product catalog");
  }

  const entitlementRows = rows.filter((row) => row.dictionary_id !== null && row.dictionary_id !== undefined);
  const actualIds = entitlementRows.map((row) => row.dictionary_id).sort();
  const expectedIds = [...product.dictionaryIds].sort();
  if (!sameOrderedValues(actualIds, expectedIds)) {
    throw new Error("Order entitlement rows do not match the product catalog");
  }
  if (entitlementRows.some((row) => ![0, 1].includes(Number(row.entitlement_active)))) {
    throw new Error("Order entitlement state is invalid");
  }

  const activeCount = entitlementRows.filter((row) => Number(row.entitlement_active) === 1).length;
  if (first.status === "succeeded" && activeCount !== expectedIds.length) {
    throw new Error("Succeeded order must have its complete active entitlement set");
  }
  if (first.status !== "succeeded" && first.status !== "refunded") {
    throw new Error("Order is not in a refundable state");
  }

  return {
    orderId: id,
    productCode: product.productCode,
    status: first.status,
    amountValue: product.amountValue,
    amountCurrency: product.amountCurrency,
    dictionaryIds: [...product.dictionaryIds],
    activeCount,
    outcome: first.status === "refunded" && activeCount === 0
      ? "already_reconciled"
      : first.status === "refunded"
        ? "repair_revocation"
        : "ready",
  };
}

export function buildApplySql(snapshot) {
  const id = parsePositiveOrderId(snapshot.orderId);
  const product = getPayAnyWayProduct(snapshot.productCode);
  if (!product) throw new Error("Order product is not supported");
  const expectedJson = JSON.stringify(product.dictionaryIds);
  const entitlementList = product.dictionaryIds.map(sqlText).join(", ");

  return `UPDATE purchase_orders
SET status = 'refunded', updated_at = CURRENT_TIMESTAMP
WHERE id = ${id}
  AND status = 'succeeded'
  AND provider = ${sqlText(PAYANYWAY_PROVIDER)}
  AND product_code = ${sqlText(product.productCode)}
  AND amount_value = ${sqlText(product.amountValue)}
  AND amount_currency = ${sqlText(product.amountCurrency)}
  AND entitlement_ids_json = ${sqlText(expectedJson)}
  AND provider_payment_id IS NOT NULL AND provider_payment_id <> ''
  AND paid_at IS NOT NULL AND paid_at <> ''
  AND (SELECT COUNT(*) FROM purchase_order_entitlements WHERE purchase_order_id = ${id}) = ${product.dictionaryIds.length}
  AND (SELECT COUNT(*) FROM purchase_order_entitlements
       WHERE purchase_order_id = ${id} AND revoked_at IS NULL
         AND dictionary_id IN (${entitlementList})) = ${product.dictionaryIds.length};

UPDATE purchase_order_entitlements
SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
WHERE purchase_order_id = ${id}
  AND revoked_at IS NULL
  AND dictionary_id IN (${entitlementList})
  AND EXISTS (
    SELECT 1 FROM purchase_orders
    WHERE id = ${id}
      AND status = 'refunded'
      AND provider = ${sqlText(PAYANYWAY_PROVIDER)}
      AND product_code = ${sqlText(product.productCode)}
      AND amount_value = ${sqlText(product.amountValue)}
      AND amount_currency = ${sqlText(product.amountCurrency)}
      AND entitlement_ids_json = ${sqlText(expectedJson)}
      AND provider_payment_id IS NOT NULL AND provider_payment_id <> ''
      AND paid_at IS NOT NULL AND paid_at <> ''
  );`;
}

function extractRows(output) {
  let payload;
  try {
    payload = JSON.parse(output);
  } catch {
    throw new Error("Wrangler returned an unreadable response");
  }
  const executions = Array.isArray(payload) ? payload : [payload];
  if (executions.length === 0 || executions.some((item) => item?.success === false)) {
    throw new Error("D1 query failed");
  }
  return executions.flatMap((item) => Array.isArray(item?.results) ? item.results : []);
}

function safeFailureHint(result) {
  let message = "";
  try {
    const payload = JSON.parse(String(result.stdout || ""));
    message = payload?.error?.notes?.[0]?.text || payload?.error?.text || "";
  } catch {
    message = String(result.stderr || "").split(/\r?\n/).find((line) => line.trim()) || "";
  }
  const normalized = message.toLowerCase();
  if (normalized.includes("sqlite")) return "SQLite rejected the guarded query";
  if (normalized.includes("auth") || normalized.includes("oauth") || normalized.includes("token")) {
    return "Cloudflare authentication is unavailable";
  }
  if (normalized.includes("cloudflare api") || normalized.includes("request")) return "Cloudflare API request failed";
  return message ? "Wrangler execution failed" : "";
}

function findWindowsWranglerCli() {
  for (const directory of String(process.env.PATH || "").split(delimiter)) {
    if (!directory || !existsSync(join(directory, "wrangler.cmd"))) continue;
    const candidate = join(directory, "..", "wrangler", "bin", "wrangler.js");
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function runWrangler(scope, sql, persistTo = null) {
  const scopeArgs = [`--${scope}`];
  if (scope === "local" && persistTo) scopeArgs.push("--persist-to", persistTo);
  const cwd = fileURLToPath(new URL("..", import.meta.url));
  const commonOptions = { cwd, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 };
  let result;
  if (process.platform === "win32") {
    const wranglerCli = findWindowsWranglerCli();
    if (!wranglerCli) throw new Error("Wrangler CLI is unavailable; run this tool with the documented npx packages");
    result = spawnSync(
      process.execPath,
      [wranglerCli, "d1", "execute", DATABASE_NAME, ...scopeArgs, "--yes", "--json", "--command", sql],
      commonOptions,
    );
  } else {
    result = spawnSync(
      "npx",
      [...WRANGLER_PACKAGES, "wrangler", "d1", "execute", DATABASE_NAME, ...scopeArgs, "--yes", "--json", "--command", sql],
      commonOptions,
    );
  }
  if (result.error || result.status !== 0) {
    const reason = result.error?.code || result.status || "unknown";
    const hint = safeFailureHint(result);
    throw new Error(`D1 command failed (${reason})${hint ? `: ${hint}` : ""}`);
  }
  return extractRows(result.stdout);
}

function readOrderId(args) {
  const directIndex = args.indexOf("--order-id");
  const fileIndex = args.indexOf("--order-id-file");
  if ((directIndex >= 0) === (fileIndex >= 0)) {
    throw new Error("Provide exactly one of --order-id or --order-id-file");
  }
  if (directIndex >= 0) return parsePositiveOrderId(args[directIndex + 1]);
  const path = args[fileIndex + 1];
  if (!path) throw new Error("--order-id-file requires a path");
  try {
    return parsePositiveOrderId(readFileSync(path, "utf8"));
  } catch (error) {
    if (error?.message === "Order ID must be a positive integer") throw error;
    throw new Error("Could not read order ID file");
  }
}

function parseCli(args) {
  if (args.includes("--help")) return { help: true };
  const local = args.includes("--local");
  const remote = args.includes("--remote");
  if (local === remote) throw new Error("Provide exactly one of --local or --remote");
  const apply = args.includes("--apply");
  const refundConfirmed = args.includes("--refund-confirmed");
  if (apply && !refundConfirmed) throw new Error("--apply requires --refund-confirmed");
  if (!apply && refundConfirmed) throw new Error("--refund-confirmed is only valid with --apply");
  const persistIndex = args.indexOf("--persist-to");
  if (persistIndex >= 0 && remote) throw new Error("--persist-to is only valid with --local");
  const persistTo = persistIndex >= 0 ? args[persistIndex + 1] : null;
  if (persistIndex >= 0 && !persistTo) throw new Error("--persist-to requires a path");
  return { scope: remote ? "remote" : "local", apply, orderId: readOrderId(args), persistTo };
}

function printHelp() {
  console.log(`Usage:
  node tools/refund_order.mjs (--local|--remote) (--order-id ID|--order-id-file PATH)
  node tools/refund_order.mjs (--local|--remote) (--order-id ID|--order-id-file PATH) --apply --refund-confirmed

Dry-run is the default. Apply only after the provider refund and receipt reversal are confirmed.`);
}

export function sanitizedResult(snapshot, applied = false) {
  return {
    mode: applied ? "apply" : "dry-run",
    product: snapshot.productCode,
    state: snapshot.outcome,
    entitlementCount: snapshot.dictionaryIds.length,
    activeEntitlementCount: snapshot.activeCount,
  };
}

export function main(args = process.argv.slice(2)) {
  const options = parseCli(args);
  if (options.help) return printHelp();

  const before = validateOrderSnapshot(runWrangler(options.scope, buildOrderSnapshotSql(options.orderId), options.persistTo), options.orderId);
  if (!options.apply) {
    console.log(JSON.stringify(sanitizedResult(before), null, 2));
    return;
  }
  if (before.outcome !== "already_reconciled") {
    runWrangler(options.scope, buildApplySql(before), options.persistTo);
  }
  const after = validateOrderSnapshot(runWrangler(options.scope, buildOrderSnapshotSql(options.orderId), options.persistTo), options.orderId);
  if (after.status !== "refunded" || after.activeCount !== 0) {
    throw new Error("Refund reconciliation did not reach the safe final state");
  }
  console.log(JSON.stringify(sanitizedResult(after, true), null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main();
  } catch (error) {
    console.error(`Refund reconciliation stopped: ${error.message}`);
    process.exitCode = 1;
  }
}

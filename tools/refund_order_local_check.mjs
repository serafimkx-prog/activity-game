import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const state = mkdtempSync(join(tmpdir(), "activity-refund-check-"));
const wrangler = ["-y", "-p", "node@22", "-p", "wrangler@4.149.0", "wrangler", "d1", "execute", "activity-game", "--local", "--persist-to", state, "--yes"];

function run(command, args, json = false) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`Command failed (exit ${result.status ?? "unknown"})`);
  if (!json) return result.stdout;
  const payload = JSON.parse(result.stdout);
  return (Array.isArray(payload) ? payload : [payload]).flatMap((item) => item.results || []);
}

function query(sql) {
  return run("npx", [...wrangler, "--json", "--command", sql], true);
}

try {
  run("npx", [...wrangler, "--file", "db/schema.sql"]);
  query(`INSERT INTO users (id, telegram_user_id, first_name) VALUES (1, 'local-test-user', 'Test');
INSERT INTO purchase_orders (id, user_id, product_code, status, amount_value, amount_currency, provider, provider_payment_id, idempotence_key, paid_at, entitlement_ids_json)
VALUES
  (101, 1, 'dictionary_cinema', 'succeeded', '149.00', 'RUB', 'self_payanyway', 'local-operation-target', 'local-key-target', CURRENT_TIMESTAMP, '["cinema"]'),
  (102, 1, 'dictionary_science', 'succeeded', '149.00', 'RUB', 'self_payanyway', 'local-operation-other', 'local-key-other', CURRENT_TIMESTAMP, '["science"]'),
  (103, 1, 'dictionary_around_us', 'refunded', '149.00', 'RUB', 'self_payanyway', 'local-operation-old', 'local-key-old', CURRENT_TIMESTAMP, '["around_us"]');
INSERT INTO purchase_order_entitlements (purchase_order_id, dictionary_id, revoked_at) VALUES
  (101, 'cinema', NULL), (102, 'science', NULL), (103, 'around_us', CURRENT_TIMESTAMP);`);

  const common = ["tools/refund_order.mjs", "--local", "--persist-to", state, "--order-id", "101"];
  const dryRun = JSON.parse(run("npx", ["-y", "node@22", ...common]));
  assert.equal(dryRun.mode, "dry-run");
  assert.equal(dryRun.state, "ready");
  assert.equal(query("SELECT status FROM purchase_orders WHERE id = 101;")[0].status, "succeeded");

  const applied = JSON.parse(run("npx", ["-y", "node@22", ...common, "--apply", "--refund-confirmed"]));
  assert.equal(applied.mode, "apply");
  assert.equal(applied.state, "already_reconciled");

  const stateRows = query(`SELECT po.id, po.status, SUM(CASE WHEN poe.revoked_at IS NULL THEN 1 ELSE 0 END) AS active
FROM purchase_orders po JOIN purchase_order_entitlements poe ON poe.purchase_order_id = po.id
GROUP BY po.id ORDER BY po.id;`);
  assert.deepEqual(stateRows.map((row) => [row.id, row.status, row.active]), [
    [101, "refunded", 0],
    [102, "succeeded", 1],
    [103, "refunded", 0],
  ]);

  const replay = JSON.parse(run("npx", ["-y", "node@22", ...common, "--apply", "--refund-confirmed"]));
  assert.equal(replay.state, "already_reconciled");

  query("UPDATE purchase_order_entitlements SET revoked_at = NULL WHERE purchase_order_id = 101;");
  const repaired = JSON.parse(run("npx", ["-y", "node@22", ...common, "--apply", "--refund-confirmed"]));
  assert.equal(repaired.state, "already_reconciled");
  assert.equal(query("SELECT COUNT(*) AS active FROM purchase_order_entitlements WHERE purchase_order_id = 101 AND revoked_at IS NULL;")[0].active, 0);

  const wrongOrder = spawnSync("npx", ["-y", "node@22", "tools/refund_order.mjs", "--local", "--persist-to", state, "--order-id", "999"], { cwd: root, encoding: "utf8" });
  assert.notEqual(wrongOrder.status, 0);
  assert.match(wrongOrder.stderr, /not found/);

  console.log("Local refund reconciliation check passed (12 assertions).");
} finally {
  rmSync(state, { recursive: true, force: true });
}

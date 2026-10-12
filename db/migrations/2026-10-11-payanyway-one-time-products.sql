-- Additive migration for one-time Self.PayAnyWay dictionary purchases.
-- The unreleased subscription tables, if they exist in a local database, are
-- intentionally left untouched. The release code no longer reads them.

ALTER TABLE purchase_orders ADD COLUMN entitlement_ids_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE purchase_orders ADD COLUMN provider_test_mode TEXT NOT NULL DEFAULT '0';
ALTER TABLE purchase_orders ADD COLUMN expires_at TEXT;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_user_product_status
  ON purchase_orders(user_id, product_code, status, created_at);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status_expiry
  ON purchase_orders(status, expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_orders_one_payanyway_pending
  ON purchase_orders(user_id, provider, product_code)
  WHERE status = 'pending' AND provider = 'self_payanyway';

CREATE TABLE IF NOT EXISTS purchase_order_entitlements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_order_id INTEGER NOT NULL,
  dictionary_id TEXT NOT NULL,
  granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TEXT,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_order_entitlements_unique
  ON purchase_order_entitlements(purchase_order_id, dictionary_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_entitlements_dictionary
  ON purchase_order_entitlements(dictionary_id, revoked_at);

-- Existing one-time grants remain valid through user_dictionary_access.
-- No historical subscription or purchase data is deleted by this migration.

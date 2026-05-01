CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_user_id TEXT NOT NULL UNIQUE,
  username TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT,
  photo_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS game_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT NOT NULL,
  dictionary_id TEXT,
  dictionary_name TEXT,
  turn_time INTEGER NOT NULL,
  open_round_enabled INTEGER NOT NULL DEFAULT 1,
  team_count INTEGER NOT NULL,
  winner_name TEXT NOT NULL,
  winner_position INTEGER NOT NULL,
  duration_seconds INTEGER,
  summary_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_finished_at ON game_sessions(finished_at);

CREATE TABLE IF NOT EXISTS dictionary_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  feedback_id TEXT NOT NULL,
  dictionary_id TEXT,
  dictionary_name TEXT,
  word TEXT NOT NULL,
  mode TEXT NOT NULL,
  original_level INTEGER NOT NULL,
  rated_level INTEGER NOT NULL,
  mark_for_removal INTEGER NOT NULL DEFAULT 0,
  was_successful INTEGER NOT NULL DEFAULT 0,
  was_open_round INTEGER NOT NULL DEFAULT 0,
  duration_seconds REAL,
  turn_number INTEGER,
  game_started_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dictionary_feedback_user_feedback
  ON dictionary_feedback(user_id, feedback_id);
CREATE INDEX IF NOT EXISTS idx_dictionary_feedback_user_id
  ON dictionary_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_dictionary_feedback_dictionary_id
  ON dictionary_feedback(dictionary_id);

CREATE TABLE IF NOT EXISTS user_dictionary_access (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  dictionary_id TEXT NOT NULL,
  granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  access_source TEXT NOT NULL DEFAULT 'manual',
  note TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_dictionary_access_unique
  ON user_dictionary_access(user_id, dictionary_id);
CREATE INDEX IF NOT EXISTS idx_user_dictionary_access_user_id
  ON user_dictionary_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_dictionary_access_dictionary_id
  ON user_dictionary_access(dictionary_id);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  product_code TEXT NOT NULL,
  status TEXT NOT NULL,
  amount_value TEXT NOT NULL,
  amount_currency TEXT NOT NULL DEFAULT 'RUB',
  provider TEXT NOT NULL DEFAULT 'yookassa',
  provider_payment_id TEXT,
  idempotence_key TEXT NOT NULL,
  confirmation_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at TEXT,
  raw_create_response TEXT,
  raw_webhook_payload TEXT,
  dictionary_id TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_orders_idempotence_key
  ON purchase_orders(idempotence_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_orders_provider_payment_id
  ON purchase_orders(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_dictionary_id
  ON purchase_orders(dictionary_id);

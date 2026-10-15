CREATE TABLE IF NOT EXISTS game_analytics (
  game_id TEXT PRIMARY KEY,
  visitor_hash TEXT NOT NULL,
  user_id INTEGER,
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'finished')),
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  dictionary_id TEXT NOT NULL,
  team_count INTEGER NOT NULL,
  participant_count INTEGER NOT NULL,
  turn_time_seconds INTEGER NOT NULL,
  open_round_enabled INTEGER NOT NULL DEFAULT 1,
  duration_seconds INTEGER,
  turn_count INTEGER,
  successful_turn_count INTEGER,
  open_round_count INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_game_analytics_started_at ON game_analytics(started_at);
CREATE INDEX IF NOT EXISTS idx_game_analytics_status ON game_analytics(status);
CREATE INDEX IF NOT EXISTS idx_game_analytics_visitor_hash ON game_analytics(visitor_hash);
CREATE INDEX IF NOT EXISTS idx_game_analytics_user_id ON game_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_game_analytics_dictionary_id ON game_analytics(dictionary_id);

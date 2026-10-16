CREATE TABLE IF NOT EXISTS card_analytics (
  game_id TEXT NOT NULL,
  turn_number INTEGER NOT NULL,
  card_id TEXT NOT NULL,
  dictionary_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('DRAW', 'EXPLAIN', 'ACT')),
  difficulty INTEGER NOT NULL CHECK (difficulty IN (3, 4, 5)),
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failed', 'timeout')),
  duration_ms INTEGER NOT NULL,
  was_open_round INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (game_id, turn_number),
  FOREIGN KEY (game_id) REFERENCES game_analytics(game_id) ON DELETE CASCADE
);

-- No secondary indexes by design. Reports are manual and infrequent; avoiding
-- indexes keeps each recorded turn to the table row plus its primary-key entry.

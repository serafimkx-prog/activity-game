-- Aggregate-only card difficulty report. The opaque card_id can be reproduced
-- from repository dictionaries without storing the word in D1.

SELECT
  COUNT(*) AS recorded_turns,
  COUNT(DISTINCT game_id) AS games_with_card_data,
  COUNT(DISTINCT card_id) AS observed_cards,
  ROUND(AVG(outcome = 'success') * 100, 1) AS success_rate_percent,
  ROUND(AVG(outcome = 'timeout') * 100, 1) AS timeout_rate_percent,
  ROUND(AVG(duration_ms) / 1000.0, 1) AS average_duration_seconds
FROM card_analytics;

SELECT
  dictionary_id,
  mode,
  difficulty,
  COUNT(*) AS attempts,
  ROUND(AVG(outcome = 'success') * 100, 1) AS success_rate_percent,
  ROUND(AVG(outcome = 'timeout') * 100, 1) AS timeout_rate_percent,
  ROUND(AVG(CASE WHEN outcome = 'success' THEN duration_ms END) / 1000.0, 1) AS average_success_seconds
FROM card_analytics
GROUP BY dictionary_id, mode, difficulty
ORDER BY dictionary_id, mode, difficulty;

-- A card enters the actionable list only after at least 10 observations.
SELECT
  dictionary_id,
  card_id,
  mode,
  difficulty,
  COUNT(*) AS attempts,
  SUM(outcome = 'success') AS successes,
  ROUND(AVG(outcome = 'success') * 100, 1) AS success_rate_percent,
  ROUND(AVG(outcome = 'timeout') * 100, 1) AS timeout_rate_percent,
  ROUND(AVG(CASE WHEN outcome = 'success' THEN duration_ms END) / 1000.0, 1) AS average_success_seconds
FROM card_analytics
GROUP BY dictionary_id, card_id, mode, difficulty
HAVING COUNT(*) >= 10
ORDER BY success_rate_percent ASC, timeout_rate_percent DESC, attempts DESC;

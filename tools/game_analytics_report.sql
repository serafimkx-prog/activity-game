SELECT
  COUNT(*) AS games_started,
  COALESCE(SUM(CASE WHEN status = 'finished' THEN 1 ELSE 0 END), 0) AS games_finished,
  COALESCE(ROUND(
    100.0 * SUM(CASE WHEN status = 'finished' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0),
    1
  ), 0) AS completion_percent,
  COUNT(DISTINCT visitor_hash) AS browser_installations,
  COUNT(DISTINCT user_id) AS authenticated_users,
  COALESCE(SUM(participant_count), 0) AS participant_seats,
  ROUND(AVG(CASE WHEN status = 'finished' THEN duration_seconds END)) AS average_duration_seconds,
  ROUND(AVG(CASE WHEN status = 'finished' THEN turn_count END), 1) AS average_turn_count
FROM game_analytics;

SELECT
  DATE(started_at) AS day,
  COUNT(*) AS games_started,
  SUM(CASE WHEN status = 'finished' THEN 1 ELSE 0 END) AS games_finished,
  SUM(participant_count) AS participant_seats,
  ROUND(AVG(CASE WHEN status = 'finished' THEN duration_seconds END)) AS average_duration_seconds
FROM game_analytics
GROUP BY DATE(started_at)
ORDER BY day DESC
LIMIT 30;

SELECT
  dictionary_id,
  COUNT(*) AS games_started,
  SUM(CASE WHEN status = 'finished' THEN 1 ELSE 0 END) AS games_finished,
  SUM(participant_count) AS participant_seats,
  ROUND(AVG(CASE WHEN status = 'finished' THEN duration_seconds END)) AS average_duration_seconds
FROM game_analytics
GROUP BY dictionary_id
ORDER BY games_started DESC, dictionary_id ASC;

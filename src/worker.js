import { error, json, methodNotAllowed } from "./lib/http.js";
import {
  buildExpiredSessionCookie,
  buildSessionCookie,
  createSession,
  deleteSession,
  getSessionIdFromRequest,
  getSessionUser,
} from "./lib/session.js";
import {
  normalizeTelegramProfile,
  verifyTelegramAuth,
} from "./lib/telegram.js";

async function upsertUser(db, profile) {
  const existing = await db
    .prepare(
      `SELECT id
       FROM users
       WHERE telegram_user_id = ?1`
    )
    .bind(profile.telegramUserId)
    .first();

  if (existing) {
    await db
      .prepare(
        `UPDATE users
         SET username = ?2,
             first_name = ?3,
             last_name = ?4,
             photo_url = ?5,
             last_login_at = CURRENT_TIMESTAMP
         WHERE telegram_user_id = ?1`
      )
      .bind(
        profile.telegramUserId,
        profile.username,
        profile.firstName,
        profile.lastName,
        profile.photoUrl
      )
      .run();

    return existing.id;
  }

  const inserted = await db
    .prepare(
      `INSERT INTO users (
         telegram_user_id,
         username,
         first_name,
         last_name,
         photo_url
       ) VALUES (?1, ?2, ?3, ?4, ?5)
       RETURNING id`
    )
    .bind(
      profile.telegramUserId,
      profile.username,
      profile.firstName,
      profile.lastName,
      profile.photoUrl
    )
    .first();

  return inserted.id;
}

async function handleTelegramAuth(request, env) {
  const wrongMethod = methodNotAllowed(request, "POST");
  if (wrongMethod) return wrongMethod;

  let payload;
  try {
    payload = await request.json();
  } catch {
    return error("Invalid JSON body", 400);
  }

  const isValid = await verifyTelegramAuth(payload, env.TELEGRAM_BOT_TOKEN);
  if (!isValid) {
    return error("Telegram auth validation failed", 401);
  }

  const profile = normalizeTelegramProfile(payload);
  const userId = await upsertUser(env.DB, profile);
  const { sessionId } = await createSession(env.DB, userId);

  return json(
    {
      ok: true,
      user: {
        telegramUserId: profile.telegramUserId,
        username: profile.username,
        firstName: profile.firstName,
        lastName: profile.lastName,
        photoUrl: profile.photoUrl,
      },
    },
    {
      headers: {
        "Set-Cookie": buildSessionCookie(sessionId),
      },
    }
  );
}

async function handleMe(request, env) {
  const wrongMethod = methodNotAllowed(request, "GET");
  if (wrongMethod) return wrongMethod;

  const sessionId = getSessionIdFromRequest(request);
  const user = await getSessionUser(env.DB, sessionId);

  return json({
    ok: true,
    authenticated: Boolean(user),
    user,
  });
}

async function handleLogout(request, env) {
  const wrongMethod = methodNotAllowed(request, "POST");
  if (wrongMethod) return wrongMethod;

  const sessionId = getSessionIdFromRequest(request);
  await deleteSession(env.DB, sessionId);

  return json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": buildExpiredSessionCookie(),
      },
    }
  );
}

async function handleConfig(request, env) {
  const wrongMethod = methodNotAllowed(request, "GET");
  if (wrongMethod) return wrongMethod;

  return json({
    ok: true,
    telegramBotUsername: env.TELEGRAM_BOT_USERNAME || null,
  });
}

async function requireUser(request, env) {
  const sessionId = getSessionIdFromRequest(request);
  const user = await getSessionUser(env.DB, sessionId);

  if (!user) {
    return { errorResponse: error("Authentication required", 401) };
  }

  return { user };
}

async function handleCreateGameSession(request, env) {
  const wrongMethod = methodNotAllowed(request, "POST");
  if (wrongMethod) return wrongMethod;

  const { user, errorResponse } = await requireUser(request, env);
  if (errorResponse) return errorResponse;

  let payload;
  try {
    payload = await request.json();
  } catch {
    return error("Invalid JSON body", 400);
  }

  const required = ["startedAt", "finishedAt", "turnTime", "teamCount", "winnerName", "winnerPosition", "summary"];
  for (const field of required) {
    if (payload[field] === undefined || payload[field] === null) {
      return error("Missing required game session field", 400, { field });
    }
  }

  const durationSeconds = Math.max(
    0,
    Math.round((new Date(payload.finishedAt).getTime() - new Date(payload.startedAt).getTime()) / 1000)
  );

  const inserted = await env.DB
    .prepare(
      `INSERT INTO game_sessions (
         user_id,
         started_at,
         finished_at,
         dictionary_id,
         dictionary_name,
         turn_time,
         open_round_enabled,
         team_count,
         winner_name,
         winner_position,
         duration_seconds,
         summary_json
       ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
       RETURNING id`
    )
    .bind(
      user.id,
      payload.startedAt,
      payload.finishedAt,
      payload.dictionaryId || null,
      payload.dictionaryName || null,
      payload.turnTime,
      payload.openRoundEnabled ? 1 : 0,
      payload.teamCount,
      payload.winnerName,
      payload.winnerPosition,
      durationSeconds,
      JSON.stringify(payload.summary)
    )
    .first();

  return json({ ok: true, gameSessionId: inserted.id });
}

async function handleProfileSummary(request, env) {
  const wrongMethod = methodNotAllowed(request, "GET");
  if (wrongMethod) return wrongMethod;

  const { user, errorResponse } = await requireUser(request, env);
  if (errorResponse) return errorResponse;

  const totals = await env.DB
    .prepare(
      `SELECT
         COUNT(*) AS total_games,
         AVG(COALESCE(duration_seconds, 0)) AS avg_duration_seconds,
         SUM(COALESCE(duration_seconds, 0)) AS total_duration_seconds,
         AVG(COALESCE(team_count, 0)) AS avg_team_count
       FROM game_sessions
       WHERE user_id = ?1`
    )
    .bind(user.id)
    .first();

  const recentRows = await env.DB
    .prepare(
      `SELECT
         id,
         finished_at,
         dictionary_id,
         dictionary_name,
         team_count,
         winner_name,
         winner_position,
         duration_seconds,
         summary_json
       FROM game_sessions
       WHERE user_id = ?1
       ORDER BY finished_at DESC
       LIMIT 20`
    )
    .bind(user.id)
    .all();

  const recentGames = recentRows?.results || [];
  const favoriteDictionary = await env.DB
    .prepare(
      `SELECT
         COALESCE(dictionary_name, 'Без словаря') AS dictionary_name,
         COUNT(*) AS plays
       FROM game_sessions
       WHERE user_id = ?1
       GROUP BY dictionary_name
       ORDER BY plays DESC, dictionary_name ASC
       LIMIT 1`
    )
    .bind(user.id)
    .first();

  return json({
    ok: true,
    stats: {
      totalGames: Number(totals?.total_games || 0),
      averageDurationSeconds: totals?.avg_duration_seconds ? Math.round(Number(totals.avg_duration_seconds)) : 0,
      totalDurationSeconds: totals?.total_duration_seconds ? Math.round(Number(totals.total_duration_seconds)) : 0,
      averageTeamCount: totals?.avg_team_count ? Number(totals.avg_team_count) : 0,
      favoriteDictionary: favoriteDictionary?.dictionary_name || null,
    },
    recentGames: recentGames.slice(0, 5).map(row => ({
      id: row.id,
      finishedAt: row.finished_at,
      dictionaryId: row.dictionary_id,
      dictionaryName: row.dictionary_name,
      teamCount: row.team_count,
      winnerName: row.winner_name,
      winnerPosition: row.winner_position,
      durationSeconds: row.duration_seconds || 0,
      summary: (() => {
        try {
          return JSON.parse(row.summary_json);
        } catch {
          return null;
        }
      })(),
    })),
  });
}

function ensureBindings(env) {
  if (!env.DB) {
    return error("Missing DB binding", 500);
  }

  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/config") {
      return handleConfig(request, env);
    }

    if (url.pathname === "/api/auth/telegram") {
      const bindingError = ensureBindings(env);
      if (bindingError) return bindingError;
      return handleTelegramAuth(request, env);
    }

    if (url.pathname === "/api/me") {
      const bindingError = ensureBindings(env);
      if (bindingError) return bindingError;
      return handleMe(request, env);
    }

    if (url.pathname === "/api/logout") {
      const bindingError = ensureBindings(env);
      if (bindingError) return bindingError;
      return handleLogout(request, env);
    }

    if (url.pathname === "/api/game-sessions") {
      const bindingError = ensureBindings(env);
      if (bindingError) return bindingError;
      return handleCreateGameSession(request, env);
    }

    if (url.pathname === "/api/profile/summary") {
      const bindingError = ensureBindings(env);
      if (bindingError) return bindingError;
      return handleProfileSummary(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

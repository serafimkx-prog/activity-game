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

function ensureBindings(env) {
  if (!env.DB) {
    return error("Missing DB binding", 500);
  }

  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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

    return env.ASSETS.fetch(request);
  },
};

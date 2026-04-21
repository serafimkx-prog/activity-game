const SESSION_COOKIE = "activity_session";
const SESSION_TTL_DAYS = 30;

export function readCookie(request, name) {
  const cookieHeader = request.headers.get("cookie") || "";
  const parts = cookieHeader.split(";").map((part) => part.trim());

  for (const part of parts) {
    if (!part) continue;
    const [key, ...rest] = part.split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }

  return null;
}

function sessionExpiresAt() {
  const date = new Date();
  date.setDate(date.getDate() + SESSION_TTL_DAYS);
  return date.toISOString();
}

function cookieExpiresAt() {
  const date = new Date();
  date.setDate(date.getDate() + SESSION_TTL_DAYS);
  return date.toUTCString();
}

export async function createSession(db, userId) {
  const sessionId = crypto.randomUUID();
  const expiresAt = sessionExpiresAt();

  await db
    .prepare(
      `INSERT INTO sessions (id, user_id, expires_at)
       VALUES (?1, ?2, ?3)`
    )
    .bind(sessionId, userId, expiresAt)
    .run();

  return { sessionId, expiresAt };
}

export async function deleteSession(db, sessionId) {
  if (!sessionId) return;

  await db
    .prepare("DELETE FROM sessions WHERE id = ?1")
    .bind(sessionId)
    .run();
}

export async function getSessionUser(db, sessionId) {
  if (!sessionId) return null;

  const result = await db
    .prepare(
      `SELECT
         sessions.id AS session_id,
         sessions.expires_at,
         users.id,
         users.telegram_user_id,
         users.username,
         users.first_name,
         users.last_name,
         users.photo_url,
         users.created_at,
         users.last_login_at
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.id = ?1`
    )
    .bind(sessionId)
    .first();

  if (!result) return null;
  if (new Date(result.expires_at).getTime() <= Date.now()) {
    await deleteSession(db, sessionId);
    return null;
  }

  return {
    id: result.id,
    telegramUserId: result.telegram_user_id,
    username: result.username,
    firstName: result.first_name,
    lastName: result.last_name,
    photoUrl: result.photo_url,
    createdAt: result.created_at,
    lastLoginAt: result.last_login_at,
  };
}

export function buildSessionCookie(sessionId) {
  const attrs = [
    `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Expires=${cookieExpiresAt()}`,
  ];

  return attrs.join("; ");
}

export function buildExpiredSessionCookie() {
  return [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ].join("; ");
}

export function getSessionIdFromRequest(request) {
  return readCookie(request, SESSION_COOKIE);
}

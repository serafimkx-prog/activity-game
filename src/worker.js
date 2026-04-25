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

const PREMIUM_DICTIONARY_PRODUCTS = {
  geo: {
    productCode: "dictionary_geo",
    dictionaryId: "geo",
    amountValue: "149.00",
    amountCurrency: "RUB",
    description: "Платный словарь География",
  },
  society: {
    productCode: "dictionary_society",
    dictionaryId: "society",
    amountValue: "149.00",
    amountCurrency: "RUB",
    description: "Платный словарь Общество",
  },
};

function normalizeDictionaryMeta(dictionary) {
  return {
    ...dictionary,
    available: dictionary.available !== false,
    access: dictionary.access === "premium" ? "premium" : "free",
    priceLabel: dictionary.priceLabel || null,
  };
}

async function loadDictionaryCatalog(request, env) {
  const assetUrl = new URL("/dictionaries.json", request.url);
  const response = await env.ASSETS.fetch(new Request(assetUrl.toString(), { method: "GET" }));
  if (!response.ok) {
    throw new Error("Failed to load dictionary catalog");
  }

  const payload = await response.json();
  return Array.isArray(payload) ? payload.map(normalizeDictionaryMeta) : [];
}

async function getOptionalUser(request, env) {
  const sessionId = getSessionIdFromRequest(request);
  return getSessionUser(env.DB, sessionId);
}

async function getUserDictionaryAccessIds(db, userId) {
  if (!userId) return new Set();

  const rows = await db
    .prepare(
      `SELECT dictionary_id
       FROM user_dictionary_access
       WHERE user_id = ?1`
    )
    .bind(userId)
    .all();

  return new Set((rows?.results || []).map(row => row.dictionary_id));
}

function buildDictionaryClientMeta(dictionary, accessIds, user) {
  const requiresPurchase = dictionary.access === "premium";
  const hasAccess = !requiresPurchase || accessIds.has(dictionary.id);
  const canPlay = dictionary.available && hasAccess;
  const lockedReason = !dictionary.available
    ? "coming_soon"
    : canPlay
      ? null
      : user
        ? "purchase_required"
        : "login_required";

  return {
    ...dictionary,
    canPlay,
    requiresPurchase,
    lockedReason,
  };
}

async function userHasDictionaryAccess(db, userId, dictionaryId) {
  const existing = await db
    .prepare(
      `SELECT 1
       FROM user_dictionary_access
       WHERE user_id = ?1
         AND dictionary_id = ?2
       LIMIT 1`
    )
    .bind(userId, dictionaryId)
    .first();

  return Boolean(existing);
}

async function grantDictionaryAccess(db, userId, dictionaryId, accessSource, note) {
  await db
    .prepare(
      `INSERT INTO user_dictionary_access (
         user_id,
         dictionary_id,
         access_source,
         note
       ) VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT(user_id, dictionary_id) DO UPDATE SET
         granted_at = CURRENT_TIMESTAMP,
         access_source = excluded.access_source,
         note = excluded.note`
    )
    .bind(userId, dictionaryId, accessSource, note || null)
    .run();
}

function getPremiumDictionaryProduct(dictionaryId) {
  return PREMIUM_DICTIONARY_PRODUCTS[dictionaryId] || null;
}

function ensureYookassaConfig(env) {
  if (!env.YOOKASSA_SHOP_ID || !env.YOOKASSA_SECRET_KEY || !env.YOOKASSA_RETURN_URL) {
    return error("YooKassa is not configured", 500);
  }

  return null;
}

async function createYookassaPayment(env, requestOrigin, product, userId, idempotenceKey) {
  const response = await fetch("https://api.yookassa.ru/v3/payments", {
    method: "POST",
    headers: {
      authorization: `Basic ${btoa(`${env.YOOKASSA_SHOP_ID}:${env.YOOKASSA_SECRET_KEY}`)}`,
      "content-type": "application/json",
      "Idempotence-Key": idempotenceKey,
    },
    body: JSON.stringify({
      amount: {
        value: product.amountValue,
        currency: product.amountCurrency,
      },
      capture: true,
      confirmation: {
        type: "redirect",
        return_url: env.YOOKASSA_RETURN_URL || requestOrigin,
      },
      description: product.description,
      metadata: {
        user_id: String(userId),
        dictionary_id: product.dictionaryId,
        product_code: product.productCode,
      },
    }),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.description || payload?.error || "Failed to create YooKassa payment");
  }

  return payload;
}

async function fetchYookassaPayment(env, providerPaymentId) {
  const response = await fetch(`https://api.yookassa.ru/v3/payments/${providerPaymentId}`, {
    method: "GET",
    headers: {
      authorization: `Basic ${btoa(`${env.YOOKASSA_SHOP_ID}:${env.YOOKASSA_SECRET_KEY}`)}`,
    },
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.description || payload?.error || "Failed to verify YooKassa payment");
  }

  return payload;
}

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

async function handleDictionariesList(request, env) {
  const wrongMethod = methodNotAllowed(request, "GET");
  if (wrongMethod) return wrongMethod;

  const dictionaries = await loadDictionaryCatalog(request, env);
  const user = await getOptionalUser(request, env);
  const accessIds = await getUserDictionaryAccessIds(env.DB, user?.id);

  return json({
    ok: true,
    dictionaries: dictionaries.map(dictionary => buildDictionaryClientMeta(dictionary, accessIds, user)),
  });
}

async function handlePurchaseCreate(request, env) {
  const wrongMethod = methodNotAllowed(request, "POST");
  if (wrongMethod) return wrongMethod;

  const configError = ensureYookassaConfig(env);
  if (configError) return configError;

  const { user, errorResponse } = await requireUser(request, env);
  if (errorResponse) return errorResponse;

  let payload;
  try {
    payload = await request.json();
  } catch {
    return error("Invalid JSON body", 400);
  }

  const dictionaryId = payload?.dictionaryId;
  const product = getPremiumDictionaryProduct(dictionaryId);
  if (!product) {
    return error("Unsupported premium dictionary", 400, { dictionaryId });
  }

  const alreadyOwned = await userHasDictionaryAccess(env.DB, user.id, dictionaryId);
  if (alreadyOwned) {
    return json({
      ok: true,
      alreadyOwned: true,
      dictionaryId,
    });
  }

  const idempotenceKey = crypto.randomUUID();
  const requestOrigin = new URL(request.url).origin;

  let payment;
  try {
    payment = await createYookassaPayment(env, requestOrigin, product, user.id, idempotenceKey);
  } catch (err) {
    return error(err.message || "Failed to create payment", 502);
  }

  const confirmationUrl = payment?.confirmation?.confirmation_url || null;

  await env.DB
    .prepare(
      `INSERT INTO purchase_orders (
         user_id,
         product_code,
         dictionary_id,
         status,
         amount_value,
         amount_currency,
         provider,
         provider_payment_id,
         idempotence_key,
         confirmation_url,
         raw_create_response
       ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'yookassa', ?7, ?8, ?9, ?10)`
    )
    .bind(
      user.id,
      product.productCode,
      product.dictionaryId,
      payment?.status || "pending",
      product.amountValue,
      product.amountCurrency,
      payment?.id || null,
      idempotenceKey,
      confirmationUrl,
      JSON.stringify(payment)
    )
    .run();

  return json({
    ok: true,
    dictionaryId,
    confirmationUrl,
    alreadyOwned: false,
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

async function protectDictionaryAsset(request, env) {
  const dictionaries = await loadDictionaryCatalog(request, env);
  const pathname = new URL(request.url).pathname.replace(/^\//, "");
  const dictionary = dictionaries.find(item => item.file === pathname);

  if (!dictionary) return null;
  if (!dictionary.available) return error("Dictionary is not available yet", 404);
  if (dictionary.access !== "premium") return env.ASSETS.fetch(request);

  const user = await getOptionalUser(request, env);
  if (!user) return error("Authentication required", 401);

  const accessIds = await getUserDictionaryAccessIds(env.DB, user.id);
  if (!accessIds.has(dictionary.id)) {
    return error("Dictionary access required", 403, { dictionaryId: dictionary.id });
  }

  return env.ASSETS.fetch(request);
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

  const existing = await env.DB
    .prepare(
      `SELECT id
       FROM game_sessions
       WHERE user_id = ?1
         AND started_at = ?2
         AND finished_at = ?3
         AND COALESCE(dictionary_id, '') = COALESCE(?4, '')
         AND team_count = ?5
         AND winner_name = ?6
         AND winner_position = ?7
       LIMIT 1`
    )
    .bind(
      user.id,
      payload.startedAt,
      payload.finishedAt,
      payload.dictionaryId || null,
      payload.teamCount,
      payload.winnerName,
      payload.winnerPosition
    )
    .first();

  if (existing?.id) {
    return json({ ok: true, gameSessionId: existing.id, deduplicated: true });
  }

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

async function handleDictionaryFeedback(request, env) {
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

  const required = ["feedbackId", "word", "mode", "originalLevel", "ratedLevel"];
  for (const field of required) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === "") {
      return error("Missing required dictionary feedback field", 400, { field });
    }
  }

  if (!["DRAW", "EXPLAIN", "ACT"].includes(payload.mode)) {
    return error("Invalid dictionary feedback mode", 400);
  }

  const originalLevel = Number(payload.originalLevel);
  const ratedLevel = Number(payload.ratedLevel);
  if (![3, 4, 5].includes(originalLevel) || ![3, 4, 5].includes(ratedLevel)) {
    return error("Invalid dictionary feedback level", 400);
  }

  const durationSeconds =
    payload.durationSeconds === null || payload.durationSeconds === undefined
      ? null
      : Number(payload.durationSeconds);

  const turnNumber =
    payload.turnNumber === null || payload.turnNumber === undefined
      ? null
      : Number(payload.turnNumber);

  await env.DB
    .prepare(
      `INSERT INTO dictionary_feedback (
         user_id,
         feedback_id,
         dictionary_id,
         dictionary_name,
         word,
         mode,
         original_level,
         rated_level,
         was_successful,
         was_open_round,
         duration_seconds,
         turn_number,
         game_started_at
       ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
       ON CONFLICT(user_id, feedback_id) DO UPDATE SET
         dictionary_id = excluded.dictionary_id,
         dictionary_name = excluded.dictionary_name,
         word = excluded.word,
         mode = excluded.mode,
         original_level = excluded.original_level,
         rated_level = excluded.rated_level,
         was_successful = excluded.was_successful,
         was_open_round = excluded.was_open_round,
         duration_seconds = excluded.duration_seconds,
         turn_number = excluded.turn_number,
         game_started_at = excluded.game_started_at,
         updated_at = CURRENT_TIMESTAMP`
    )
    .bind(
      user.id,
      payload.feedbackId,
      payload.dictionaryId || null,
      payload.dictionaryName || null,
      payload.word,
      payload.mode,
      originalLevel,
      ratedLevel,
      payload.wasSuccessful ? 1 : 0,
      payload.wasOpenRound ? 1 : 0,
      Number.isFinite(durationSeconds) ? durationSeconds : null,
      Number.isFinite(turnNumber) ? turnNumber : null,
      payload.gameStartedAt || null
    )
    .run();

  return json({ ok: true });
}

async function handleYookassaWebhook(request, env) {
  const wrongMethod = methodNotAllowed(request, "POST");
  if (wrongMethod) return wrongMethod;

  const configError = ensureYookassaConfig(env);
  if (configError) return configError;

  let payload;
  try {
    payload = await request.json();
  } catch {
    return error("Invalid JSON body", 400);
  }

  const event = payload?.event || null;
  const paymentObject = payload?.object || null;
  const providerPaymentId = paymentObject?.id || null;
  if (!event || !paymentObject || !providerPaymentId) {
    return error("Invalid YooKassa webhook payload", 400);
  }

  const order = await env.DB
    .prepare(
      `SELECT id, user_id, dictionary_id, status
       FROM purchase_orders
       WHERE provider_payment_id = ?1
       LIMIT 1`
    )
    .bind(providerPaymentId)
    .first();

  if (!order) {
    return json({ ok: true, ignored: true });
  }

  let verifiedPayment;
  try {
    verifiedPayment = await fetchYookassaPayment(env, providerPaymentId);
  } catch (err) {
    return error(err.message || "Failed to verify payment", 502);
  }

  const nextStatus = verifiedPayment?.status || paymentObject.status || order.status;
  const paidAt = nextStatus === "succeeded" ? new Date().toISOString() : null;

  await env.DB
    .prepare(
      `UPDATE purchase_orders
       SET status = ?2,
           paid_at = COALESCE(?3, paid_at),
           raw_webhook_payload = ?4,
           updated_at = CURRENT_TIMESTAMP
       WHERE provider_payment_id = ?1`
    )
    .bind(
      providerPaymentId,
      nextStatus,
      paidAt,
      JSON.stringify(payload)
    )
    .run();

  if (nextStatus === "succeeded" && order.dictionary_id) {
    await grantDictionaryAccess(
      env.DB,
      order.user_id,
      order.dictionary_id,
      "yookassa",
      `payment:${providerPaymentId}`
    );
  }

  return json({ ok: true });
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

    if (url.pathname === "/api/dictionaries") {
      const bindingError = ensureBindings(env);
      if (bindingError) return bindingError;
      return handleDictionariesList(request, env);
    }

    if (url.pathname === "/api/logout") {
      const bindingError = ensureBindings(env);
      if (bindingError) return bindingError;
      return handleLogout(request, env);
    }

    if (url.pathname === "/api/purchase/create") {
      const bindingError = ensureBindings(env);
      if (bindingError) return bindingError;
      return handlePurchaseCreate(request, env);
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

    if (url.pathname === "/api/dictionary-feedback") {
      const bindingError = ensureBindings(env);
      if (bindingError) return bindingError;
      return handleDictionaryFeedback(request, env);
    }

    if (url.pathname === "/api/payment/webhook/yookassa") {
      const bindingError = ensureBindings(env);
      if (bindingError) return bindingError;
      return handleYookassaWebhook(request, env);
    }

    const protectedDictionaryAssetResponse = await protectDictionaryAsset(request, env);
    if (protectedDictionaryAssetResponse) {
      return protectedDictionaryAssetResponse;
    }

    return env.ASSETS.fetch(request);
  },
};

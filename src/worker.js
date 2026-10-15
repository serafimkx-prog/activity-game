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
import {
  PAYANYWAY_PROVIDER,
  buildPayAnyWayCheckout,
  buildResponseSignature,
  callbackMatchesOrder,
  entitlementsForProduct,
  getPayAnyWayProduct,
  orderMatchesProduct,
  verifyCallbackSignature,
} from "./lib/payanyway.mjs";

const PAYANYWAY_ORDER_TTL_MINUTES = 30;

function normalizeDictionaryMeta(dictionary) {
  return {
    ...dictionary,
    available: dictionary.available !== false,
    access: dictionary.access === "premium" ? "premium" : "free",
    authAccess: dictionary.authAccess === "login" ? "login" : "none",
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
       WHERE user_id = ?1
       UNION
       SELECT poe.dictionary_id
       FROM purchase_order_entitlements poe
       JOIN purchase_orders po ON po.id = poe.purchase_order_id
       WHERE po.user_id = ?1
         AND po.status = 'succeeded'
         AND poe.revoked_at IS NULL`
    )
    .bind(userId)
    .all();

  return new Set((rows?.results || []).map(row => row.dictionary_id));
}

function buildDictionaryClientMeta(dictionary, accessIds, user) {
  const requiresAuth = dictionary.authAccess === "login";
  const requiresPurchase = dictionary.access === "premium";
  const hasPurchaseAccess = !requiresPurchase || accessIds.has(dictionary.id);
  const hasAuthAccess = !requiresAuth || Boolean(user);
  const canPlay = dictionary.available && hasPurchaseAccess && hasAuthAccess;
  const lockedReason = !dictionary.available
    ? "coming_soon"
    : !hasAuthAccess
      ? "login_required"
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

function payAnyWayTestMode(env) {
  return env.PAYANYWAY_TEST_MODE === "1" ? "1" : "0";
}

function payAnyWayCheckoutReady(env) {
  return env.PAYANYWAY_CHECKOUT_ENABLED === "true"
    && Boolean(env.PAYANYWAY_ACCOUNT_ID)
    && Boolean(env.PAYANYWAY_INTEGRITY_CODE);
}

function ensurePayAnyWayConfig(env, { requireEnabled = false } = {}) {
  if (!env.PAYANYWAY_ACCOUNT_ID || !env.PAYANYWAY_INTEGRITY_CODE) {
    return error("Payment provider is not configured", 503);
  }
  if (requireEnabled && !payAnyWayCheckoutReady(env)) {
    return error("Payment checkout is temporarily unavailable", 503);
  }
  return null;
}

async function getPurchaseOrderByTransaction(db, transactionId) {
  if (!transactionId) return null;
  return db
    .prepare(
      `SELECT id, user_id, product_code, status, amount_value, amount_currency,
              provider, provider_payment_id, idempotence_key, dictionary_id,
              entitlement_ids_json, provider_test_mode, expires_at, paid_at
       FROM purchase_orders
       WHERE idempotence_key = ?1
       LIMIT 1`
    )
    .bind(transactionId)
    .first();
}

async function parsePayAnyWayFields(request) {
  if (request.method === "GET") {
    return Object.fromEntries(new URL(request.url).searchParams.entries());
  }
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/x-www-form-urlencoded")
      && !contentType.includes("multipart/form-data")) {
    return null;
  }
  try {
    return Object.fromEntries((await request.formData()).entries());
  } catch {
    return null;
  }
}

function xmlEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&apos;",
  }[character]));
}

function payAnyWayReceiptInventory(order) {
  const product = getPayAnyWayProduct(order?.product_code);
  if (!product) return null;

  return [{
    name: product.receiptTitle,
    price: product.amountValue,
    quantity: "1",
    vatTag: "1105",
    pm: "full_payment",
    po: "service",
  }];
}

function payAnyWayXmlResponse(
  fields,
  env,
  resultCode,
  description,
  amount = null,
  inventory = null
) {
  const accountId = fields?.MNT_ID || env.PAYANYWAY_ACCOUNT_ID || "";
  const transactionId = fields?.MNT_TRANSACTION_ID || "";
  const signature = buildResponseSignature(
    resultCode,
    accountId,
    transactionId,
    env.PAYANYWAY_INTEGRITY_CODE || ""
  );
  const amountElement = amount ? `\n  <MNT_AMOUNT>${xmlEscape(amount)}</MNT_AMOUNT>` : "";
  const attributesElement = Array.isArray(inventory) && inventory.length
    ? `\n  <MNT_ATTRIBUTES>\n    <ATTRIBUTE>\n      <KEY>INVENTORY</KEY>\n      <VALUE>${xmlEscape(JSON.stringify(inventory))}</VALUE>\n    </ATTRIBUTE>\n  </MNT_ATTRIBUTES>`
    : "";
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<MNT_RESPONSE>
  <MNT_ID>${xmlEscape(accountId)}</MNT_ID>
  <MNT_TRANSACTION_ID>${xmlEscape(transactionId)}</MNT_TRANSACTION_ID>
  <MNT_RESULT_CODE>${resultCode}</MNT_RESULT_CODE>
  <MNT_DESCRIPTION>${xmlEscape(description)}</MNT_DESCRIPTION>${amountElement}
  <MNT_SIGNATURE>${signature}</MNT_SIGNATURE>${attributesElement}
</MNT_RESPONSE>`;
  return new Response(xml, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=UTF-8",
      "cache-control": "no-store",
    },
  });
}

function orderIsExpired(order) {
  if (!order?.expires_at) return false;
  const expiresAt = new Date(order.expires_at);
  return Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() <= Date.now();
}

async function grantPurchaseOrderEntitlements(db, order) {
  const productEntitlements = entitlementsForProduct(order.product_code);
  let storedEntitlements = [];
  try {
    storedEntitlements = JSON.parse(order.entitlement_ids_json || "[]");
  } catch {
    storedEntitlements = [];
  }
  if (!Array.isArray(storedEntitlements)
      || storedEntitlements.length !== productEntitlements.length
      || storedEntitlements.some((id, index) => id !== productEntitlements[index])) {
    throw new Error("Purchase order entitlements do not match product");
  }

  const statements = [
    db.prepare(
      `UPDATE purchase_orders
       SET status = 'succeeded',
           provider_payment_id = COALESCE(provider_payment_id, ?2),
           paid_at = COALESCE(paid_at, CURRENT_TIMESTAMP),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?1
         AND status IN ('pending', 'expired', 'succeeded')`
    ).bind(order.id, order.providerOperationId),
    ...storedEntitlements.map(dictionaryId => db.prepare(
      `INSERT INTO purchase_order_entitlements (
         purchase_order_id,
         dictionary_id
       )
       SELECT ?1, ?2
       FROM purchase_orders
       WHERE id = ?1
         AND status = 'succeeded'
       ON CONFLICT(purchase_order_id, dictionary_id) DO UPDATE SET
         revoked_at = NULL`
    ).bind(order.id, dictionaryId)),
  ];
  await db.batch(statements);
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
    paymentCheckoutReady: payAnyWayCheckoutReady(env),
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
    ownedDictionaryIds: [...accessIds],
  });
}

async function handlePurchaseCreate(request, env) {
  const wrongMethod = methodNotAllowed(request, "POST");
  if (wrongMethod) return wrongMethod;

  const { user, errorResponse } = await requireUser(request, env);
  if (errorResponse) return errorResponse;

  const configError = ensurePayAnyWayConfig(env, { requireEnabled: true });
  if (configError) return configError;

  let payload;
  try {
    payload = await request.json();
  } catch {
    return error("Invalid JSON body", 400);
  }
  const product = getPayAnyWayProduct(payload?.productCode);
  if (!product) return error("Unsupported product", 400);

  const accessIds = await getUserDictionaryAccessIds(env.DB, user.id);
  if (product.dictionaryIds.every(dictionaryId => accessIds.has(dictionaryId))) {
    return json({ ok: true, alreadyOwned: true, productCode: product.productCode });
  }

  await env.DB
    .prepare(
      `UPDATE purchase_orders
       SET status = 'expired', updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?1
         AND provider = ?2
         AND status = 'pending'
         AND expires_at IS NOT NULL
         AND datetime(expires_at) <= CURRENT_TIMESTAMP`
    )
    .bind(user.id, PAYANYWAY_PROVIDER)
    .run();

  let order = await env.DB
    .prepare(
      `SELECT id, user_id, product_code, status, amount_value, amount_currency,
              provider, idempotence_key, dictionary_id, entitlement_ids_json,
              provider_test_mode, expires_at
       FROM purchase_orders
       WHERE user_id = ?1
         AND product_code = ?2
         AND provider = ?3
         AND status = 'pending'
         AND datetime(expires_at) > CURRENT_TIMESTAMP
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .bind(user.id, product.productCode, PAYANYWAY_PROVIDER)
    .first();

  if (!order) {
    const transactionId = `act_${crypto.randomUUID()}`;
    const expiresAt = new Date(Date.now() + PAYANYWAY_ORDER_TTL_MINUTES * 60 * 1000).toISOString();
    order = await env.DB
      .prepare(
        `INSERT INTO purchase_orders (
           user_id,
           product_code,
           status,
           amount_value,
           amount_currency,
           provider,
           idempotence_key,
           dictionary_id,
           entitlement_ids_json,
           provider_test_mode,
           expires_at
         ) VALUES (?1, ?2, 'pending', ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
         ON CONFLICT DO NOTHING
         RETURNING id, user_id, product_code, status, amount_value, amount_currency,
                   provider, idempotence_key, dictionary_id, entitlement_ids_json,
                   provider_test_mode, expires_at`
      )
      .bind(
        user.id,
        product.productCode,
        product.amountValue,
        product.amountCurrency,
        PAYANYWAY_PROVIDER,
        transactionId,
        product.dictionaryIds.length === 1 ? product.dictionaryIds[0] : null,
        JSON.stringify(product.dictionaryIds),
        payAnyWayTestMode(env),
        expiresAt
      )
      .first();

    if (!order) {
      order = await env.DB
        .prepare(
          `SELECT id, user_id, product_code, status, amount_value, amount_currency,
                  provider, idempotence_key, dictionary_id, entitlement_ids_json,
                  provider_test_mode, expires_at
           FROM purchase_orders
           WHERE user_id = ?1
             AND product_code = ?2
             AND provider = ?3
             AND status = 'pending'
             AND datetime(expires_at) > CURRENT_TIMESTAMP
           ORDER BY created_at DESC
           LIMIT 1`
        )
        .bind(user.id, product.productCode, PAYANYWAY_PROVIDER)
        .first();
    }
  }

  if (!order) return error("Unable to initialize payment order", 503);

  const checkout = buildPayAnyWayCheckout({
    accountId: env.PAYANYWAY_ACCOUNT_ID,
    integrityCode: env.PAYANYWAY_INTEGRITY_CODE,
    transactionId: order.idempotence_key,
    subscriberId: order.user_id,
    product,
    testMode: order.provider_test_mode,
  });

  return json({
    ok: true,
    alreadyOwned: false,
    productCode: product.productCode,
    checkout,
    expiresAt: order.expires_at,
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
  const user = await getOptionalUser(request, env);
  if (dictionary.authAccess === "login" && !user) {
    return error("Authentication required", 401);
  }
  if (dictionary.access !== "premium") return env.ASSETS.fetch(request);
  if (!user) return error("Authentication required", 401);

  const accessIds = await getUserDictionaryAccessIds(env.DB, user.id);
  if (!accessIds.has(dictionary.id)) {
    return error("Dictionary access required", 403, { dictionaryId: dictionary.id });
  }

  return env.ASSETS.fetch(request);
}

const ANALYTICS_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function analyticsRequestError(request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return error("Same-origin request required", 403);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 8192) return error("Request body is too large", 413);
  return null;
}

function analyticsInteger(value, min, max) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

async function hashAnalyticsVisitorId(visitorId) {
  const input = new TextEncoder().encode(`activity-analytics-v1:${visitorId}`);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

let analyticsSchemaBootstrapPromise = null;

function ensureGameAnalyticsSchema(db) {
  if (analyticsSchemaBootstrapPromise) return analyticsSchemaBootstrapPromise;

  analyticsSchemaBootstrapPromise = db.batch([
    db.prepare(
      `CREATE TABLE IF NOT EXISTS game_analytics (
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
       )`
    ),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_game_analytics_started_at ON game_analytics(started_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_game_analytics_status ON game_analytics(status)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_game_analytics_visitor_hash ON game_analytics(visitor_hash)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_game_analytics_user_id ON game_analytics(user_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_game_analytics_dictionary_id ON game_analytics(dictionary_id)"),
  ]).catch(err => {
    analyticsSchemaBootstrapPromise = null;
    throw err;
  });

  return analyticsSchemaBootstrapPromise;
}

async function handleAnalyticsGameStart(request, env) {
  const wrongMethod = methodNotAllowed(request, "POST");
  if (wrongMethod) return wrongMethod;

  const requestError = analyticsRequestError(request);
  if (requestError) return requestError;

  // Release bootstrap: remove after the production D1 table has been verified.
  await ensureGameAnalyticsSchema(env.DB);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return error("Invalid JSON body", 400);
  }

  if (!ANALYTICS_UUID_PATTERN.test(payload?.gameId || "") || !ANALYTICS_UUID_PATTERN.test(payload?.visitorId || "")) {
    return error("Invalid analytics identifier", 400);
  }

  const dictionaryId = String(payload?.dictionaryId || "");
  const dictionaries = await loadDictionaryCatalog(request, env);
  if (!dictionaries.some(dictionary => dictionary.id === dictionaryId && dictionary.available)) {
    return error("Invalid dictionary", 400);
  }

  const teamCount = analyticsInteger(payload.teamCount, 2, 6);
  const participantCount = analyticsInteger(payload.participantCount, 2, 120);
  const turnTimeSeconds = analyticsInteger(payload.turnTimeSeconds, 30, 120);
  if (
    teamCount === null ||
    participantCount === null ||
    turnTimeSeconds === null ||
    typeof payload.openRoundEnabled !== "boolean"
  ) {
    return error("Invalid game analytics values", 400);
  }

  const visitorHash = await hashAnalyticsVisitorId(payload.visitorId);
  const user = await getOptionalUser(request, env);

  await env.DB
    .prepare(
      `INSERT INTO game_analytics (
         game_id,
         visitor_hash,
         user_id,
         dictionary_id,
         team_count,
         participant_count,
         turn_time_seconds,
         open_round_enabled
       ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
       ON CONFLICT(game_id) DO NOTHING`
    )
    .bind(
      payload.gameId,
      visitorHash,
      user?.id || null,
      dictionaryId,
      teamCount,
      participantCount,
      turnTimeSeconds,
      payload.openRoundEnabled ? 1 : 0
    )
    .run();

  return json({ ok: true });
}

async function handleAnalyticsGameFinish(request, env) {
  const wrongMethod = methodNotAllowed(request, "POST");
  if (wrongMethod) return wrongMethod;

  const requestError = analyticsRequestError(request);
  if (requestError) return requestError;

  let payload;
  try {
    payload = await request.json();
  } catch {
    return error("Invalid JSON body", 400);
  }

  if (!ANALYTICS_UUID_PATTERN.test(payload?.gameId || "") || !ANALYTICS_UUID_PATTERN.test(payload?.visitorId || "")) {
    return error("Invalid analytics identifier", 400);
  }

  const durationSeconds = analyticsInteger(payload.durationSeconds, 0, 2592000);
  const turnCount = analyticsInteger(payload.turnCount, 0, 10000);
  const successfulTurnCount = analyticsInteger(payload.successfulTurnCount, 0, 10000);
  const openRoundCount = analyticsInteger(payload.openRoundCount, 0, 10000);
  if (
    durationSeconds === null ||
    turnCount === null ||
    successfulTurnCount === null ||
    openRoundCount === null ||
    successfulTurnCount > turnCount ||
    openRoundCount > turnCount
  ) {
    return error("Invalid finished game analytics values", 400);
  }

  const visitorHash = await hashAnalyticsVisitorId(payload.visitorId);
  const user = await getOptionalUser(request, env);
  const result = await env.DB
    .prepare(
      `UPDATE game_analytics
       SET status = 'finished',
           user_id = COALESCE(user_id, ?3),
           finished_at = CURRENT_TIMESTAMP,
           duration_seconds = ?4,
           turn_count = ?5,
           successful_turn_count = ?6,
           open_round_count = ?7,
           updated_at = CURRENT_TIMESTAMP
       WHERE game_id = ?1
         AND visitor_hash = ?2`
    )
    .bind(
      payload.gameId,
      visitorHash,
      user?.id || null,
      durationSeconds,
      turnCount,
      successfulTurnCount,
      openRoundCount
    )
    .run();

  if (!result?.meta?.changes) return error("Analytics game not found", 404);
  return json({ ok: true });
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

  const markForRemoval = payload.markForRemoval ? 1 : 0;

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
         mark_for_removal,
         was_successful,
         was_open_round,
         duration_seconds,
         turn_number,
         game_started_at
       ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
       ON CONFLICT(user_id, feedback_id) DO UPDATE SET
         dictionary_id = excluded.dictionary_id,
         dictionary_name = excluded.dictionary_name,
         word = excluded.word,
         mode = excluded.mode,
         original_level = excluded.original_level,
         rated_level = excluded.rated_level,
         mark_for_removal = excluded.mark_for_removal,
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
      markForRemoval,
      payload.wasSuccessful ? 1 : 0,
      payload.wasOpenRound ? 1 : 0,
      Number.isFinite(durationSeconds) ? durationSeconds : null,
      Number.isFinite(turnNumber) ? turnNumber : null,
      payload.gameStartedAt || null
    )
    .run();

  return json({ ok: true });
}

async function handlePayAnyWayCheck(request, env) {
  const wrongMethod = methodNotAllowed(request, ["GET", "POST"]);
  if (wrongMethod) return wrongMethod;
  const configError = ensurePayAnyWayConfig(env);
  if (configError) return configError;

  const fields = await parsePayAnyWayFields(request);
  if (!fields || fields.MNT_COMMAND !== "CHECK") {
    return new Response("Invalid check request", { status: 400 });
  }
  if (fields.MNT_ID !== env.PAYANYWAY_ACCOUNT_ID
      || !verifyCallbackSignature(fields, env.PAYANYWAY_INTEGRITY_CODE, true)) {
    return new Response("Invalid check signature", { status: 403 });
  }

  const order = await getPurchaseOrderByTransaction(env.DB, fields.MNT_TRANSACTION_ID);
  if (!orderMatchesProduct(order)
      || !callbackMatchesOrder(fields, order, env.PAYANYWAY_ACCOUNT_ID)) {
    return payAnyWayXmlResponse(fields, env, 500, "Order mismatch");
  }

  if (order.status === "succeeded") {
    return payAnyWayXmlResponse(fields, env, 200, "Order paid", order.amount_value);
  }
  if (order.status !== "pending" || orderIsExpired(order)) {
    return payAnyWayXmlResponse(fields, env, 500, "Order unavailable");
  }
  return payAnyWayXmlResponse(fields, env, 402, "Order ready", order.amount_value);
}

async function handlePayAnyWayPayment(request, env) {
  const wrongMethod = methodNotAllowed(request, ["GET", "POST"]);
  if (wrongMethod) return wrongMethod;
  const configError = ensurePayAnyWayConfig(env);
  if (configError) return configError;

  const fields = await parsePayAnyWayFields(request);
  if (!fields
      || fields.MNT_ID !== env.PAYANYWAY_ACCOUNT_ID
      || !verifyCallbackSignature(fields, env.PAYANYWAY_INTEGRITY_CODE, false)) {
    return new Response("FAIL", {
      status: 200,
      headers: { "content-type": "text/plain; charset=UTF-8", "cache-control": "no-store" },
    });
  }

  const order = await getPurchaseOrderByTransaction(env.DB, fields.MNT_TRANSACTION_ID);
  if (!orderMatchesProduct(order)
      || !callbackMatchesOrder(fields, order, env.PAYANYWAY_ACCOUNT_ID)
      || !fields.MNT_OPERATION_ID) {
    return payAnyWayXmlResponse(fields, env, 500, "Payment mismatch");
  }

  if (["refunded", "canceled"].includes(order.status)) {
    return payAnyWayXmlResponse(fields, env, 200, "Order closed");
  }
  if (!["pending", "expired", "succeeded"].includes(order.status)) {
    return payAnyWayXmlResponse(fields, env, 500, "Order unavailable");
  }

  try {
    await grantPurchaseOrderEntitlements(env.DB, {
      ...order,
      providerOperationId: String(fields.MNT_OPERATION_ID),
    });
  } catch {
    return payAnyWayXmlResponse(fields, env, 302, "Payment processing");
  }

  return payAnyWayXmlResponse(
    fields,
    env,
    200,
    "Payment accepted",
    null,
    payAnyWayReceiptInventory(order)
  );
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

    if (url.pathname === "/google75feaf05e1429f76.html") {
      return new Response(
        "google-site-verification: google75feaf05e1429f76.html",
        { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "no-transform" } }
      );
    }

    if (url.pathname === "/yandex_a94edf4eee889378.html") {
      return new Response(
        '<html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"></head><body>Verification: a94edf4eee889378</body></html>',
        { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "no-transform" } }
      );
    }

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

    if (url.pathname === "/api/analytics/game-start") {
      const bindingError = ensureBindings(env);
      if (bindingError) return bindingError;
      return handleAnalyticsGameStart(request, env);
    }

    if (url.pathname === "/api/analytics/game-finish") {
      const bindingError = ensureBindings(env);
      if (bindingError) return bindingError;
      return handleAnalyticsGameFinish(request, env);
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

    if (url.pathname === "/api/payment/check/payanyway") {
      const bindingError = ensureBindings(env);
      if (bindingError) return bindingError;
      return handlePayAnyWayCheck(request, env);
    }

    if (url.pathname === "/api/payment/webhook/payanyway") {
      const bindingError = ensureBindings(env);
      if (bindingError) return bindingError;
      return handlePayAnyWayPayment(request, env);
    }

    const protectedDictionaryAssetResponse = await protectDictionaryAsset(request, env);
    if (protectedDictionaryAssetResponse) {
      return protectedDictionaryAssetResponse;
    }

    return env.ASSETS.fetch(request);
  },
};

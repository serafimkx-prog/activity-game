function buildDataCheckString(payload) {
  return Object.keys(payload)
    .filter((key) => key !== "hash" && payload[key] !== undefined && payload[key] !== null && payload[key] !== "")
    .sort()
    .map((key) => `${key}=${payload[key]}`)
    .join("\n");
}

async function sha256Bytes(input) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
}

function bytesToHex(buffer) {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function signHmac(keyBuffer, payload) {
  const key = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  return crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
}

export async function verifyTelegramAuth(payload, botToken) {
  if (!botToken) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN secret");
  }

  const requiredFields = ["id", "first_name", "auth_date", "hash"];
  for (const field of requiredFields) {
    if (!payload[field]) return false;
  }

  const authDateMs = Number(payload.auth_date) * 1000;
  if (!Number.isFinite(authDateMs)) return false;

  const oneDayMs = 24 * 60 * 60 * 1000;
  if (Date.now() - authDateMs > oneDayMs) return false;

  const secretKey = await sha256Bytes(botToken);
  const dataCheckString = buildDataCheckString(payload);
  const signature = await signHmac(secretKey, dataCheckString);

  return bytesToHex(signature) === payload.hash;
}

export function normalizeTelegramProfile(payload) {
  return {
    telegramUserId: String(payload.id),
    username: payload.username || null,
    firstName: payload.first_name,
    lastName: payload.last_name || null,
    photoUrl: payload.photo_url || null,
  };
}

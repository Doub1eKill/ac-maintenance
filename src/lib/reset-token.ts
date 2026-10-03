import crypto from "node:crypto";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Stateless, signed password-reset tokens (HMAC over userId + expiry),
 * rather than a database-backed token table. This is a deliberate,
 * scope-appropriate choice: every account in this migration needs exactly
 * one forced, one-time reset link generated in bulk (see
 * requestPasswordReset below), not a recurring self-service "forgot
 * password" feature that would need revocation/single-use tracking — so
 * there's no real table to add for that. If self-service reset requests
 * become a real recurring feature later, revisit this with a DB-backed
 * token table so links can be revoked/invalidated server-side.
 */
//
// Single use without that table: the signature also covers the account's
// current password hash, which is not in the token. Setting a new password
// changes the hash, so the link that did it — and any other link issued
// before — stops verifying. It used to stay good for its full hour, so a link
// left in a browser history or a forwarded email could set the password again.
function sign(payload: string, currentPasswordHash: string | null): string {
  return crypto
    .createHmac("sha256", process.env.AUTH_SECRET as string)
    .update(`${payload}:${currentPasswordHash ?? "no-password"}`)
    .digest("hex");
}

export function createResetToken(userId: number, currentPasswordHash: string | null): string {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = `${userId}:${expiresAt}`;
  const signature = sign(payload, currentPasswordHash);
  return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

/** The account a token names, read without checking it — to look up the hash verifyResetToken needs. */
export function resetTokenUserId(token: string): number | null {
  try {
    const [userIdStr] = Buffer.from(token, "base64url").toString("utf8").split(":");
    const userId = Number(userIdStr);
    return Number.isSafeInteger(userId) && userId > 0 ? userId : null;
  } catch {
    return null;
  }
}

export function verifyResetToken(token: string, currentPasswordHash: string | null): { userId: number } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [userIdStr, expiresAtStr, signature] = decoded.split(":");
    if (!userIdStr || !expiresAtStr || !signature) return null;

    const expected = sign(`${userIdStr}:${expiresAtStr}`, currentPasswordHash);
    // Constant-time comparison — a naive `===` here would let an attacker
    // guess the signature one byte at a time via response-time differences.
    const signaturesMatch =
      signature.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    if (!signaturesMatch) return null;

    if (Date.now() > Number(expiresAtStr)) return null;

    return { userId: Number(userIdStr) };
  } catch {
    return null;
  }
}

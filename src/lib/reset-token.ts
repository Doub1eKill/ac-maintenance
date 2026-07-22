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
function sign(payload: string): string {
  return crypto.createHmac("sha256", process.env.AUTH_SECRET as string).update(payload).digest("hex");
}

export function createResetToken(userId: number): string {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = `${userId}:${expiresAt}`;
  const signature = sign(payload);
  return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

export function verifyResetToken(token: string): { userId: number } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [userIdStr, expiresAtStr, signature] = decoded.split(":");
    if (!userIdStr || !expiresAtStr || !signature) return null;

    const expected = sign(`${userIdStr}:${expiresAtStr}`);
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

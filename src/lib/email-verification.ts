import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { normaliseEmail } from "@/lib/email-check";

/**
 * Proof that an address is read, gathered before the account exists.
 *
 * The register form asks for a code to be sent, the person types it back,
 * and only then does the submit button work. Passing the check hands the
 * form a signed token naming the address; registerUser accepts the address
 * only with that token, so the proof travels with the submission rather
 * than being looked up again — the same stateless HMAC the password-reset
 * link uses (see reset-token.ts), signed with AUTH_SECRET.
 *
 * The codes themselves live in email_verification_codes as hashes, with a
 * short life and a small allowance of wrong guesses; the table is where the
 * limits are enforced, not where codes can be read back from.
 */

export const CODE_LENGTH = 6;
export const CODE_TTL_MS = 15 * 60 * 1000;
export const CODE_MAX_ATTEMPTS = 5;
/** How long a passed check stays good for the submit that follows it. */
export const PROOF_TTL_MS = 30 * 60 * 1000;
/** A second code for the same address is refused for this long. */
export const RESEND_COOLDOWN_MS = 60 * 1000;
/** Codes per address per hour, however they are asked for. */
export const SENDS_PER_HOUR = 5;

// Hashed with the address so a code taken from one row cannot be replayed
// against another; the harness reproduces this to plant a code it knows.
export function hashCode(email: string, code: string): string {
  return crypto.createHash("sha256").update(`${email}:${code}`).digest("hex");
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", process.env.AUTH_SECRET as string).update(payload).digest("hex");
}

export function createProofToken(email: string): string {
  const expiresAt = Date.now() + PROOF_TTL_MS;
  const payload = `${email}|${expiresAt}`;
  return Buffer.from(`${payload}|${sign(payload)}`).toString("base64url");
}

/** The address the token vouches for, or null if it is not a token for `email`. */
export function verifyProofToken(token: unknown, email: string): boolean {
  if (typeof token !== "string" || !token) return false;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split("|");
    if (parts.length !== 3) return false;
    const [tokenEmail, expiresAtStr, signature] = parts;
    const expected = sign(`${tokenEmail}|${expiresAtStr}`);
    const signaturesMatch =
      signature.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    if (!signaturesMatch) return false;
    if (Date.now() > Number(expiresAtStr)) return false;
    return tokenEmail === normaliseEmail(email);
  } catch {
    return false;
  }
}

export type SendCodeResult =
  | { status: "sent"; cooldownSeconds: number }
  | { status: "cooldown"; retryInSeconds: number }
  | { status: "limited" }
  | { status: "failed"; message: string };

/**
 * Issues a fresh code for the address and mails it. Earlier codes for the
 * same address are retired so only the newest one can be typed in.
 */
export async function sendVerificationCode(rawEmail: string): Promise<SendCodeResult> {
  const email = normaliseEmail(rawEmail);
  const now = new Date();

  // Old rows are swept on the way through rather than by a job: this is the
  // only writer, and a row a day old is of no use to anyone.
  await prisma.emailVerificationCode.deleteMany({
    where: { expiresAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
  });

  const recent = await prisma.emailVerificationCode.findMany({
    where: { email, createdAt: { gt: new Date(now.getTime() - 60 * 60 * 1000) } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (recent.length >= SENDS_PER_HOUR) return { status: "limited" };
  const last = recent[0]?.createdAt;
  if (last && now.getTime() - last.getTime() < RESEND_COOLDOWN_MS) {
    return { status: "cooldown", retryInSeconds: Math.ceil((RESEND_COOLDOWN_MS - (now.getTime() - last.getTime())) / 1000) };
  }

  const code = crypto.randomInt(0, 10 ** CODE_LENGTH).toString().padStart(CODE_LENGTH, "0");
  const expiresAt = new Date(now.getTime() + CODE_TTL_MS);

  await prisma.$transaction([
    // Retire whatever was outstanding: one live code per address.
    prisma.emailVerificationCode.updateMany({
      where: { email, verifiedAt: null, expiresAt: { gt: now } },
      data: { expiresAt: now },
    }),
    prisma.emailVerificationCode.create({
      data: { email, codeHash: hashCode(email, code), expiresAt },
    }),
  ]);

  const { text, html } = codeEmailBody(code);
  const result = await sendMail({ to: email, subject: CODE_SUBJECT, text, html });

  if (result.status === "not_configured") {
    if (process.env.NODE_ENV === "production") {
      return { status: "failed", message: "ระบบยังไม่ได้ตั้งค่าการส่งอีเมล กรุณาติดต่อผู้ดูแลระบบ" };
    }
    // Development without SMTP: the code has to reach the developer
    // somehow, and the terminal is the only other channel. Gated on the
    // environment as well, like the reset link, so a production deploy
    // without credentials fails loudly above rather than printing codes.
    console.log(`[email verification] ${email} -> ${code}`);
  } else if (result.status === "failed") {
    console.error(`[email verification] send to ${email} failed: ${result.error}`);
    return { status: "failed", message: "ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }

  return { status: "sent", cooldownSeconds: RESEND_COOLDOWN_MS / 1000 };
}

export type VerifyCodeResult =
  | { status: "verified"; token: string }
  | { status: "wrong"; attemptsLeft: number }
  | { status: "expired" }
  | { status: "none" };

/**
 * Checks a typed code against the newest live one for the address. A wrong
 * guess is counted; at the limit the code is retired and a new one has to
 * be requested.
 */
export async function verifyCode(rawEmail: string, rawCode: string): Promise<VerifyCodeResult> {
  const email = normaliseEmail(rawEmail);
  const code = String(rawCode ?? "").replace(/\D/g, "");
  const now = new Date();

  const row = await prisma.emailVerificationCode.findFirst({
    where: { email, verifiedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return { status: "none" };
  if (row.expiresAt <= now || row.attempts >= CODE_MAX_ATTEMPTS) return { status: "expired" };

  const expected = row.codeHash;
  const given = hashCode(email, code);
  const match =
    code.length === CODE_LENGTH &&
    crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));

  if (!match) {
    const attempts = row.attempts + 1;
    await prisma.emailVerificationCode.update({
      where: { id: row.id },
      // The last allowed guess also retires the code, so a further request
      // is told "expired" rather than given a sixth try.
      data: { attempts, ...(attempts >= CODE_MAX_ATTEMPTS ? { expiresAt: now } : {}) },
    });
    const attemptsLeft = Math.max(0, CODE_MAX_ATTEMPTS - attempts);
    return attemptsLeft === 0 ? { status: "expired" } : { status: "wrong", attemptsLeft };
  }

  await prisma.emailVerificationCode.update({
    where: { id: row.id },
    data: { verifiedAt: now },
  });
  return { status: "verified", token: createProofToken(email) };
}

/** Once the account exists the codes have served their purpose. */
export async function discardCodesFor(rawEmail: string): Promise<void> {
  await prisma.emailVerificationCode.deleteMany({ where: { email: normaliseEmail(rawEmail) } });
}

const CODE_SUBJECT = "รหัสยืนยันอีเมล — ระบบซ่อมบำรุงเครื่องปรับอากาศ";

function codeEmailBody(code: string) {
  const spaced = code.split("").join(" ");
  const text = [
    `รหัสยืนยันอีเมลของคุณคือ ${code}`,
    "",
    "กรอกรหัสนี้ในหน้าลงทะเบียนภายใน 15 นาที",
    "",
    "หากคุณไม่ได้ลงทะเบียนใช้งานระบบซ่อมบำรุงเครื่องปรับอากาศ ไม่ต้องดำเนินการใด ๆ",
  ].join("\n");

  // Plain markup with inline styles, as the reset mail does — mail clients
  // strip <style> blocks and external CSS.
  const html = `
    <div style="font-family: sans-serif; font-size: 15px; color: #0f172a; line-height: 1.7;">
      <p>รหัสยืนยันอีเมลของคุณคือ</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 16px 0; font-family: monospace;">${spaced}</p>
      <p>กรอกรหัสนี้ในหน้าลงทะเบียนภายใน 15 นาที</p>
      <p style="font-size: 13px; color: #475569;">
        หากคุณไม่ได้ลงทะเบียนใช้งานระบบซ่อมบำรุงเครื่องปรับอากาศ ไม่ต้องดำเนินการใด ๆ
      </p>
    </div>
  `;
  return { text, html };
}

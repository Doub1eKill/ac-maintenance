import { promises as dns } from "node:dns";
import {
  isInstitutionalDomain,
  isWellFormed,
  normaliseEmail,
  suggestDomain,
  type EmailCheck,
} from "@/lib/email-check";

// Server-only half of the email check: the resolver is asked whether the
// domain takes mail. Split from @/lib/email-check so the form can import the
// pure helpers without dragging node:dns into the browser bundle.

// Whether a domain accepts mail, remembered for a while: the same domain is
// asked about on every keystroke that completes an address, and most users
// share one of a handful of domains.
const MX_CACHE_TTL_MS = 10 * 60 * 1000;
const DNS_TIMEOUT_MS = 3_000;
const mxCache = new Map<string, { accepts: boolean | null; at: number }>();

/**
 * true — the domain has an MX record, or an A record to fall back on (RFC
 * 5321 §5.1); false — the resolver says there is nothing there; null — the
 * resolver could not say (timeout, server failure), which is treated as
 * unknown rather than as a refusal so a flaky DNS never turns away a real
 * address.
 */
export async function domainAcceptsMail(domain: string): Promise<boolean | null> {
  const cached = mxCache.get(domain);
  if (cached && Date.now() - cached.at < MX_CACHE_TTL_MS) return cached.accepts;

  const withTimeout = <T>(p: Promise<T>) =>
    Promise.race<T>([
      p,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error("dns timeout")), DNS_TIMEOUT_MS)),
    ]);

  // ENOTFOUND and ENODATA are answers ("no such name", "no such record");
  // anything else is the resolver failing to answer.
  const isNegative = (e: unknown) =>
    typeof e === "object" && e !== null && ["ENOTFOUND", "ENODATA"].includes(String((e as { code?: unknown }).code));

  let accepts: boolean | null;
  try {
    const mx = await withTimeout(dns.resolveMx(domain));
    accepts = mx.length > 0;
  } catch (e) {
    if (!isNegative(e)) {
      accepts = null;
    } else {
      try {
        const a = await withTimeout(dns.resolve4(domain));
        accepts = a.length > 0;
      } catch (e2) {
        accepts = isNegative(e2) ? false : null;
      }
    }
  }

  // An unknown is not cached: the next attempt may get an answer.
  if (accepts !== null) mxCache.set(domain, { accepts, at: Date.now() });
  return accepts;
}

/**
 * Everything short of asking the database. `verified` on an ok result says
 * whether the domain was actually confirmed to accept mail, or merely not
 * refuted (resolver unavailable).
 */
export async function checkEmailShape(raw: string): Promise<EmailCheck> {
  const email = normaliseEmail(raw);
  if (!isWellFormed(email)) {
    return { status: "invalid", message: "รูปแบบอีเมลไม่ถูกต้อง" };
  }
  const [local, domain] = email.split("@");

  const suggestion = suggestDomain(domain);
  if (suggestion) {
    return {
      status: "suggestion",
      suggestion: `${local}@${suggestion}`,
      message: `โดเมน ${domain} อาจสะกดผิด — หมายถึง ${suggestion} หรือไม่`,
    };
  }

  const accepts = await domainAcceptsMail(domain);
  if (accepts === false) {
    return {
      status: "no-mx",
      message: `โดเมน ${domain} ไม่มีเซิร์ฟเวอร์รับอีเมล กรุณาตรวจสอบการสะกด`,
      blocking: enforceMxOnRegister(),
    };
  }

  const institutional = isInstitutionalDomain(domain);
  return {
    status: "ok",
    institutional,
    verified: accepts === true,
    message: institutional ? "อีเมลสถาบัน ใช้งานได้" : "อีเมลใช้งานได้",
  };
}

/**
 * Whether a domain the resolver refused should stop a registration. Always
 * on in production. Off in development because the QA accounts the harness
 * registers live on domains that do not exist (qa-run.ac.th, example.invalid)
 * — there the form's inline warning still shows and still disables its
 * button; only the server's last word is withheld. EMAIL_MX_CHECK=on forces
 * it in development for a manual test of the server-side path, and
 * EMAIL_MX_CHECK=off lifts it from a local production build — the QA harness
 * sweeps one (`next start`, see qa/playwright.config.ts) and registers on those
 * same domains. Not set on Vercel.
 */
export function enforceMxOnRegister(): boolean {
  if (process.env.EMAIL_MX_CHECK === "off") return false;
  return process.env.NODE_ENV === "production" || process.env.EMAIL_MX_CHECK === "on";
}

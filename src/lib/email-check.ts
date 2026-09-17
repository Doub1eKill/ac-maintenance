/**
 * What can be said about an email address before anyone has to open it.
 *
 * Three cheap questions, asked while the person is still on the form so a
 * mistake is caught where it can be fixed: is it shaped like an address, does
 * the domain look like a slip of a well-known one, and does the domain
 * actually receive mail (an MX record, or failing that an A record). None of
 * these prove the mailbox exists — only a message the person answers can do
 * that, which is the verification code's job — but between them they turn
 * away the typos and the made-up domains, which is most of what goes wrong.
 *
 * Kept free of React, Prisma and Node built-ins so the form can import the
 * shape checks into the browser; the DNS side lives in @/lib/email-mx.
 */

export type EmailCheck =
  | { status: "invalid"; message: string }
  | { status: "suggestion"; suggestion: string; message: string }
  // blocking: whether the server will refuse the registration over this, or
  // only warn — see enforceMxOnRegister in @/lib/email-mx.
  | { status: "no-mx"; message: string; blocking: boolean }
  | { status: "taken"; message: string }
  | { status: "ok"; institutional: boolean; verified: boolean; message: string };

export const PUBLIC_EMAIL_DOMAINS = [
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "yahoo.com",
  "icloud.com",
  "live.com",
  "aol.com",
];

/**
 * Domains a slip of the keyboard is measured against. The public ones people
 * type from memory, plus the university's own — the address most of this
 * system's users will be entering.
 */
const KNOWN_DOMAINS = [...PUBLIC_EMAIL_DOMAINS, "pkru.ac.th"];

export function normaliseEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Shaped like an address: one @, something either side, a dot in the domain. */
export function isWellFormed(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function isInstitutionalDomain(emailDomain: string): boolean {
  const domain = emailDomain.toLowerCase();

  // Public webmail domains require manual Org Admin verification
  if (PUBLIC_EMAIL_DOMAINS.includes(domain)) {
    return false;
  }

  // Official educational domains (.ac.th, .edu, .edu.th)
  return domain.endsWith(".ac.th") || domain.endsWith(".edu") || domain.endsWith(".edu.th");
}

// Plain Levenshtein: the domains are short and the list is nine long, so
// there is nothing to optimise.
function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/**
 * The known domain a typed one is probably meant to be, or null. Within two
 * edits and not itself known: "gmial.com" → "gmail.com", "pkru.ac.tth" →
 * "pkru.ac.th". Two edits rather than one because the Thai keyboard layout
 * makes a doubled or dropped letter and a transposition equally likely, and
 * because a wrong guess costs nothing — it is offered, never applied.
 */
export function suggestDomain(domain: string): string | null {
  if (KNOWN_DOMAINS.includes(domain)) return null;
  let best: { domain: string; distance: number } | null = null;
  for (const known of KNOWN_DOMAINS) {
    const distance = editDistance(domain, known);
    if (distance <= 2 && (!best || distance < best.distance)) best = { domain: known, distance };
  }
  return best?.domain ?? null;
}

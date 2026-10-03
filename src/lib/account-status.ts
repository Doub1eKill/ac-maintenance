import { prisma } from "@/lib/prisma";

/**
 * Whether a signed-in account may keep its session, re-read from the database.
 *
 * The session is a JWT that carries the role and status stamped at sign-in, and
 * nothing read them again: an account suspended mid-day kept working until its
 * session ended at midnight. auth.ts's jwt callback asks here on every session
 * read, so a suspension (or a role change) takes effect within CHECK_TTL_MS.
 *
 * Cached per process because that callback runs on every auth() call — every
 * page, layout and server action — and one query each would double the round
 * trips to Aiven. On Vercel each instance keeps its own cache, so the TTL is
 * the bound; forgetAccountStatus() makes the instance that did the suspending
 * see it at once.
 */
const CHECK_TTL_MS = 60 * 1000;

type AccountState = { role: string; status: string } | null;

// On globalThis, not a module-level Map: a production build inlines this
// module into several server bundles (the auth route, pages, shared chunks),
// each with its own module scope. With a plain Map, forgetAccountStatus() run
// from the admin action cleared a different copy than the one the /tech
// layout read, and a suspension waited out the full TTL (QA phase1-20261003).
const globalForStatus = globalThis as unknown as {
  accountStatusCache?: Map<string, { state: AccountState; at: number }>;
};
const cache = (globalForStatus.accountStatusCache ??= new Map());

export async function currentAccountState(userId: string): Promise<AccountState | "unknown"> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < CHECK_TTL_MS) return hit.state;

  let id: bigint;
  try {
    id = BigInt(userId);
  } catch {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({ where: { id }, select: { role: true, status: true } });
    const state: AccountState = user ? { role: user.role, status: user.status } : null;
    cache.set(userId, { state, at: Date.now() });
    return state;
  } catch {
    // The database being unreachable (Aiven waking up, a full pool) is not a
    // reason to sign everyone out. The token's own claims stand until the next
    // read that gets an answer.
    return "unknown";
  }
}

export function forgetAccountStatus(userId: string) {
  cache.delete(userId);
}

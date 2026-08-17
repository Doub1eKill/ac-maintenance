/**
 * Deadlock retry wrapper for write transactions.
 *
 * The transactions in this app are ordered so they can't deadlock against each
 * other (parent rows are locked exclusively before the child inserts whose
 * foreign-key checks would otherwise take a shared lock on the same row and
 * force an S->X upgrade — see the comments in tech/actions.ts and
 * lib/maintenance.ts). That ordering is the actual fix; this is the backstop.
 *
 * It's here because lock ordering only covers the conflicts we can see. InnoDB
 * also takes gap and next-key locks that depend on the plan a statement picks,
 * so a pair that doesn't share a row can still collide as the data grows. When
 * that happens InnoDB rolls one side back whole — nothing is half-applied — so
 * simply running it again is the correct response, not a way of papering over
 * a torn write.
 *
 * Only wrap work that is safe to run twice: everything must live inside the
 * transaction, and anything with an outside effect (file uploads, audit rows,
 * revalidatePath) belongs before or after the call, not within it.
 */

const MAX_ATTEMPTS = 3;

// Short and jittered. A deadlock victim is rolled back the instant InnoDB spots
// the cycle, so the lock it was waiting on is already gone; the pause only
// exists to stop two retrying transactions from lining up and colliding again.
const BASE_BACKOFF_MS = 25;

/**
 * Recognises a deadlock (MySQL/MariaDB error 1213) however it reaches us.
 *
 * Prisma normalises it to P2034, but the MariaDB driver adapter can surface the
 * driver's own error instead depending on where in the statement it fires, so
 * the driver's shape is checked too rather than trusting one of them.
 */
function isDeadlock(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const e = error as { code?: unknown; errno?: unknown; message?: unknown };

  // Prisma: "Transaction failed due to a write conflict or a deadlock".
  if (e.code === "P2034") return true;

  // mariadb driver: numeric errno, or the symbolic name on some paths.
  if (e.errno === 1213 || e.code === "ER_LOCK_DEADLOCK") return true;

  // Last resort — a wrapped error that kept only the server's text.
  return typeof e.message === "string" && e.message.includes("Deadlock found");
}

export async function withDeadlockRetry<T>(
  // Named so a retry that shows up in the logs says which transaction it was.
  label: string,
  run: () => Promise<T>
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (!isDeadlock(error) || attempt >= MAX_ATTEMPTS) throw error;

      console.warn(
        `[db-retry] ${label}: deadlock on attempt ${attempt}/${MAX_ATTEMPTS}, retrying`
      );

      await new Promise((resolve) =>
        setTimeout(resolve, BASE_BACKOFF_MS * attempt + Math.random() * BASE_BACKOFF_MS)
      );
    }
  }
}

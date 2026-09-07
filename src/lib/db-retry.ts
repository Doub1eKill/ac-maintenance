/**
 * Deadlock retry wrapper for write transactions.
 *
 * The transactions in this app are ordered so they can't deadlock against each
 * other (parent rows are locked exclusively before the child inserts whose
 * foreign-key checks would otherwise take a shared lock on the same row and
 * force an S->X upgrade — see the comments in tech/actions.ts and
 * lib/maintenance.ts). That ordering is the actual fix; this is the backstop.
 *
 * It's here because lock ordering only covers the conflicts we can see. Locks a
 * statement takes depend on the plan the planner picks, so a pair that doesn't
 * obviously share a row can still collide as the data grows. When that happens
 * PostgreSQL's deadlock detector aborts one side whole — nothing is
 * half-applied — so simply running it again is the correct response, not a way
 * of papering over a torn write.
 *
 * Only wrap work that is safe to run twice: everything must live inside the
 * transaction, and anything with an outside effect (file uploads, audit rows,
 * revalidatePath) belongs before or after the call, not within it.
 */

const MAX_ATTEMPTS = 3;

// Short and jittered. The victim is rolled back as soon as the cycle is
// detected, so the lock it was waiting on is already gone; the pause only
// exists to stop two retrying transactions from lining up and colliding again.
const BASE_BACKOFF_MS = 25;

/**
 * Recognises a deadlock however it reaches us.
 *
 * Prisma normalises it to P2034, but a driver adapter can surface the driver's
 * own error instead depending on where in the statement it fires, so the
 * driver's shape is checked too rather than trusting one of them.
 */
function isDeadlock(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const e = error as { code?: unknown; errno?: unknown; message?: unknown };

  // Prisma: "Transaction failed due to a write conflict or a deadlock".
  if (e.code === "P2034") return true;

  // pg driver: the SQLSTATE lands on .code directly. 40001
  // (serialization_failure) is here too because the same retry resolves it,
  // even though READ COMMITTED — what this app runs at — rarely raises it.
  if (e.code === "40P01" || e.code === "40001") return true;

  // mariadb driver: numeric errno, or the symbolic name on some paths. Dead
  // once master is on PostgreSQL too; harmless until then.
  if (e.errno === 1213 || e.code === "ER_LOCK_DEADLOCK") return true;

  // Last resort — a wrapped error that kept only the server's text.
  // PostgreSQL says "deadlock detected"; MySQL said "Deadlock found".
  if (typeof e.message !== "string") return false;
  return e.message.includes("deadlock detected") || e.message.includes("Deadlock found");
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

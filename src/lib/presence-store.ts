import { prisma } from "@/lib/prisma";
import { isOnline, onlineCutoff, TOUCH_THROTTLE_MS } from "@/lib/presence";

// The writes and the one read behind the Online/Offline badge. The rule itself
// is in presence.ts, which stays free of Prisma so the client can share its
// constants.

function toId(userId: string): bigint | null {
  try {
    return BigInt(userId);
  } catch {
    return null;
  }
}

/**
 * Marks someone as seen now.
 *
 * `force` is for sign-in, which must always land. The heartbeat is throttled
 * in the same statement that writes, with no read first: it skips the row
 * unless last_seen_at is stale, or a sign-out is newer than it (a second
 * device still open after the first signed out must bring the person back
 * at once, not a minute later).
 *
 * Presence is decoration. A failure here is logged and swallowed so it can
 * never fail a sign-in or a page.
 */
export async function touchPresence(userId: string, { force = false } = {}) {
  const id = toId(userId);
  if (id === null) return;
  const now = new Date();
  try {
    await prisma.user.updateMany({
      where: force
        ? { id }
        : {
            id,
            OR: [
              { lastSeenAt: null },
              { lastSeenAt: { lt: new Date(now.getTime() - TOUCH_THROTTLE_MS) } },
              { signedOutAt: { gte: prisma.user.fields.lastSeenAt } },
            ],
          },
      data: { lastSeenAt: now },
    });
  } catch (error) {
    console.error("Failed to record presence:", error);
  }
}

export async function markSignedOut(userId: string) {
  const id = toId(userId);
  if (id === null) return;
  try {
    await prisma.user.update({ where: { id }, data: { signedOutAt: new Date() } });
  } catch (error) {
    console.error("Failed to record sign-out:", error);
  }
}

/**
 * Ids of everyone Online now. One query; users holds a few dozen rows, so the
 * last_seen_at filter needs no index of its own.
 */
export async function onlineUserIds(now: number = Date.now()): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: { status: "active", lastSeenAt: { gte: onlineCutoff(now) } },
    select: { id: true, status: true, lastSeenAt: true, signedOutAt: true },
  });
  return rows.filter((row) => isOnline(row, now)).map((row) => row.id.toString());
}

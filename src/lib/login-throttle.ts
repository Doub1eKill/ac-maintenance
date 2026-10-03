import { prisma } from "@/lib/prisma";

/**
 * Throttling for password guesses at the sign-in form.
 *
 * Nothing limited them: any address could be tried as often as anyone liked,
 * and bcrypt's ~100 ms per attempt was the only brake. Refused attempts are now
 * counted in the database (login_failures) — not in memory, which on Vercel is
 * per instance and resets on every cold start.
 *
 * Two limits over the same window: per address, so one account cannot be
 * hammered; and per client IP, looser, so one source cannot spray guesses
 * across many addresses. A university network can put many people behind one
 * IP, which is why that limit is the higher of the two.
 *
 * Every function here fails open. A throttle that cannot reach its table must
 * not become a way to stop everyone signing in.
 */
const WINDOW_MS = 15 * 60 * 1000;
const PER_EMAIL_LIMIT = 10;
const PER_IP_LIMIT = 50;
const KEEP_MS = 24 * 60 * 60 * 1000;

/** The client's address as Vercel reports it; null locally when there is none. */
export function clientIp(request: Request | undefined): string | null {
  const forwarded = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request?.headers.get("x-real-ip")?.trim() || null;
  return ip ? ip.slice(0, 64) : null;
}

export async function isThrottled(email: string, ip: string | null): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  try {
    const [byEmail, byIp] = await Promise.all([
      prisma.loginFailure.count({ where: { email, createdAt: { gte: since } } }),
      ip ? prisma.loginFailure.count({ where: { ip, createdAt: { gte: since } } }) : Promise.resolve(0),
    ]);
    return byEmail >= PER_EMAIL_LIMIT || byIp >= PER_IP_LIMIT;
  } catch (error) {
    console.error("[login-throttle] check failed, allowing the attempt:", error);
    return false;
  }
}

export async function recordFailure(email: string, ip: string | null): Promise<void> {
  try {
    await prisma.loginFailure.create({ data: { email, ip } });
    // Pruned here rather than by a job: this is the only place rows arrive.
    await prisma.loginFailure.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - KEEP_MS) } } });
  } catch (error) {
    console.error("[login-throttle] could not record a failure:", error);
  }
}

/** A correct password clears its address's count, so a few typos never add up across days. */
export async function clearFailures(email: string): Promise<void> {
  try {
    await prisma.loginFailure.deleteMany({ where: { email } });
  } catch (error) {
    console.error("[login-throttle] could not clear failures:", error);
  }
}

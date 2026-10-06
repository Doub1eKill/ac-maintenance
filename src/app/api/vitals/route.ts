import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientIp } from "@/lib/login-throttle";
import {
  MAX_VITALS_BODY,
  WindowCounter,
  deviceFromUserAgent,
  isAutomatedUserAgent,
  parseVitalSample,
} from "@/lib/web-vitals";

// Field LCP samples from WebVitalsReporter, for the TTACON 2026 paper.
// Temporary; see src/lib/web-vitals.ts.
//
// Always answers 204, so a sender cannot tell what was kept. A sample is
// stored only when every check passes, cheapest first:
// 1. this is the Vercel production deployment — the database is shared, so
//    dev servers and the local QA sweep must never write here;
// 2. a body of at most 2 KB that parses as one LCP sample for a real page;
// 3. no self-announcing automation in the User-Agent;
// 4. the client address is under its cap (counted in memory, never stored).
// The metric id is unique in the table, so a beacon and its fetch fallback
// cannot both land.
const globalForVitals = globalThis as unknown as { vitalsCounter?: WindowCounter };
const counter = (globalForVitals.vitalsCounter ??= new WindowCounter());
const done = () => new NextResponse(null, { status: 204 });

export async function POST(request: Request) {
  if (process.env.VERCEL_ENV !== "production") return done();

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_VITALS_BODY) return done();

  const ua = request.headers.get("user-agent");
  if (isAutomatedUserAgent(ua)) return done();
  if (!counter.allow(clientIp(request) ?? "unknown")) return done();

  let body: string;
  try {
    body = await request.text();
  } catch {
    return done();
  }
  const sample = parseVitalSample(body);
  if (!sample) return done();

  try {
    const session = await auth();
    const role = session?.user?.role ?? "guest";
    await prisma.webVitalSample.createMany({
      data: [{ ...sample, name: "LCP", device: deviceFromUserAgent(ua), role }],
      skipDuplicates: true,
    });
  } catch (error) {
    // Measurement is never worth an error page or a retry storm.
    console.error("[vitals] could not store a sample:", error);
  }
  return done();
}

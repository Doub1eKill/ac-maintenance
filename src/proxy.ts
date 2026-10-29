// Named `proxy.ts`, not `middleware.ts` — Next.js 16 deprecated and renamed
// the file convention (function must be named/exported the same way).
//
// Two jobs, in this order:
//
// 1. /admin and /tech: "can this request enter at all", via the signed JWT
//    (see authConfig.callbacks.authorized in auth.config.ts). It intentionally
//    does NOT re-check the database — per Next.js's own guidance, Proxy runs
//    separately from the rest of the app and Server Functions can bypass it
//    entirely, so every Server Action/Route Handler that mutates data
//    re-validates auth and role on its own regardless of this file's outcome.
//
//    NextAuth's auth() is called directly, not as auth(handler): with a
//    handler, an authorized() that returns false — which ours does — runs the
//    handler instead of redirecting (next-auth lib/index.js handleAuth), and
//    /admin would open to anyone.
//
// 2. Every page: a fresh nonce and the Content-Security-Policy built around it
//    (src/lib/csp.ts). Next.js reads the nonce from the request's CSP header
//    while rendering and puts it on its own scripts; the root layout passes it
//    to next-themes.
import NextAuth from "next-auth";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { contentSecurityPolicy, newNonce } from "@/lib/csp";

const { auth } = NextAuth(authConfig);
const gate = auth as unknown as (request: NextRequest, event: NextFetchEvent) => Promise<Response>;

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  const nonce = newNonce();
  const csp = contentSecurityPolicy(nonce);
  const { pathname } = request.nextUrl;

  // Session cookies NextAuth refreshed on the way through; carried onto the
  // response below so the refresh is not lost.
  let sessionCookies: string[] = [];
  if (pathname.startsWith("/admin") || pathname.startsWith("/tech")) {
    const verdict = await gate(request, event);
    if (verdict.headers.has("location")) {
      verdict.headers.set("Content-Security-Policy", csp);
      return verdict;
    }
    sessionCookies = verdict.headers.getSetCookie();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  for (const cookie of sessionCookies) response.headers.append("set-cookie", cookie);
  return response;
}

export const config = {
  matcher: [
    // Always, prefetches included — this was the whole matcher before the CSP
    // moved here, and the gate must not be skipped for a prefetch.
    "/admin/:path*",
    "/tech/:path*",
    // Every other page, for the nonce. API routes, Next's own assets, uploads
    // and files with an extension need no CSP; link prefetches are skipped as
    // the Next.js CSP guide recommends (the page they prefetch gets its
    // policy when it is actually loaded).
    {
      source: "/((?!api|_next/static|_next/image|uploads/|favicon.ico|.*\\.[a-z0-9]+$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};

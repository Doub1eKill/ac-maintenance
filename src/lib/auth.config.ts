import type { NextAuthConfig } from "next-auth";
import { nextMidnightAfter, isPastExpiry } from "@/lib/session-expiry";
import type { UserRole, UserStatus } from "@/generated/prisma/enums";

/**
 * The lightweight half of the NextAuth config — no Providers, no Prisma.
 * Split out so `proxy.ts` (which only needs to read the already-issued JWT
 * to decide "is this request logged in / does it have the right role")
 * can import this without pulling in the Credentials provider's Prisma
 * dependency. `authorized()` here is what NextAuth's proxy wrapper calls
 * per request — it must stay fast and side-effect free.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    // Required for Credentials provider: there is no database session to
    // look up on every request, so the session lives entirely in the
    // signed JWT.
    strategy: "jwt",
    // A ceiling, not the real rule. The session actually ends at the next
    // midnight, which the jwt callback below enforces exactly; this only stops
    // the signed token outliving that by more than a day if it is ever read
    // outside those callbacks. Auth.js re-signs the token on every session
    // read, so a fixed maxAge alone would slide forward indefinitely and never
    // expire anyone.
    maxAge: 60 * 60 * 24,
  },
  callbacks: {
    // Lives here (not only in auth.ts) because proxy.ts builds its own
    // NextAuth(authConfig) instance to read the session cheaply. If these
    // two callbacks were missing from that instance, proxy would only see
    // NextAuth's default session shape (id/name/email/image) — role and
    // status would be undefined, and every role check below would
    // silently fail closed, redirecting even a correctly logged-in user.
    // `user` is only defined on initial sign-in — this stamps the
    // Prisma-sourced values onto the token once, so no DB call is needed
    // on every subsequent request.
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.status = user.status;
        // Stamped once, at sign-in, and never extended afterwards. Auth.js
        // re-signs this token on every session read, so anything recomputed
        // here would push the deadline forward on each request and never
        // arrive.
        token.expiresAt = nextMidnightAfter();
      }

      // Returning null makes Auth.js clear the session cookie
      // (lib/actions/session.js: `else { response.cookies.push(...clean()) }`),
      // which is what ends the session everywhere rather than only hiding it
      // from this one response.
      if (isPastExpiry(token.expiresAt)) {
        return null;
      }

      return token;
    },
    session({ session, token }) {
      // The client is told the real deadline rather than the rolling maxAge, so
      // anything reading session.expires sees midnight.
      if (typeof token.expiresAt === "number") {
        session.expires = new Date(token.expiresAt).toISOString() as typeof session.expires;
      }
      session.user.id = token.sub as string;
      // Typed here rather than through the JWT augmentation in
      // types/next-auth.d.ts alone: since nodemailer 10, npm nests @auth/core
      // under next-auth (its optional nodemailer peer is ^7 || ^8), so
      // "@auth/core/jwt" no longer resolves from the app and that augmentation
      // stops applying without a word. The jwt callbacks only ever store these
      // two enums.
      session.user.role = token.role as UserRole;
      session.user.status = token.status as UserStatus;
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      const isAdminRoute = pathname.startsWith("/admin");
      const isTechRoute = pathname.startsWith("/tech");

      if (!isLoggedIn) {
        return isAdminRoute || isTechRoute ? false : true;
      }

      // Suspended/pending accounts never had a chance to reach this
      // check normally (authorize() rejects them at sign-in), but a
      // session created before a later suspension must be caught here too
      // — this is the "defense in depth" layer equivalent to the old
      // Laravel EnsureUserIsActive middleware.
      if (auth.user.status !== "active") {
        return false;
      }

      // /admin/* = org_admin only, /tech/* = technician only.
      if (isAdminRoute) {
        return auth.user.role === "org_admin";
      }
      if (isTechRoute) {
        return auth.user.role === "technician";
      }

      return true;
    },
  },
  providers: [], // populated in auth.ts — kept empty here so this file has no Prisma/bcrypt dependency
} satisfies NextAuthConfig;

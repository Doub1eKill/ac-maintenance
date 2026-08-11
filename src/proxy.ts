// Named `proxy.ts`, not `middleware.ts` — Next.js 16 deprecated and renamed
// the file convention (function must be named/exported the same way).
// This only decides "can this request enter /admin or /tech at all" via the
// signed JWT (see authConfig.callbacks.authorized in auth.config.ts).
// It intentionally does NOT re-check the database — per Next.js's own
// guidance, Proxy runs separately from the rest of the app and Server
// Functions can bypass it entirely, so every Server Action/Route Handler
// that mutates data re-validates auth and role on its own regardless of
// this file's outcome.
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/admin/:path*", "/tech/:path*"],
};

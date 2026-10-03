import type { DefaultSession } from "next-auth";
import type { UserRole, UserStatus } from "@/generated/prisma/enums";

// Extends NextAuth's built-in types so `session.user.role` etc. are typed
// everywhere in the app instead of needing `as any` at every call site.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      status: UserStatus;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    status: UserStatus;
  }
}

// The token's interface lives in @auth/core/jwt; next-auth/jwt only
// re-exports it with `export *`, and an augmentation aimed at a re-export never
// reaches the original declaration. Augmenting "next-auth/jwt" here compiled
// without complaint and did nothing: token.role stayed `unknown` in the
// session callback, which is where the `as any` casts came from.
//
// Since nodemailer 10 this augmentation is inert too: npm nests @auth/core
// under next-auth (its optional nodemailer peer is ^7 || ^8), so
// "@auth/core/jwt" no longer resolves from here and TypeScript treats this as
// a new, unrelated module. auth.config.ts types role/status explicitly; kept so
// it applies again if @auth/core is hoisted back.
declare module "@auth/core/jwt" {
  interface JWT {
    role: UserRole;
    status: UserStatus;
    // Stamped once at sign-in by the jwt callback; see auth.config.ts.
    expiresAt?: number;
  }
}

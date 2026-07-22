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
      universityId: number | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    status: UserStatus;
    universityId: number | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    status: UserStatus;
    universityId: number | null;
  }
}

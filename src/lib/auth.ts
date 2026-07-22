import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Distinct, non-generic codes for the account states a legitimate holder of
// this email can usefully act on (this is a closed, invite-only B2B system —
// unlike a public consumer app, these don't leak "does this email exist"
// information in any way that matters here). Wrong password / unknown email
// still collapse into one generic error below, per standard anti-enumeration
// practice.
class AccountPendingApproval extends CredentialsSignin {
  code = "account-pending";
}
class AccountSuspended extends CredentialsSignin {
  code = "account-suspended";
}
class PasswordResetRequired extends CredentialsSignin {
  code = "password-reset-required";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        // Same generic outcome for "no such user" and "wrong password"
        // (checked together below) — never confirm which one it was.
        if (!user) return null;

        // NULL password is this app's "must reset password" flag (see the
        // schema comment) — surfaced distinctly because, unlike "wrong
        // password", the user genuinely cannot succeed here no matter what
        // they type, so a generic "invalid credentials" would just be
        // confusing dead-end UX.
        if (user.password === null) {
          throw new PasswordResetRequired();
        }
        if (user.status === "suspended") {
          throw new AccountSuspended();
        }
        if (user.status === "pending") {
          throw new AccountPendingApproval();
        }

        const passwordMatches = await bcrypt.compare(parsed.data.password, user.password);
        if (!passwordMatches) return null;

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          universityId: user.universityId ? Number(user.universityId) : null,
        };
      },
    }),
  ],
  // jwt/session/authorized callbacks all come from authConfig unchanged —
  // they live there specifically so proxy.ts's separate NextAuth(authConfig)
  // instance sees the exact same role/status/universityId logic (see the
  // comment on those callbacks in auth.config.ts for why that matters).
});

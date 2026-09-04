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
      // Nothing in here logs. It used to trace every step, and the first line
      // printed the whole credentials object — including the password the user
      // had just typed, in clear text, on every single sign-in. On a deployed
      // server that fills the log with working credentials for every account.
      //
      // The rest of the trace was not harmless either: it recorded which email
      // addresses exist, which accounts are suspended and whether a password
      // matched, which is a ready-made account-enumeration trail. Sign-ins that
      // need a record have system_audit_logs; a debug trace of the login path
      // does not belong in the server console.
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) {
          return null;
        }

        const email = parsed.data.email.toLowerCase().trim();

        try {
          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user) {
            return null;
          }

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

          if (!passwordMatches) {
            return null;
          }

          return {
            id: String(user.id),
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
          };
        } catch (error) {
          if (error instanceof CredentialsSignin) {
            throw error;
          }
          // Kept: an unexpected failure here needs to be visible. The error
          // object carries no credentials — the ones the caller sent never
          // reach it.
          console.error("Sign-in failed unexpectedly:", error);
          return null;
        }
      },
    }),
  ],
});

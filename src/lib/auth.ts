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
      async authorize(rawCredentials) {
        console.log("[AUTH LOG] rawCredentials:", rawCredentials);
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) {
          console.log("[AUTH LOG] Zod validation failed:", parsed.error);
          return null;
        }

        const email = parsed.data.email.toLowerCase().trim();
        console.log("[AUTH LOG] Looking for user with email:", email);

        try {
          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user) {
            console.log("[AUTH LOG] User not found for email:", email);
            return null;
          }

          console.log("[AUTH LOG] User found:", {
            id: String(user.id),
            email: user.email,
            role: user.role,
            status: user.status,
            hasPassword: !!user.password,
          });

          if (user.password === null) {
            console.log("[AUTH LOG] Password is null");
            throw new PasswordResetRequired();
          }
          if (user.status === "suspended") {
            console.log("[AUTH LOG] Account is suspended");
            throw new AccountSuspended();
          }
          if (user.status === "pending") {
            console.log("[AUTH LOG] Account is pending approval");
            throw new AccountPendingApproval();
          }

          const passwordMatches = await bcrypt.compare(parsed.data.password, user.password);
          console.log("[AUTH LOG] Password matches:", passwordMatches);

          if (!passwordMatches) {
            console.log("[AUTH LOG] Password comparison failed!");
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
          console.error("[AUTH LOG] Unexpected error in authorize:", error);
          return null;
        }
      },
    }),
  ],
});

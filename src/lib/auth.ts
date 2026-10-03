import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/prisma";
import { currentAccountState } from "@/lib/account-status";
import { markSignedOut, touchPresence } from "@/lib/presence-store";
import { clientIp, clearFailures, isThrottled, recordFailure } from "@/lib/login-throttle";
import type { SignInCode } from "@/lib/sign-in-codes";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// A real bcrypt hash of nothing in particular, made once at startup and
// compared against when the address is unknown, so that a miss costs the
// same ~100ms as a wrong password and the timing does not say which it was.
const DUMMY_HASH = bcrypt.hashSync("no-such-account", 10);

// Each code is typed against the shared list, so adding a refusal here
// without a message in the login form is a compile error, not a silent
// fallback to the wrong-password text.
class AccountPendingApproval extends CredentialsSignin {
  code: SignInCode = "account-pending";
}
class AccountSuspended extends CredentialsSignin {
  code: SignInCode = "account-suspended";
}
class PasswordResetRequired extends CredentialsSignin {
  code: SignInCode = "password-reset-required";
}
class TooManyAttempts extends CredentialsSignin {
  code: SignInCode = "too-many-attempts";
}

const passwordProvider = Credentials({
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
  async authorize(rawCredentials, request) {
    const parsed = credentialsSchema.safeParse(rawCredentials);
    if (!parsed.success) {
      return null;
    }

    const email = parsed.data.email.toLowerCase().trim();
    const ip = clientIp(request);

    try {
      // Before the password is looked at, so a throttled guess learns nothing
      // about whether it was right (lib/login-throttle.ts).
      if (await isThrottled(email, ip)) {
        throw new TooManyAttempts();
      }

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        await bcrypt.compare(parsed.data.password, DUMMY_HASH);
        await recordFailure(email, ip);
        return null;
      }

      // No password on the row means the account has never set one (see the
      // schema comment on User.password): the only useful answer is "set
      // one first", and there is nothing to compare against anyway.
      if (user.password === null) {
        throw new PasswordResetRequired();
      }

      // The password is checked before the account's status, not after. The
      // status used to come first, so anyone could type a wrong password
      // against any address and learn from the reply whether that address
      // was pending, suspended, or in use — the wrong-password message
      // appeared only for accounts in good standing. Now the specific
      // messages are reserved for someone who has proved they hold the
      // password; everyone else gets the generic one.
      const passwordMatches = await bcrypt.compare(parsed.data.password, user.password);

      if (!passwordMatches) {
        await recordFailure(email, ip);
        return null;
      }

      if (user.status === "suspended") {
        throw new AccountSuspended();
      }
      if (user.status === "pending") {
        throw new AccountPendingApproval();
      }

      await clearFailures(email);
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
});

/**
 * The two "ทดสอบเข้าสู่ระบบด่วน" buttons on the login page.
 *
 * The seeded accounts have no password — that is the project's rule, and the
 * reason those buttons never worked: they filled in an address that does not
 * exist and a password that could not have matched. Rather than parking a
 * standing password on two real accounts, this provider signs in as the seeded
 * account for a role, with no password at all.
 *
 * It is registered only outside production. The check is on the providers array
 * rather than inside authorize(), so there is no branch within the sign-in path
 * that could be reached by mistake: in production NextAuth is simply never told
 * this provider exists, and a request to /api/auth/callback/demo-role finds no
 * provider to run. (The function itself may still sit in the bundle — dead code
 * elimination is the bundler's business, not something to rely on — but nothing
 * routes to it.)
 *
 * It takes a role, never an address: the most it can do is sign in as whichever
 * account seeded that role, which is exactly what the buttons offer. Suspended
 * and pending accounts are excluded, so it cannot be used to step past the
 * approval flow either.
 */
const demoRoleProvider = Credentials({
  id: "demo-role",
  name: "Demo role sign-in (development only)",
  credentials: {
    role: { label: "Role", type: "text" },
  },
  async authorize(rawCredentials) {
    const role = rawCredentials?.role;
    if (role !== "org_admin" && role !== "technician") {
      return null;
    }

    const user = await prisma.user.findFirst({
      where: { role, status: "active" },
      orderBy: { id: "asc" },
    });
    if (!user) {
      return null;
    }

    return {
      id: String(user.id),
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
    };
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // authConfig's jwt stamps the claims at sign-in and enforces midnight;
    // this instance (pages, layouts, server actions — not proxy.ts, which has
    // no database) also re-reads the account, so a suspension or a role change
    // ends or reshapes the session within a minute instead of at midnight.
    // Returning null clears the cookie, and the /admin and /tech layouts then
    // redirect to /login.
    async jwt(params) {
      const token = authConfig.callbacks.jwt(params);
      if (!token || params.user || !token.sub) return token;

      const state = await currentAccountState(token.sub);
      if (state === "unknown") return token;
      if (!state || state.status !== "active") return null;
      token.role = state.role as typeof token.role;
      token.status = state.status as typeof token.status;
      return token;
    },
  },
  // Presence for the team page's Online/Offline badge (lib/presence.ts). Only
  // on this instance: sign-in and sign-out go through /api/auth, never proxy.ts.
  // A session that simply reaches midnight fires neither; the rule in
  // presence.ts drops it without being told.
  events: {
    async signIn({ user }) {
      if (user.id) await touchPresence(user.id, { force: true });
    },
    async signOut(message) {
      if ("token" in message && message.token?.sub) await markSignedOut(message.token.sub);
    },
  },
  providers:
    process.env.NODE_ENV === "production"
      ? [passwordProvider]
      : [passwordProvider, demoRoleProvider],
});

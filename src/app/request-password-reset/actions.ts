"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createResetToken } from "@/lib/reset-token";

const schema = z.object({ email: z.string().email() });

export type RequestResetState = { message: string } | null;

export async function requestPasswordReset(
  _prevState: RequestResetState,
  formData: FormData
): Promise<RequestResetState> {
  const parsed = schema.safeParse({ email: formData.get("email") });

  // Same generic response whether the email exists or not, valid or not —
  // this is the one message shown for every outcome so the response itself
  // never confirms which accounts exist (anti-enumeration).
  const genericMessage =
    "If that email is registered, a password reset link has been generated (dev mode: check the server console).";

  if (!parsed.success) {
    return { message: genericMessage };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  if (user) {
    const token = createResetToken(Number(user.id));
    const resetUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/reset-password?token=${token}`;

    // Dev-mode stand-in for a real email send (no SMTP configured for this
    // migration, per the user's own confirmed decision) — logged, not
    // sent, so this must never be wired up to a real mailer without also
    // reviewing this log line, which would leak the token to server logs.
    console.log(`[password reset] ${user.email} -> ${resetUrl}`);
  }

  return { message: genericMessage };
}

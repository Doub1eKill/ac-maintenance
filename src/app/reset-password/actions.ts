"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyResetToken } from "@/lib/reset-token";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export type ResetPasswordState = { error?: string; success?: boolean } | null;

export async function resetPassword(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const parsed = schema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const verified = verifyResetToken(parsed.data.token);
  if (!verified) {
    return { error: "This reset link is invalid or has expired. Please request a new one." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  // No user existence check needed beyond this — verifyResetToken already
  // proved the token was signed for this specific userId with our own
  // secret, so a matching row is guaranteed unless the account was somehow
  // deleted since the link was generated (this app never hard-deletes
  // users, so that's not a real path).
  await prisma.user.update({
    where: { id: verified.userId },
    data: { password: passwordHash },
  });

  return { success: true };
}

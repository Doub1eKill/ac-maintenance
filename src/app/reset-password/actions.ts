"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resetTokenUserId, verifyResetToken } from "@/lib/reset-token";

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

  const invalid = { error: "This reset link is invalid or has expired. Please request a new one." };

  // The signature covers the account's current password hash (see
  // reset-token.ts), so it is read first: a link that has already been used
  // was signed over a hash that is no longer there and fails below.
  const claimedUserId = resetTokenUserId(parsed.data.token);
  if (!claimedUserId) return invalid;
  const account = await prisma.user.findUnique({
    where: { id: claimedUserId },
    select: { password: true },
  });
  if (!account) return invalid;

  const verified = verifyResetToken(parsed.data.token, account.password);
  if (!verified) return invalid;

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  // Guarded on the hash the link was checked against, so two submissions of
  // the same link racing each other cannot both land: the second finds the
  // password already changed and matches nothing.
  const { count } = await prisma.user.updateMany({
    where: { id: verified.userId, password: account.password },
    data: { password: passwordHash },
  });
  if (count === 0) return invalid;

  return { success: true };
}

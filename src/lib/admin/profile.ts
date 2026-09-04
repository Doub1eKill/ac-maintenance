import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { saveUpload, deleteUpload } from "@/lib/upload";
import { verifyOrgAdmin } from "@/lib/auth-guards";

// Editing your own profile — name, phone and avatar. Shared by both dashboards:
// the guard here is an active session, not org_admin, because a technician
// edits their profile through the same action.
const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "กรุณากรอกชื่อ-นามสกุล")
    .max(255, "ชื่อ-นามสกุลยาวเกินไป"),
  // Left deliberately permissive — Thai numbers get written with and without
  // spaces, dashes and a +66 prefix, and rejecting a real number a user typed
  // their own way is worse here than storing it slightly unevenly.
  phone: z
    .string()
    .trim()
    .max(20, "เบอร์โทรศัพท์ยาวเกินไป")
    .refine(
      (v) => v === "" || /^[\d+\-\s()]{9,20}$/.test(v),
      "รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง"
    )
    .optional(),
});

// A profile picture is displayed at avatar size and downscaled to 1600px on
// the way in, so anything past this is a camera original that would be thrown
// away — rejected up front with a message rather than silently accepted.
const MAX_AVATAR_BYTES = 8 * 1024 * 1024;

/**
 * Updates the signed-in user's own name, primary phone number and picture.
 *
 * Guarded on the session alone rather than through verifyOrgAdmin(): it only
 * ever writes to the caller's own row, so there's nothing a technician could
 * reach here that they shouldn't, which is what lets the technician profile
 * page reuse it instead of keeping a near-identical copy under tech/.
 *
 * `phone` distinguishes three cases: omitted leaves the number untouched, ""
 * clears it, and a value replaces it. The previous number is deleted, not
 * kept as a secondary — see the transaction below.
 *
 * `avatarFile` has only two cases, not three: a file replaces the picture,
 * and anything else leaves it alone. There is deliberately no "clear it"
 * input, because the form has no button that means it — the picture is
 * changed by choosing a different one.
 *
 * Both extra parameters are optional and positional, so existing callers
 * passing just `(name)` or `(name, phone)` keep working untouched.
 */
export async function updateProfileAction(
  name: string,
  phone?: string,
  avatarFile?: File | null
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "active") {
    throw new Error("Unauthorized: sign-in required");
  }

  const parsed = updateProfileSchema.safeParse({ name, phone });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" };
  }

  const userId = BigInt(session.user.id);
  const { name: newName, phone: newPhone } = parsed.data;

  // Checked before anything is written, so a rejected file costs nothing.
  const hasNewAvatar = !!avatarFile && avatarFile.size > 0;
  if (hasNewAvatar) {
    if (!avatarFile!.type?.startsWith("image/")) {
      return { error: "รูปโปรไฟล์ต้องเป็นไฟล์รูปภาพเท่านั้น" };
    }
    if (avatarFile!.size > MAX_AVATAR_BYTES) {
      return { error: "รูปโปรไฟล์ต้องมีขนาดไม่เกิน 8 MB" };
    }
  }

  // Written to disk before the transaction opens, never inside it: this is a
  // multi-megabyte write, and a transaction held open across it would keep its
  // lock on the user row for the whole duration.
  const newAvatarUrl = hasNewAvatar ? await saveUpload(avatarFile!) : null;
  if (hasNewAvatar && !newAvatarUrl) {
    return { error: "ไม่สามารถบันทึกรูปโปรไฟล์ได้ กรุณาลองใหม่อีกครั้ง" };
  }

  // The picture being replaced, captured inside the transaction so it is the
  // value this update actually overwrote — read outside, a second save landing
  // in between would have us delete the wrong file.
  let replacedAvatarUrl: string | null = null;

  try {
    await prisma.$transaction(async (tx) => {
      if (newAvatarUrl) {
        const before = await tx.user.findUnique({
          where: { id: userId },
          select: { avatarUrl: true },
        });
        replacedAvatarUrl = before?.avatarUrl ?? null;
      }

      await tx.user.update({
        where: { id: userId },
        // Omitting the key entirely rather than passing null is what makes
        // "no file sent" mean "leave the existing picture alone".
        data: newAvatarUrl
          ? { name: newName, avatarUrl: newAvatarUrl }
          : { name: newName },
      });

      if (newPhone === undefined) return;

      // Replace the old number rather than demoting it to a secondary. The
      // profile form exposes a single phone field, so a number the user typed
      // over should not survive as a row they can neither see nor delete.
      // Only the primary is removed — any secondary numbers on the account
      // were recorded elsewhere and aren't this form's to discard.
      await tx.userPhone.deleteMany({ where: { userId, isPrimary: true } });

      if (newPhone === "") return;

      // The new number may already exist as one of those secondaries, and
      // [userId, phoneNumber] is unique — promote that row instead of
      // inserting a duplicate that would violate the constraint.
      const existing = await tx.userPhone.findUnique({
        where: { userId_phoneNumber: { userId, phoneNumber: newPhone } },
        select: { id: true },
      });

      if (existing) {
        await tx.userPhone.update({
          where: { id: existing.id },
          data: { isPrimary: true },
        });
      } else {
        await tx.userPhone.create({
          data: { userId, phoneNumber: newPhone, isPrimary: true },
        });
      }
    });

    // Only now that the row is committed. Had the transaction rolled back, the
    // old picture would still be the current one and must survive.
    if (newAvatarUrl && replacedAvatarUrl && replacedAvatarUrl !== newAvatarUrl) {
      await deleteUpload(replacedAvatarUrl);
    }

    revalidatePath(session.user.role === "technician" ? "/tech" : "/admin", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to update own profile:", error);
    // The row was never updated, so the file just written is referenced by
    // nothing. Leaving it would strand a few megabytes per failed attempt.
    if (newAvatarUrl) await deleteUpload(newAvatarUrl);
    return { error: "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง" };
  }
}

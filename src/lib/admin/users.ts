import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { verifyOrgAdmin } from "@/lib/auth-guards";

// What an org admin can do to somebody else's account: approve or suspend it,
// and clear its password when they are locked out. Split out of the former
// settings.ts, which held these alongside profile editing, organisation
// settings and the audit log in one 448-line file.
export async function updateUserStatusByOrgAdminAction(
  targetUserId: string,
  newStatus: "active" | "suspended"
) {
  const session = await verifyOrgAdmin();

  if (newStatus === "suspended" && targetUserId === session.user.id) {
    return { error: "ระงับสิทธิ์บัญชีตัวเองไม่ได้" };
  }

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: BigInt(targetUserId) },
      select: { id: true },
    });

    if (!targetUser) {
      return { error: "ไม่พบผู้ใช้" };
    }

    await prisma.user.update({
      where: { id: BigInt(targetUserId) },
      data: { status: newStatus },
    });

    console.log(
      `[AUDIT TRAIL] User status updated by OrgAdmin (AdminID: ${session.user.id}): TargetUser ${targetUserId} -> Status: ${newStatus} at ${new Date().toISOString()}`
    );

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to update user status by org admin:", error);
    return { error: "ไม่สามารถอัปเดตสถานะผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง" };
  }
}


/**
 * Clears a user's password so they must set a new one before signing in —
 * for the case where someone is locked out and can't use the emailed reset
 * link (no access to the inbox, wrong address on file).
 *
 * No password is generated and shown to the admin: NULL already means "must
 * reset" in this schema, and authorize() turns it into the
 * PasswordResetRequired flow on the user's next attempt. That keeps the admin
 * from having to read a working credential out loud to somebody.
 */
export async function adminResetUserPasswordAction(userId: string) {
  const session = await verifyOrgAdmin();

  let targetId: bigint;
  try {
    targetId = BigInt(userId);
  } catch {
    return { error: "ไม่พบผู้ใช้" };
  }

  // Doing this to yourself locks you out with no way back in from this
  // screen; the profile page's own reset is the supported route.
  if (targetId.toString() === session.user.id) {
    return { error: "ไม่สามารถรีเซ็ตรหัสผ่านของตัวเองได้จากหน้านี้ กรุณาใช้เมนูจัดการโปรไฟล์" };
  }

  try {
    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, email: true, password: true },
    });

    if (!target) return { error: "ไม่พบผู้ใช้" };
    if (target.password === null) {
      return { error: "ผู้ใช้รายนี้ต้องตั้งรหัสผ่านใหม่อยู่แล้ว" };
    }

    await prisma.user.update({
      where: { id: targetId },
      data: { password: null },
    });

    await logAudit({
      userId: BigInt(session.user.id!),
      action: "RESET_USER_PASSWORD",
      entityType: "user",
      entityId: targetId,
      newValues: { passwordCleared: true },
      ipAddress: "server_action",
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to reset user password:", error);
    return { error: "ไม่สามารถรีเซ็ตรหัสผ่านได้ กรุณาลองใหม่อีกครั้ง" };
  }
}

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getOrganisationInfo } from "@/lib/organisation";
import { saveUpload, deleteUpload } from "@/lib/upload";
import { verifyOrgAdmin } from "@/lib/auth-guards";

export async function updateUserStatusByOrgAdminAction(
  targetUserId: string,
  newStatus: "active" | "suspended"
) {
  const session = await verifyOrgAdmin();

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

    revalidatePath(session.user.role === "technician" ? "/tech" : "/admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to update own profile:", error);
    // The row was never updated, so the file just written is referenced by
    // nothing. Leaving it would strand a few megabytes per failed attempt.
    if (newAvatarUrl) await deleteUpload(newAvatarUrl);
    return { error: "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง" };
  }
}

const SETTINGS_ID = 1;

const defaultFrequencySchema = z.object({
  value: z.number().int().positive("รอบบำรุงรักษาต้องมากกว่า 0"),
  unit: z.enum(["days", "months", "years"]),
});

/**
 * Sets the maintenance cycle given to units registered from here on.
 * Existing units keep the cycle they already have — this never rewrites them.
 */
export async function updateDefaultFrequencyAction(value: number, unit: string) {
  const session = await verifyOrgAdmin();

  const parsed = defaultFrequencySchema.safeParse({ value, unit });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" };
  }

  try {
    const before = await prisma.systemSettings.findUnique({
      where: { id: SETTINGS_ID },
      select: { defaultFrequencyValue: true, defaultFrequencyUnit: true },
    });

    // upsert rather than update: the row is created by migration, but this
    // stays correct on a database where that somehow didn't happen.
    await prisma.systemSettings.upsert({
      where: { id: SETTINGS_ID },
      update: { defaultFrequencyValue: parsed.data.value, defaultFrequencyUnit: parsed.data.unit },
      create: {
        id: SETTINGS_ID,
        defaultFrequencyValue: parsed.data.value,
        defaultFrequencyUnit: parsed.data.unit,
      },
    });

    await logAudit({
      userId: BigInt(session.user.id!),
      action: "UPDATE_DEFAULT_FREQUENCY",
      entityType: "systemSettings",
      entityId: BigInt(SETTINGS_ID),
      oldValues: before
        ? { value: before.defaultFrequencyValue, unit: before.defaultFrequencyUnit }
        : undefined,
      newValues: { value: parsed.data.value, unit: parsed.data.unit },
      ipAddress: "server_action",
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to update default frequency:", error);
    return { error: "ไม่สามารถบันทึกรอบบำรุงรักษาเริ่มต้นได้" };
  }
}

const organisationSchema = z.object({
  name: z.string().trim().min(1, "กรุณาระบุชื่อหน่วยงาน").max(255, "ชื่อหน่วยงานยาวเกินไป"),
  address: z.string().trim().max(255, "ที่อยู่ยาวเกินไป").optional(),
  phone: z.string().trim().max(255, "เบอร์โทรศัพท์ยาวเกินไป").optional(),
});

/** Organisation details shown in the dashboard header and on public pages. */
export async function updateOrganisationInfoAction(
  name: string,
  address?: string,
  phone?: string
) {
  const session = await verifyOrgAdmin();

  const parsed = organisationSchema.safeParse({ name, address, phone });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" };
  }

  try {
    const before = await getOrganisationInfo();

    await prisma.systemSettings.upsert({
      where: { id: SETTINGS_ID },
      update: {
        organisationName: parsed.data.name,
        organisationAddress: parsed.data.address || null,
        organisationPhone: parsed.data.phone || null,
      },
      create: {
        id: SETTINGS_ID,
        organisationName: parsed.data.name,
        organisationAddress: parsed.data.address || null,
        organisationPhone: parsed.data.phone || null,
      },
    });

    await logAudit({
      userId: BigInt(session.user.id!),
      action: "UPDATE_ORGANISATION_INFO",
      entityType: "systemSettings",
      entityId: BigInt(SETTINGS_ID),
      oldValues: before,
      newValues: {
        name: parsed.data.name,
        address: parsed.data.address || null,
        phone: parsed.data.phone || null,
      },
      ipAddress: "server_action",
    });

    // The name appears in the header of every dashboard, so both trees have
    // to be rebuilt or the old one lingers until the next natural navigation.
    revalidatePath("/admin");
    revalidatePath("/tech");
    return { success: true };
  } catch (error) {
    console.error("Failed to update organisation info:", error);
    return { error: "ไม่สามารถบันทึกข้อมูลหน่วยงานได้" };
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

const AUDIT_LOG_PAGE_SIZE = 50;

/**
 * Reads back the audit trail that logAudit has been writing all along and
 * which nothing has ever displayed. Paged rather than capped, so a filtered
 * search can reach beyond the newest page.
 */
export async function getAuditLogs(params?: { page?: number; action?: string }) {
  await verifyOrgAdmin();

  const page = Math.max(1, Math.floor(params?.page ?? 1));
  const where = params?.action ? { action: params.action } : {};

  try {
    const [rows, total, actions] = await Promise.all([
      prisma.systemAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * AUDIT_LOG_PAGE_SIZE,
        take: AUDIT_LOG_PAGE_SIZE,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          oldValues: true,
          newValues: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      }),
      prisma.systemAuditLog.count({ where }),
      // Drives the filter dropdown from what has actually been recorded,
      // rather than a hardcoded list that drifts as actions are added.
      prisma.systemAuditLog.findMany({
        distinct: ["action"],
        select: { action: true },
        orderBy: { action: "asc" },
      }),
    ]);

    return {
      logs: rows.map((row) => ({
        id: row.id.toString(),
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId.toString(),
        oldValues: row.oldValues,
        newValues: row.newValues,
        createdAt: row.createdAt.toISOString(),
        userName: row.user.name,
      })),
      page: {
        current: page,
        pageSize: AUDIT_LOG_PAGE_SIZE,
        total,
        hasMore: page * AUDIT_LOG_PAGE_SIZE < total,
      },
      availableActions: actions.map((a) => a.action),
    };
  } catch (error) {
    console.error("Failed to load audit logs:", error);
    return {
      logs: [],
      page: { current: 1, pageSize: AUDIT_LOG_PAGE_SIZE, total: 0, hasMore: false },
      availableActions: [],
      error: "ไม่สามารถโหลดประวัติการใช้งานระบบได้",
    };
  }
}

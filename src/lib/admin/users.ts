import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { verifyOrgAdmin } from "@/lib/auth-guards";
import { forgetAccountStatus } from "@/lib/account-status";
import { formatUnitLocation } from "@/lib/location";

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
    // The account's next request on this instance re-reads it rather than
    // waiting out the cache (see account-status.ts).
    forgetAccountStatus(targetUserId);

    console.log(
      `[AUDIT TRAIL] User status updated by OrgAdmin (AdminID: ${session.user.id}): TargetUser ${targetUserId} -> Status: ${newStatus} at ${new Date().toISOString()}`
    );

    revalidatePath("/admin", "layout");
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

    revalidatePath("/admin", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to reset user password:", error);
    return { error: "ไม่สามารถรีเซ็ตรหัสผ่านได้ กรุณาลองใหม่อีกครั้ง" };
  }
}

/** One visit this technician recorded, carrying where the unit was. */
export interface TechnicianLogRow {
  id: string;
  airConditionerId: string;
  acCode: string;
  acLabel: string;
  // The unit's own picture, for the thumbnail on the unit header.
  acPhotoUrl: string | null;
  action: string;
  notes: string | null;
  repairDetail: string | null;
  // What the technician photographed on the visit.
  beforePhotoUrl: string | null;
  afterPhotoUrl: string | null;
  // The order this visit closed, when it closed one. A walk-up visit — a
  // technician scanning a sticker and recording work on the spot — has none.
  workOrder: {
    id: string;
    type: "repair" | "cleaning";
    priority: string | null;
    issueDescription: string | null;
  } | null;
  performedAt: string;
  // The fields groupByBuilding / groupByFloor / groupByRoom expect, so the
  // whole building > floor > room tree comes from the shared components rather
  // than from a second implementation written for this panel.
  buildingId: string;
  buildingName: string;
  floor: number | null;
  roomId: string;
  roomName: string;
  location: string;
}

/**
 * One technician, for the panel that opens from their card.
 *
 * The work history is scoped by userId in the query, not in the component.
 * Filtering it on the way out would mean the rows for everybody else were
 * fetched and sent to the browser first, and someone tidying the component
 * later could show them by accident — which for "what has this person done" is
 * the whole answer being wrong.
 *
 * Fetched whole: a technician here has between forty and seventy logs, so the
 * tree and every unit's entries arrive together and expanding one costs no
 * request. If that grows into the thousands this needs to load per unit.
 */
export async function getTechnicianDetail(userId: string) {
  await verifyOrgAdmin();

  let id: bigint;
  try {
    id = BigInt(userId);
  } catch {
    return { error: "รหัสผู้ใช้ไม่ถูกต้อง" };
  }

  try {
    const [user, logs] = await Promise.all([
      prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          avatarUrl: true,
          createdAt: true,
          phones: {
            select: { phoneNumber: true, isPrimary: true },
            orderBy: { isPrimary: "desc" },
          },
        },
      }),
      prisma.maintenanceLog.findMany({
        where: { userId: id },
        orderBy: { performedAt: "desc" },
        select: {
          id: true,
          action: true,
          notes: true,
          repairDetail: true,
          beforePhotoUrl: true,
          afterPhotoUrl: true,
          performedAt: true,
          workOrder: {
            select: { id: true, type: true, priority: true, issueDescription: true },
          },
          airConditioner: {
            select: {
              id: true,
              acCode: true,
              brand: true,
              photoUrl: true,
              acBrand: { select: { name: true } },
              acModel: { select: { name: true } },
              room: {
                select: {
                  id: true,
                  name: true,
                  floor: true,
                  building: { select: { id: true, name: true, abbreviation: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    if (!user) return { error: "ไม่พบผู้ใช้งาน" };

    const history: TechnicianLogRow[] = logs.map((log) => {
      const unit = log.airConditioner;
      return {
        id: log.id.toString(),
        airConditionerId: unit.id.toString(),
        acCode: unit.acCode,
        acLabel: [unit.acBrand?.name ?? unit.brand, unit.acModel?.name].filter(Boolean).join(" "),
        acPhotoUrl: unit.photoUrl,
        action: log.action,
        notes: log.notes,
        repairDetail: log.repairDetail,
        beforePhotoUrl: log.beforePhotoUrl,
        afterPhotoUrl: log.afterPhotoUrl,
        workOrder: log.workOrder
          ? {
              id: log.workOrder.id.toString(),
              type: log.workOrder.type,
              priority: log.workOrder.priority,
              issueDescription: log.workOrder.issueDescription,
            }
          : null,
        performedAt: log.performedAt.toISOString(),
        buildingId: unit.room.building.id.toString(),
        buildingName: unit.room.building.name,
        floor: unit.room.floor,
        roomId: unit.room.id.toString(),
        roomName: unit.room.name,
        location: formatUnitLocation(unit.room),
      };
    });

    return {
      user: {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt ? user.createdAt.toISOString() : null,
        phones: user.phones.map((phone) => ({
          number: phone.phoneNumber,
          isPrimary: phone.isPrimary,
        })),
      },
      history,
    };
  } catch (error) {
    console.error("Failed to load technician detail:", error);
    return { error: "ไม่สามารถโหลดข้อมูลเจ้าหน้าที่ได้" };
  }
}

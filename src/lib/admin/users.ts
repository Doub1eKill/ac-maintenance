import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { verifyOrgAdmin } from "@/lib/auth-guards";
import { forgetAccountStatus } from "@/lib/account-status";
import { formatUnitLocation } from "@/lib/location";
import { withDeadlockRetry } from "@/lib/db-retry";
import { discardCodesFor } from "@/lib/email-verification";

// What an org admin can do to somebody else's account: approve or suspend it,
// remove it once suspended, and clear its password when they are locked out. Split out of the former
// settings.ts, which held these alongside profile editing, organisation
// settings and the audit log in one 448-line file.
function parseUserId(userId: string): bigint | null {
  try {
    return BigInt(userId);
  } catch {
    return null;
  }
}

/** A job someone is holding, as the suspend dialog lists it. */
export interface HeldWorkOrder {
  id: string;
  type: "repair" | "cleaning";
  acCode: string;
  location: string;
  claimedAt: string | null;
}

/**
 * The jobs this person has claimed and not finished, for the warning shown
 * before suspending them. Asked when the dialog opens rather than carried on
 * every card: it is one indexed query (work_orders.claimed_by), and the answer
 * has to be current at the moment the admin decides.
 */
export async function getHeldWorkOrders(userId: string): Promise<{ workOrders: HeldWorkOrder[] } | { error: string }> {
  await verifyOrgAdmin();
  const id = parseUserId(userId);
  if (id === null) return { error: "ไม่พบผู้ใช้" };

  try {
    const rows = await prisma.workOrder.findMany({
      where: { claimedBy: id, status: "claimed" },
      orderBy: { claimedAt: "asc" },
      select: {
        id: true,
        type: true,
        claimedAt: true,
        airConditioner: {
          select: {
            acCode: true,
            room: { select: { name: true, floor: true, building: { select: { name: true, abbreviation: true } } } },
          },
        },
      },
    });
    return {
      workOrders: rows.map((row) => ({
        id: row.id.toString(),
        type: row.type,
        acCode: row.airConditioner.acCode,
        location: formatUnitLocation(row.airConditioner.room),
        claimedAt: row.claimedAt ? row.claimedAt.toISOString() : null,
      })),
    };
  } catch (error) {
    console.error("Failed to load held work orders:", error);
    return { error: "ไม่สามารถตรวจสอบงานที่ค้างอยู่ได้ กรุณาลองใหม่อีกครั้ง" };
  }
}

/**
 * Puts every job this person holds back in the pool, inside the caller's
 * transaction, and writes one RELEASE_WORKORDER audit row per job.
 *
 * Work orders are written before the user row on purpose: the app's lock order
 * is work_orders first (see the note on logMaintenanceAction). The FK locks a
 * maintenance log insert takes on users are KEY SHARE, which an UPDATE of
 * users.status does not conflict with on PostgreSQL.
 *
 * A technician claiming a job in the instant between this and the commit can
 * still end up holding it; their session dies within a minute, and removing
 * the account runs this again.
 */
// The extended client (lib/prisma.ts) does not fit Prisma.TransactionClient,
// so the transaction handle is typed by the two models it touches.
type ReleaseTx = Pick<typeof prisma, "workOrder" | "systemAuditLog">;

async function releaseHeldWorkOrders(tx: ReleaseTx, userId: bigint, actorId: bigint) {
  const released = await tx.workOrder.updateManyAndReturn({
    where: { claimedBy: userId, status: "claimed" },
    data: { status: "pending", claimedBy: null, claimedAt: null, assignedToId: null, assignedAt: null },
    select: { id: true },
  });
  if (released.length > 0) {
    await tx.systemAuditLog.createMany({
      data: released.map((wo) => ({
        userId: actorId,
        action: "RELEASE_WORKORDER",
        entityType: "workOrder",
        entityId: wo.id,
        oldValues: { status: "claimed", claimedBy: userId.toString() },
        newValues: { status: "pending", claimedBy: null },
        ipAddress: "server_action",
      })),
    });
  }
  return released.map((wo) => wo.id.toString());
}

/**
 * Approves, reactivates or suspends an account, with an audit row for each.
 *
 * Suspending also hands back every job the person is holding, in the same
 * transaction: a suspended technician cannot finish them, and left alone they
 * would sit claimed in a name nobody can sign in as. The dialog warns about
 * them first; this does it regardless, so a job claimed after the dialog
 * opened is not stranded either.
 */
export async function updateUserStatusByOrgAdminAction(
  targetUserId: string,
  newStatus: "active" | "suspended"
): Promise<{ success: true; releasedCount: number } | { error: string }> {
  const session = await verifyOrgAdmin();
  const actorId = BigInt(session.user.id!);
  const targetId = parseUserId(targetUserId);
  if (targetId === null) return { error: "ไม่พบผู้ใช้" };

  if (newStatus === "suspended" && targetId === actorId) {
    return { error: "ระงับสิทธิ์บัญชีตัวเองไม่ได้" };
  }

  try {
    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { status: true, deletedAt: true },
    });
    if (!target || target.deletedAt) {
      return { error: "ไม่พบผู้ใช้" };
    }
    if (target.status === newStatus) {
      return { success: true, releasedCount: 0 };
    }

    const action =
      newStatus === "suspended" ? "SUSPEND_USER" : target.status === "pending" ? "APPROVE_USER" : "ACTIVATE_USER";

    const releasedIds = await withDeadlockRetry("updateUserStatusByOrgAdminAction", () =>
      prisma.$transaction(async (tx) => {
        const released = newStatus === "suspended" ? await releaseHeldWorkOrders(tx, targetId, actorId) : [];
        await tx.user.update({ where: { id: targetId }, data: { status: newStatus } });
        await tx.systemAuditLog.create({
          data: {
            userId: actorId,
            action,
            entityType: "user",
            entityId: targetId,
            oldValues: { status: target.status },
            newValues: { status: newStatus, ...(released.length > 0 ? { releasedWorkOrders: released } : {}) },
            ipAddress: "server_action",
          },
        });
        return released;
      })
    );
    // The account's next request on this instance re-reads it rather than
    // waiting out the cache (see account-status.ts).
    forgetAccountStatus(targetUserId);

    revalidatePath("/admin", "layout");
    // Released jobs reappear in every technician's pool.
    if (releasedIds.length > 0) revalidatePath("/tech", "layout");
    return { success: true, releasedCount: releasedIds.length };
  } catch (error) {
    console.error("Failed to update user status by org admin:", error);
    return { error: "ไม่สามารถอัปเดตสถานะผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง" };
  }
}

/**
 * Removes a suspended account from the system for good.
 *
 * What goes: the means to sign in (password, the email address as a login,
 * remember token), the phone numbers, and the card on the team page. The email
 * is replaced with a placeholder rather than kept, so the same person can
 * register again later as a new account instead of hitting "already in use".
 *
 * What stays: the users row itself with the name and photo, because every
 * maintenance log, work order and audit row that person touched points at it,
 * and those should go on saying who did the work. deleted_at marks it; the
 * team list, the search and the detail panel skip such rows.
 *
 * Only a suspended account can be removed, so it is always two deliberate
 * steps, and nobody is removed while signed in and working.
 */
export async function deleteUserByOrgAdminAction(
  targetUserId: string
): Promise<{ success: true; releasedCount: number } | { error: string }> {
  const session = await verifyOrgAdmin();
  const actorId = BigInt(session.user.id!);
  const targetId = parseUserId(targetUserId);
  if (targetId === null) return { error: "ไม่พบผู้ใช้" };
  if (targetId === actorId) return { error: "ลบบัญชีตัวเองไม่ได้" };

  try {
    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { name: true, email: true, role: true, status: true, deletedAt: true },
    });
    if (!target || target.deletedAt) return { error: "ไม่พบผู้ใช้" };
    if (target.status !== "suspended") {
      return { error: "ต้องระงับสิทธิ์บัญชีนี้ก่อนจึงจะลบออกจากระบบได้" };
    }

    const releasedIds = await withDeadlockRetry("deleteUserByOrgAdminAction", () =>
      prisma.$transaction(async (tx) => {
        // An account suspended before suspending released jobs may still hold some.
        const released = await releaseHeldWorkOrders(tx, targetId, actorId);
        await tx.userPhone.deleteMany({ where: { userId: targetId } });
        await tx.user.update({
          where: { id: targetId },
          data: {
            email: `removed-${targetId}@deleted.invalid`,
            password: null,
            rememberToken: null,
            lastSeenAt: null,
            signedOutAt: null,
            deletedAt: new Date(),
          },
        });
        await tx.systemAuditLog.create({
          data: {
            userId: actorId,
            action: "DELETE_USER",
            entityType: "user",
            entityId: targetId,
            oldValues: { name: target.name, email: target.email, role: target.role, status: target.status },
            newValues: { deleted: true, ...(released.length > 0 ? { releasedWorkOrders: released } : {}) },
            ipAddress: "server_action",
          },
        });
        return released;
      })
    );

    // Codes sent to the old address are of no use to anyone now.
    await discardCodesFor(target.email).catch(() => {});
    forgetAccountStatus(targetUserId);

    revalidatePath("/admin", "layout");
    if (releasedIds.length > 0) revalidatePath("/tech", "layout");
    return { success: true, releasedCount: releasedIds.length };
  } catch (error) {
    console.error("Failed to delete user:", error);
    return { error: "ไม่สามารถลบผู้ใช้ออกจากระบบได้ กรุณาลองใหม่อีกครั้ง" };
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
      select: { id: true, email: true, password: true, deletedAt: true },
    });

    if (!target || target.deletedAt) return { error: "ไม่พบผู้ใช้" };
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
          deletedAt: true,
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

    // A removed account has no card to open; this keeps a stale link from showing one.
    if (!user || user.deletedAt) return { error: "ไม่พบผู้ใช้งาน" };

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

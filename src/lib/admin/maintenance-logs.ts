import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getMaintenanceHistory } from "@/lib/maintenance";
import { catalogueFlags } from "@/lib/catalogue-status";
import { formatUnitLocation } from "@/lib/location";

// A unit's service record: reading it, and correcting an entry in it.
//
// Note this module does not import verifyOrgAdmin. Reading a history is
// guarded on an active session instead, and editing a log has its own rule —
// a technician may fix their own entry, an admin may fix any. Both are spelled
// out where they apply.
/**
 * One unit's full service record, for the "ดูประวัติ" view in the asset
 * manager. Returns the unit's identifying details alongside the log so the
 * caller can title the panel without a second round trip.
 *
 * Guarded on an active session rather than on org_admin: the same history is
 * already public on the QR page, so restricting it further here would only
 * stop a technician reusing this, not protect anything.
 */
export async function getAirConditionerHistory(airConditionerId: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "active") {
    throw new Error("Unauthorized: sign-in required");
  }

  let acId: bigint;
  try {
    acId = BigInt(airConditionerId);
  } catch {
    return { error: "รหัสเครื่องปรับอากาศไม่ถูกต้อง" };
  }

  try {
    const [ac, history] = await Promise.all([
      prisma.airConditioner.findUnique({
        where: { id: acId },
        select: {
          acCode: true,
          brand: true,
          model: true,
          btu: true,
          status: true,
          installedAt: true,
          acBrand: { select: { name: true, deletedAt: true } },
          acModel: { select: { name: true, deletedAt: true } },
          room: {
            select: { name: true, building: { select: { name: true } } },
          },
        },
      }),
      getMaintenanceHistory(acId),
    ]);

    if (!ac) return { error: "ไม่พบเครื่องปรับอากาศ" };

    return {
      unit: {
        acCode: ac.acCode,
        brand: ac.acBrand?.name ?? ac.brand ?? "ไม่ระบุ",
        model: ac.acModel?.name ?? ac.model ?? null,
        ...catalogueFlags(ac),
        btu: ac.btu,
        status: ac.status,
        location: formatUnitLocation(ac.room),
        installedAt: ac.installedAt ? ac.installedAt.toISOString() : null,
      },
      history,
    };
  } catch (error) {
    console.error("Failed to load air conditioner history:", error);
    return { error: "ไม่สามารถโหลดประวัติการซ่อมบำรุงได้" };
  }
}

const updateLogSchema = z.object({
  logId: z.string().min(1),
  action: z.enum(["cleaning", "repair", "refill_refrigerant"]),
  notes: z.string().trim().optional(),
  repairDetail: z.string().trim().optional(),
});

/**
 * Corrects a maintenance log a technician got wrong — the job type they
 * ticked, the note they wrote, or what they said was repaired.
 *
 * A technician may only correct their own entries; an org admin may correct
 * any. The ownership check reads userId from the row itself rather than
 * trusting anything the client sends, so a technician cannot edit a
 * colleague's work by passing someone else's log id.
 *
 * What it will not touch: performedAt, the photos, and which unit the log
 * belongs to. Those are the parts that make the entry evidence of a
 * particular visit — a wrong one should be raised with an admin, not quietly
 * rewritten. Every change is written to the audit log with its previous
 * values, since this edits history rather than current state.
 */
export async function updateMaintenanceLogAction(
  logId: string,
  action: "cleaning" | "repair" | "refill_refrigerant",
  notes?: string,
  repairDetail?: string
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "active") {
    throw new Error("Unauthorized: sign-in required");
  }

  const parsed = updateLogSchema.safeParse({ logId, action, notes, repairDetail });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" };
  }
  const data = parsed.data;

  if (data.action === "repair" && !data.repairDetail) {
    return { error: "กรุณาระบุรายละเอียดการซ่อม" };
  }

  let id: bigint;
  try {
    id = BigInt(data.logId);
  } catch {
    return { error: "ไม่พบรายการประวัติ" };
  }

  try {
    const log = await prisma.maintenanceLog.findUnique({
      where: { id },
      select: { id: true, userId: true, action: true, notes: true, repairDetail: true },
    });

    if (!log) return { error: "ไม่พบรายการประวัติ" };

    const isOwner = log.userId.toString() === session.user.id;
    const isAdmin = session.user.role === "org_admin";
    if (!isOwner && !isAdmin) {
      return { error: "แก้ไขได้เฉพาะประวัติที่คุณเป็นผู้บันทึกเท่านั้น" };
    }

    await prisma.maintenanceLog.update({
      where: { id },
      data: {
        action: data.action,
        notes: data.notes || null,
        // Cleared when the entry is no longer a repair, so a corrected job
        // type can't leave repair text stranded on a cleaning record.
        repairDetail: data.action === "repair" ? data.repairDetail : null,
      },
    });

    await logAudit({
      userId: BigInt(session.user.id),
      action: "UPDATE_MAINTENANCE_LOG",
      entityType: "maintenanceLog",
      entityId: id,
      oldValues: { action: log.action, notes: log.notes, repairDetail: log.repairDetail },
      newValues: {
        action: data.action,
        notes: data.notes || null,
        repairDetail: data.action === "repair" ? data.repairDetail : null,
      },
      ipAddress: "server_action",
    });

    revalidatePath("/admin");
    revalidatePath("/tech");
    return { success: true };
  } catch (error) {
    console.error("Failed to update maintenance log:", error);
    return { error: "ไม่สามารถแก้ไขประวัติได้" };
  }
}


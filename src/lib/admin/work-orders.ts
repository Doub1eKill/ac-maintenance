import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit, logAuditMany } from "@/lib/audit";
import { withDeadlockRetry } from "@/lib/db-retry";
import { verifyOrgAdmin } from "@/lib/auth-guards";

const createWorkOrderSchema = z.object({
  airConditionerId: z.string().min(1, "กรุณาเลือกเครื่องปรับอากาศ"),
  assignToUserId: z.string().optional(),
  priority: z.enum(["low", "high", "critical"]).default("low"),
  // Optional, and defaulting to a repair, because the form does not offer this
  // choice yet and a required field the UI never sends would simply stop
  // admins raising work orders at all. Repair is the honest default rather
  // than a placeholder: this path has always marked the unit as broken, so a
  // fault report is what it already was.
  type: z.enum(["repair", "cleaning"]).default("repair"),
});

export async function createWorkOrderAction(formData: FormData) {
  const session = await verifyOrgAdmin();

  const raw = {
    airConditionerId: formData.get("airConditionerId"),
    assignToUserId: formData.get("assignToUserId") || undefined,
    priority: formData.get("priority") || undefined,
    type: formData.get("type") || undefined,
  };

  const parsed = createWorkOrderSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" };
  }

  try {
    const acId = BigInt(parsed.data.airConditionerId);
    const assignTo = parsed.data.assignToUserId ? BigInt(parsed.data.assignToUserId) : null;

    // One open job of a kind per unit. Two admins reporting the same fault
    // used to produce two identical rows on the board, and whichever
    // technician claimed the second found the work already done (QA
    // 20260913-1742, BUG-004). A repair and a cleaning may coexist — they
    // are different work — so the check is per type. Looked up inside the
    // transaction that inserts, so two simultaneous submissions cannot both
    // pass the check before either row exists.
    const outcome = await prisma.$transaction(async (tx) => {
      const open = await tx.workOrder.findFirst({
        where: {
          airConditionerId: acId,
          type: parsed.data.type,
          status: { in: ["pending", "claimed"] },
        },
        select: { id: true, status: true },
      });
      if (open) return { open };

      const workOrder = await tx.workOrder.create({
        data: {
          airConditionerId: acId,
          status: assignTo ? "claimed" : "pending",
          type: parsed.data.type,
          priority: parsed.data.priority,
          claimedBy: assignTo,
          claimedAt: assignTo ? new Date() : null,
        },
      });
      return { workOrder };
    });

    if (outcome.open) {
      const kind = parsed.data.type === "repair" ? "ใบงานซ่อม" : "ใบงานล้างแอร์";
      const state = outcome.open.status === "claimed" ? "กำลังดำเนินการ" : "รอช่างรับงาน";
      return {
        error: `เครื่องนี้มี${kind}ที่ยังเปิดอยู่ (${state}) — ปิดหรือยกเลิกใบงานเดิมก่อนออกใบใหม่`,
      };
    }
    const workOrder = outcome.workOrder;

    await logAudit({
      userId: BigInt(session.user.id!),
      action: "CREATE_WORKORDER",
      entityType: "workOrder",
      entityId: workOrder.id,
      newValues: { status: "pending", type: parsed.data.type, airConditionerId: acId.toString(), priority: parsed.data.priority },
      ipAddress: "server_action",
    });

    // Mark the unit to match the job that was just raised. This used to set
    // "broken" unconditionally, which was fine while every order through here
    // was a fault report — but now that the order records its own type, a
    // cleaning job that left the unit flagged as broken would contradict it.
    await prisma.airConditioner.update({
      where: { id: acId },
      data: { status: parsed.data.type === "repair" ? "broken" : "needs_cleaning" },
    });

    revalidatePath("/admin", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to create work order:", error);
    return { error: "ไม่สามารถออกใบงานซ่อมบำรุงได้" };
  }
}

export async function assignWorkOrderAction(workOrderId: string, assignToUserId: string) {
  const session = await verifyOrgAdmin();

  try {
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: BigInt(workOrderId) },
      select: { status: true },
    });

    if (!workOrder) {
      return { error: "ไม่พบใบงานซ่อมบำรุง" };
    }
    if (workOrder.status !== "pending") {
      return { error: "ไม่สามารถมอบหมายงานได้ (งานอาจถูกรับไปแล้ว)" };
    }

    const techUser = await prisma.user.findUnique({
      where: { id: BigInt(assignToUserId) },
      select: { role: true, status: true },
    });

    if (!techUser || techUser.role !== "technician" || techUser.status !== "active") {
      return { error: "ไม่พบข้อมูลช่างเทคนิค หรือช่างเทคนิคไม่ได้อยู่ในสถานะที่พร้อมรับงาน" };
    }

    await prisma.workOrder.update({
      where: { id: BigInt(workOrderId) },
      data: {
        status: "claimed",
        claimedBy: BigInt(assignToUserId),
        claimedAt: new Date(),
      },
    });

    await logAudit({
      userId: BigInt(session.user.id!),
      action: "ASSIGN_WORKORDER",
      entityType: "workOrder",
      entityId: BigInt(workOrderId),
      newValues: { status: "claimed", claimedBy: assignToUserId },
      ipAddress: "server_action",
    });

    revalidatePath("/admin", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to assign work order:", error);
    return { error: "ไม่สามารถมอบหมายงานได้ กรุณาลองใหม่อีกครั้ง" };
  }
}

/**
 * Assigns several work orders to one technician in a single call.
 *
 * The urgent list on the dashboard ticks *units*, but a technician is assigned
 * to a *job*, so the board sends the work order behind each ticked unit —
 * urgentUnits[].workOrderId, null when the unit has no open job. Units without
 * one are left out rather than having a job invented for them: opening a work
 * order means deciding whether it is a repair or a cleaning, and inferring that
 * is exactly what recording the type on the order was meant to stop. An admin
 * who wants a job for that unit raises one explicitly, where the choice is
 * made rather than guessed.
 *
 * Orders that are no longer pending are skipped the same way. The status guard
 * on the update is what makes that safe: a job another admin assigned, or a
 * technician claimed, a moment ago simply isn't matched, so `count` is exactly
 * how many this call won and nothing is assigned twice.
 *
 * Returns how many were assigned and how many were skipped, so the board can
 * say what actually happened instead of implying every tick took effect.
 */
export async function bulkAssignWorkOrdersAction(
  workOrderIds: string[],
  assignToUserId: string
) {
  const session = await verifyOrgAdmin();

  if (!Array.isArray(workOrderIds) || workOrderIds.length === 0) {
    return { error: "กรุณาเลือกใบงานอย่างน้อย 1 รายการ" };
  }

  let ids: bigint[];
  let techId: bigint;
  try {
    ids = workOrderIds.map((id) => BigInt(id));
    techId = BigInt(assignToUserId);
  } catch {
    return { error: "ข้อมูลไม่ถูกต้อง" };
  }

  // Checked once for the whole batch rather than per row: the answer is the
  // same for every order, and a suspended account should fail the call outright
  // instead of quietly assigning nothing.
  const tech = await prisma.user.findUnique({
    where: { id: techId },
    select: { role: true, status: true },
  });

  if (!tech || tech.role !== "technician" || tech.status !== "active") {
    return { error: "ไม่พบข้อมูลช่างเทคนิค หรือช่างเทคนิคไม่ได้อยู่ในสถานะที่พร้อมรับงาน" };
  }

  // Second-aligned deliberately: work_orders.claimed_at is Timestamp(0), so a
  // Date carrying milliseconds is truncated on write and would no longer equal
  // this value when the assigned rows are read back below.
  const claimedAt = new Date(Math.floor(Date.now() / 1000) * 1000);

  try {
    const { assignedCount, assignedIds } = await withDeadlockRetry(
      "bulkAssignWorkOrdersAction",
      () =>
        prisma.$transaction(async (tx) => {
          // One guarded write for the whole batch instead of a round trip per
          // id — the same reason P4 rewrote bulk claiming.
          const { count } = await tx.workOrder.updateMany({
            where: { id: { in: ids }, status: "pending" },
            data: { status: "claimed", claimedBy: techId, claimedAt },
          });

          if (count === 0) return { assignedCount: 0, assignedIds: [] as bigint[] };

          // Read back which of the requested ids this call is now holding, to
          // attribute the audit rows. Scoped by claimedBy + claimedAt so an
          // earlier batch assigned to the same technician isn't picked up.
          const rows = await tx.workOrder.findMany({
            where: { id: { in: ids }, status: "claimed", claimedBy: techId, claimedAt },
            select: { id: true },
          });

          return { assignedCount: count, assignedIds: rows.map((r) => r.id) };
        })
    );

    await logAuditMany(
      assignedIds.map((id) => ({
        userId: BigInt(session.user.id!),
        action: "ASSIGN_WORKORDER",
        entityType: "workOrder",
        entityId: id,
        newValues: { status: "claimed", claimedBy: techId.toString(), bulk: true },
        ipAddress: "server_action",
      }))
    );

    revalidatePath("/admin", "layout");
    // The technician's own job list changes too, not just the admin board.
    revalidatePath("/tech", "layout");

    return {
      success: true,
      assignedCount,
      skippedCount: ids.length - assignedCount,
    };
  } catch (error) {
    console.error("Failed to bulk assign work orders:", error);
    return { error: "ไม่สามารถมอบหมายงานหลายรายการได้ กรุณาลองใหม่อีกครั้ง" };
  }
}

/**
 * Cancels a work order that shouldn't have been raised — the usual case being
 * a fault reported against the wrong machine.
 *
 * Cancelling also clears the unit's condition, because the two go together:
 * the status was set to broken by the report being cancelled, so leaving it
 * behind would keep the unit looking faulty with nothing outstanding to
 * explain why. It only resets to normal once nothing else is open against the
 * unit — a second report, or a cleaning due from the schedule, still describes
 * something real.
 *
 * Only pending or claimed orders can be cancelled. A completed one has
 * maintenance logs hanging off it recording work that genuinely happened, and
 * cancelling that would misrepresent the unit's history.
 */
export async function cancelWorkOrderAction(workOrderId: string, reason?: string) {
  const session = await verifyOrgAdmin();

  let wId: bigint;
  try {
    wId = BigInt(workOrderId);
  } catch {
    return { error: "ไม่พบใบงานซ่อมบำรุง" };
  }

  try {
    // Work order first, then the unit — the same order logMaintenanceAction
    // takes, which is what stops the two from deadlocking when an admin
    // cancels the very job a technician is closing. Don't reorder these.
    const result = await withDeadlockRetry("cancelWorkOrderAction", () =>
      prisma.$transaction(async (tx) => {
      const workOrder = await tx.workOrder.findUnique({
        where: { id: wId },
        select: { id: true, status: true, airConditionerId: true },
      });

      if (!workOrder) return { error: "ไม่พบใบงานซ่อมบำรุง" };
      if (workOrder.status === "cancelled") return { error: "ใบงานนี้ถูกยกเลิกไปแล้ว" };
      if (workOrder.status === "completed") {
        return { error: "ไม่สามารถยกเลิกใบงานที่ปิดงานแล้วได้ เพราะมีประวัติการปฏิบัติงานผูกอยู่" };
      }

      await tx.workOrder.update({
        where: { id: wId },
        data: { status: "cancelled", resolutionNotes: reason?.trim() || null },
      });

      const stillOpen = await tx.workOrder.count({
        where: {
          airConditionerId: workOrder.airConditionerId,
          status: { in: ["pending", "claimed"] },
        },
      });

      if (stillOpen === 0) {
        await tx.airConditioner.update({
          where: { id: workOrder.airConditionerId },
          data: { status: "normal" },
        });
      }

      return {
        airConditionerId: workOrder.airConditionerId,
        previousStatus: workOrder.status,
        statusReset: stillOpen === 0,
      };
      })
    );

    if ("error" in result) return result;

    await logAudit({
      userId: BigInt(session.user.id!),
      action: "CANCEL_WORKORDER",
      entityType: "workOrder",
      entityId: wId,
      oldValues: { status: result.previousStatus },
      newValues: {
        status: "cancelled",
        reason: reason?.trim() || null,
        airConditionerResetToNormal: result.statusReset,
      },
      ipAddress: "server_action",
    });

    revalidatePath("/admin", "layout");
    revalidatePath("/tech", "layout");
    return { success: true, statusReset: result.statusReset };
  } catch (error) {
    console.error("Failed to cancel work order:", error);
    return { error: "ไม่สามารถยกเลิกใบงานได้ กรุณาลองใหม่อีกครั้ง" };
  }
}

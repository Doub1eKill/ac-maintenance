import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { withDeadlockRetry } from "@/lib/db-retry";
import { verifyOrgAdmin } from "@/lib/auth-guards";
import {
  WORK_ORDER_PAGE_SIZE,
  workOrderBoardSelect,
  workOrderBoardOrderBy,
  toWorkOrderBoardRow,
} from "@/lib/admin/work-order-board";

/**
 * One page of the work order board.
 *
 * getOrgAdminData() returns the first page along with everything else the
 * dashboard needs; this exists so the board can reach the rest. Previously it
 * reported hasMore without offering any way to act on it, which held once the
 * seeded data outgrew a single page.
 *
 * No filtering here on purpose: the board searches within the loaded page on
 * the client, as it always has. Server-side search is a separate change.
 */
export async function getWorkOrdersPage(page: number) {
  await verifyOrgAdmin();

  const safePage = Math.max(1, Math.floor(page) || 1);

  try {
    const [rows, total] = await Promise.all([
      prisma.workOrder.findMany({
        select: workOrderBoardSelect,
        orderBy: workOrderBoardOrderBy,
        skip: (safePage - 1) * WORK_ORDER_PAGE_SIZE,
        take: WORK_ORDER_PAGE_SIZE,
      }),
      prisma.workOrder.count(),
    ]);

    return {
      workOrders: rows.map(toWorkOrderBoardRow),
      page: safePage,
      pageSize: WORK_ORDER_PAGE_SIZE,
      total,
      hasMore: safePage * WORK_ORDER_PAGE_SIZE < total,
    };
  } catch (error) {
    console.error("Failed to load work orders page:", error);
    return {
      workOrders: [],
      page: safePage,
      pageSize: WORK_ORDER_PAGE_SIZE,
      total: 0,
      hasMore: false,
      error: "ไม่สามารถโหลดใบงานหน้านี้ได้",
    };
  }
}

const createWorkOrderSchema = z.object({
  airConditionerId: z.string().min(1, "กรุณาเลือกเครื่องปรับอากาศ"),
  assignToUserId: z.string().optional(),
  priority: z.enum(["low", "high", "critical"]).default("low"),
});

export async function createWorkOrderAction(formData: FormData) {
  const session = await verifyOrgAdmin();

  const raw = {
    airConditionerId: formData.get("airConditionerId"),
    assignToUserId: formData.get("assignToUserId") || undefined,
    priority: formData.get("priority") || undefined,
  };

  const parsed = createWorkOrderSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" };
  }

  try {
    const acId = BigInt(parsed.data.airConditionerId);
    const assignTo = parsed.data.assignToUserId ? BigInt(parsed.data.assignToUserId) : null;

    // Create Work Order
    const workOrder = await prisma.workOrder.create({
      data: {
        airConditionerId: acId,
        status: assignTo ? "claimed" : "pending",
        priority: parsed.data.priority,
        claimedBy: assignTo,
        claimedAt: assignTo ? new Date() : null,
      },
    });

    await logAudit({
      userId: BigInt(session.user.id!),
      action: "CREATE_WORKORDER",
      entityType: "workOrder",
      entityId: workOrder.id,
      newValues: { status: "pending", airConditionerId: acId.toString(), priority: parsed.data.priority },
      ipAddress: "server_action",
    });

    // Update AC status to broken/needs_cleaning if it was normal
    await prisma.airConditioner.update({
      where: { id: acId },
      data: { status: "broken" },
    });

    revalidatePath("/admin");
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

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to assign work order:", error);
    return { error: "ไม่สามารถมอบหมายงานได้ กรุณาลองใหม่อีกครั้ง" };
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

    revalidatePath("/admin");
    revalidatePath("/tech");
    return { success: true, statusReset: result.statusReset };
  } catch (error) {
    console.error("Failed to cancel work order:", error);
    return { error: "ไม่สามารถยกเลิกใบงานได้ กรุณาลองใหม่อีกครั้ง" };
  }
}

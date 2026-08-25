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
  workOrderSearchWhere,
} from "@/lib/admin/work-order-board";

/**
 * One page of the work order board, optionally narrowed by a search term.
 *
 * getOrgAdminData() returns the unfiltered first page along with everything
 * else the dashboard needs, so the board renders instantly; this serves every
 * other page, and every page once a search is active.
 *
 * Search runs here rather than on the client now. Filtering the loaded page
 * was fine while the board loaded one page and stopped, but with real paging
 * it meant searching from page 2 for a row listed on page 1 reported \"not
 * found\" — and nothing on screen distinguishes that from the record genuinely
 * not existing.
 *
 * `total` and `hasMore` are counted against the same filter, so the pager
 * describes the result set the user is actually looking at rather than the
 * whole table.
 */
export async function getWorkOrdersPage(
  page: number,
  // Optional and positional so the existing getWorkOrdersPage(page) calls keep
  // working untouched.
  options?: { search?: string }
) {
  await verifyOrgAdmin();

  const safePage = Math.max(1, Math.floor(page) || 1);
  const search = options?.search?.trim() ?? "";
  const where = workOrderSearchWhere(search);

  try {
    const [rows, total] = await Promise.all([
      prisma.workOrder.findMany({
        where,
        select: workOrderBoardSelect,
        orderBy: workOrderBoardOrderBy,
        skip: (safePage - 1) * WORK_ORDER_PAGE_SIZE,
        take: WORK_ORDER_PAGE_SIZE,
      }),
      prisma.workOrder.count({ where }),
    ]);

    return {
      workOrders: rows.map(toWorkOrderBoardRow),
      page: safePage,
      pageSize: WORK_ORDER_PAGE_SIZE,
      total,
      hasMore: safePage * WORK_ORDER_PAGE_SIZE < total,
      // Echoed back so the board can tell whether the rows it just received
      // answer the term currently in the box, or a slower earlier request that
      // landed late.
      search,
    };
  } catch (error) {
    console.error("Failed to load work orders page:", error);
    return {
      workOrders: [],
      page: safePage,
      pageSize: WORK_ORDER_PAGE_SIZE,
      total: 0,
      hasMore: false,
      search,
      error: "ไม่สามารถโหลดใบงานหน้านี้ได้",
    };
  }
}

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

    // Create Work Order
    const workOrder = await prisma.workOrder.create({
      data: {
        airConditionerId: acId,
        status: assignTo ? "claimed" : "pending",
        type: parsed.data.type,
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

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logAuditMany } from "@/lib/audit";
import { withDeadlockRetry } from "@/lib/db-retry";
import { verifyTechnician } from "@/lib/tech/guards";

// Claiming work: the single-job path delegates to the bulk one so there is only
// one guarded update to reason about.
export async function claimWorkOrderAction(workOrderId: string) {
  // Delegates to the atomic bulk-claim path (status=pending guarded update)
  // instead of its own find-then-update, which had a TOCTOU race: two techs
  // hitting "claim" on the same job at once could both pass the check before
  // either write landed.
  const result = await bulkClaimWorkOrdersAction([workOrderId]);

  if ("error" in result) return { error: result.error };
  if (result.claimedCount === 0) {
    return { error: "ใบงานนี้ถูกรับไปแล้วหรือไม่มีในระบบ" };
  }
  return { success: true as const };
}

export async function bulkClaimWorkOrdersAction(workOrderIds: string[]) {
  const session = await verifyTechnician();
  const techId = BigInt(session.user.id!);

  if (!Array.isArray(workOrderIds) || workOrderIds.length === 0) {
    return { error: "กรุณาเลือกงานอย่างน้อย 1 รายการ" };
  }

  const ids = workOrderIds.map((id) => BigInt(id));
  // Second-aligned on purpose: work_orders.claimed_at is Timestamp(0), so a
  // Date carrying milliseconds would be truncated on write and would no
  // longer equal this value when we read the claimed rows back below.
  const claimedAt = new Date(Math.floor(Date.now() / 1000) * 1000);

  try {
    // Only work_orders rows are touched here, so there's no cross-table order
    // to get wrong — but two techs bulk-claiming overlapping sets can still
    // collide on the row locks if their id lists are ordered differently.
    const { claimedCount, claimedIds } = await withDeadlockRetry(
      "bulkClaimWorkOrdersAction",
      () => prisma.$transaction(async (tx) => {
      // One guarded write for the whole batch instead of a round trip per id.
      // The status=pending guard is what makes this safe: a job another tech
      // grabbed a moment ago simply isn't matched, so it's skipped rather
      // than double-claimed, and `count` is the exact number won.
      const { count } = await tx.workOrder.updateMany({
        where: { id: { in: ids }, status: "pending" },
        data: { status: "claimed", claimedBy: techId, claimedAt },
      });

      if (count === 0) return { claimedCount: 0, claimedIds: [] as bigint[] };

      // Read back which of the requested ids this call is now holding, to
      // attribute the audit rows. Scoped by claimedBy + claimedAt so a
      // batch claimed earlier by the same tech isn't picked up.
      const rows = await tx.workOrder.findMany({
        where: { id: { in: ids }, status: "claimed", claimedBy: techId, claimedAt },
        select: { id: true },
      });

      return { claimedCount: count, claimedIds: rows.map((r) => r.id) };
      })
    );

    await logAuditMany(
      claimedIds.map((id) => ({
        userId: techId,
        action: "CLAIM_WORKORDER",
        entityType: "workOrder",
        entityId: id,
        newValues: { status: "claimed", claimedBy: techId.toString(), bulk: true },
        ipAddress: "server_action",
      }))
    );

    revalidatePath("/tech", "layout");

    return {
      success: true,
      claimedCount,
      skippedCount: ids.length - claimedCount,
    };
  } catch (error) {
    console.error("Failed to bulk claim work orders:", error);
    return { error: "เกิดข้อผิดพลาดในการรับงานหลายรายการ" };
  }
}

/**
 * A technician hands back a job they claimed and have not closed: it goes back
 * to the pool for anyone to pick up, the same state releaseHeldWorkOrders()
 * leaves it in when an account is suspended.
 *
 * Added 25 Oct 2026, after a job was claimed on production only to take
 * screenshots and needed a database edit to undo. Anyone can claim from the
 * pool, so anyone holding a job should be able to give it back — including one
 * an admin assigned them, which is how an assignment that cannot be done gets
 * back to the admin's board.
 *
 * One guarded write, like claiming: status=claimed and claimedBy=this
 * technician, so a job they closed a moment ago, or one an admin recalled or
 * cancelled, simply is not matched. Work orders only, so no lock order to keep.
 */
export async function releaseWorkOrderAction(workOrderId: string) {
  const session = await verifyTechnician();
  const techId = BigInt(session.user.id!);

  let id: bigint;
  try {
    id = BigInt(workOrderId);
  } catch {
    return { error: "ไม่พบใบงาน" };
  }

  try {
    const { count } = await prisma.workOrder.updateMany({
      where: { id, status: "claimed", claimedBy: techId },
      data: { status: "pending", claimedBy: null, claimedAt: null, assignedToId: null, assignedAt: null },
    });
    if (count === 0) {
      return { error: "งานนี้ไม่ได้อยู่ในมือคุณแล้ว (อาจปิดงาน ถูกเรียกคืน หรือถูกยกเลิกไปแล้ว)" };
    }

    await logAuditMany([
      {
        userId: techId,
        action: "RELEASE_WORKORDER",
        entityType: "workOrder",
        entityId: id,
        oldValues: { status: "claimed", claimedBy: techId.toString() },
        newValues: { status: "pending", claimedBy: null, by: "technician" },
        ipAddress: "server_action",
      },
    ]);

    revalidatePath("/tech", "layout");
    revalidatePath("/admin", "layout");
    return { success: true as const };
  } catch (error) {
    console.error("Failed to release work order:", error);
    return { error: "เกิดข้อผิดพลาดในการคืนงาน" };
  }
}

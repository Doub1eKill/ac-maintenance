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

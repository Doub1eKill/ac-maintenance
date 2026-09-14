import { prisma } from "@/lib/prisma";

/**
 * The figures behind the dashboard's analytics donut, counted over every
 * work order in the database.
 *
 * The donut used to derive them from the first page of the work order board
 * — fifty rows, newest first — so "รวมทั้งหมด 50 ใบงาน" was the page size,
 * not the total, and the sidebar's own count of open jobs disagreed with it
 * on the same screen. Three aggregate queries replace the fifty-row fetch
 * the overview no longer needs for anything else.
 */
export interface WorkOrderStats {
  total: number;
  completed: number;
  claimed: number;
  pending: number;
  cancelled: number;
  cleaning: number;
  repair: number;
  // Open (pending or claimed) orders raised as high or critical — what still
  // needs attention now, not every priority ever assigned.
  urgentOpen: number;
}

export async function getWorkOrderStats(): Promise<WorkOrderStats> {
  const [byStatus, byType, urgentOpen] = await Promise.all([
    prisma.workOrder.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.workOrder.groupBy({ by: ["type"], _count: { _all: true } }),
    prisma.workOrder.count({
      where: { priority: { in: ["high", "critical"] }, status: { in: ["pending", "claimed"] } },
    }),
  ]);

  const status = Object.fromEntries(byStatus.map((r) => [r.status, r._count._all]));
  const type = Object.fromEntries(byType.map((r) => [r.type, r._count._all]));

  return {
    total: byStatus.reduce((sum, r) => sum + r._count._all, 0),
    completed: status.completed ?? 0,
    claimed: status.claimed ?? 0,
    pending: status.pending ?? 0,
    cancelled: status.cancelled ?? 0,
    cleaning: type.cleaning ?? 0,
    repair: type.repair ?? 0,
    urgentOpen,
  };
}

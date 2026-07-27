import { prisma } from "@/lib/prisma";

// There is no cron/scheduler in this stack, so the "auto-check" that's
// supposed to flag units overdue for cleaning is done lazily instead: every
// time a tech- or admin-facing dashboard that cares about due dates loads,
// this materializes a pending WorkOrder for any active MaintenanceSchedule
// that has crossed nextDueDate and doesn't already have an open job. Idempotent —
// safe to call on every request.
export async function syncOverdueMaintenanceWorkOrders(universityId: bigint) {
  const now = new Date();

  const overdue = await prisma.maintenanceSchedule.findMany({
    where: {
      isActive: true,
      nextDueDate: { lte: now },
      airConditioner: {
        deletedAt: null,
        room: { building: { universityId } },
        workOrders: { none: { status: { in: ["pending", "claimed"] } } },
      },
    },
    select: { airConditionerId: true },
  });

  if (overdue.length === 0) return;

  const overdueIds = overdue.map((s) => s.airConditionerId);

  await prisma.$transaction([
    prisma.workOrder.createMany({
      data: overdueIds.map((airConditionerId) => ({
        airConditionerId,
        universityId,
        status: "pending" as const,
        priority: "low",
        issueDescription: "ครบกำหนดล้างแอร์ตามรอบบำรุงรักษา (ระบบสร้างอัตโนมัติ)",
      })),
    }),
    prisma.airConditioner.updateMany({
      where: { id: { in: overdueIds }, status: "normal" },
      data: { status: "needs_cleaning" },
    }),
  ]);
}

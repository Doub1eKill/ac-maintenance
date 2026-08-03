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

export interface TechnicianAssetUnit {
  id: string;
  acCode: string;
  brand: string;
  model: string | null;
  btu: number | null;
  status: string;
  location: string;
  lastCleanedAt: string | null;
  isOverdue: boolean;
  pendingWorkOrder: {
    id: string;
    priority: string | null;
    issueDescription: string | null;
    createdAt: string | null;
  } | null;
}

export interface TechnicianAssetSummary {
  total: number;
  cleaningJobs: number;
  repairJobs: number;
}

// Full asset list for the technician dashboard (backlog #1): every unit in
// the tech's university with its last-cleaned date, stalest first, with
// units that already have an open work order (broken, or overdue for
// cleaning per syncOverdueMaintenanceWorkOrders) pinned to the top
// regardless of staleness, plus a per-type job-count summary. Shared by the
// /api/tech/units route and the tech dashboard's server-rendered props so
// the query/shape/sort logic lives in one place. Caller must run
// syncOverdueMaintenanceWorkOrders first so overdue units are reflected.
export async function getTechnicianAssetList(
  universityId: bigint
): Promise<{ units: TechnicianAssetUnit[]; summary: TechnicianAssetSummary }> {
  const units = await prisma.airConditioner.findMany({
    where: { deletedAt: null, room: { building: { universityId } } },
    select: {
      id: true,
      acCode: true,
      brand: true,
      model: true,
      btu: true,
      status: true,
      acBrand: { select: { name: true } },
      acModel: { select: { name: true, defaultBtu: true } },
      room: {
        select: { name: true, floor: true, building: { select: { name: true } } },
      },
      maintenanceLogs: {
        orderBy: { performedAt: "desc" },
        take: 1,
        select: { performedAt: true },
      },
      workOrders: {
        where: { status: "pending" },
        take: 1,
        select: { id: true, createdAt: true, priority: true, issueDescription: true },
      },
    },
  });

  const shaped: TechnicianAssetUnit[] = units.map((u) => {
    const lastCleanedAt = u.maintenanceLogs[0]?.performedAt ?? null;
    const pendingWorkOrder = u.workOrders[0] ?? null;
    return {
      id: u.id.toString(),
      acCode: u.acCode,
      brand: u.acBrand?.name ?? u.brand ?? "ไม่ระบุ",
      model: u.acModel?.name ?? u.model,
      btu: u.btu ?? u.acModel?.defaultBtu ?? null,
      status: u.status,
      location: `${u.room.building.name} - ห้อง ${u.room.name}`,
      lastCleanedAt: lastCleanedAt ? lastCleanedAt.toISOString() : null,
      isOverdue: !!pendingWorkOrder,
      pendingWorkOrder: pendingWorkOrder
        ? {
            id: pendingWorkOrder.id.toString(),
            priority: pendingWorkOrder.priority,
            issueDescription: pendingWorkOrder.issueDescription,
            createdAt: pendingWorkOrder.createdAt ? pendingWorkOrder.createdAt.toISOString() : null,
          }
        : null,
    };
  });

  // Overdue units always float to the top regardless of staleness date;
  // the rest sort stalest first (never-cleaned units sort as oldest).
  shaped.sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    const aTime = a.lastCleanedAt ? new Date(a.lastCleanedAt).getTime() : 0;
    const bTime = b.lastCleanedAt ? new Date(b.lastCleanedAt).getTime() : 0;
    return aTime - bTime;
  });

  const summary: TechnicianAssetSummary = {
    total: shaped.length,
    cleaningJobs: shaped.filter((u) => u.pendingWorkOrder && u.status === "needs_cleaning").length,
    repairJobs: shaped.filter((u) => u.pendingWorkOrder && u.status === "broken").length,
  };

  return { units: shaped, summary };
}

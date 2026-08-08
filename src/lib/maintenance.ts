import { prisma } from "@/lib/prisma";

// The timezone the institutions actually operate in. Timestamps (performedAt,
// claimedAt) are stored as UTC instants and render correctly wherever they're
// read, so they don't need this — but MaintenanceSchedule.lastPerformedAt and
// .nextDueDate are @db.Date, i.e. a calendar day with no time attached, and
// "the day it was cleaned" means the day here, not the day in UTC. Between
// midnight and 07:00 local those disagree: a job closed at 02:00 would record
// yesterday's date and schedule the next visit a day early, and a unit due
// today wouldn't be picked up as overdue until 07:00.
const APP_TIME_ZONE = "Asia/Bangkok";

// Today's calendar date in APP_TIME_ZONE, anchored at UTC midnight so it
// round-trips through a DATE column unchanged.
export function businessDateToday(): Date {
  // en-CA formats as YYYY-MM-DD, which is directly parseable as an ISO date.
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return new Date(`${ymd}T00:00:00.000Z`);
}

// Advances a business date by a maintenance interval. Uses UTC setters rather
// than date-fns so the calendar day is preserved regardless of the runtime's
// own timezone — date-fns operates on local-time fields, which would read the
// wrong day off a UTC-midnight anchor on any host west of Greenwich.
export function addMaintenanceInterval(
  base: Date,
  value: number,
  unit: string
): Date {
  const next = new Date(base);

  if (unit === "days") {
    next.setUTCDate(next.getUTCDate() + value);
    return next;
  }

  // Month and year arithmetic can land on a day the target month doesn't have
  // (31 Jan + 1 month, or 29 Feb + 1 year). JS silently rolls those forward
  // into the following month — 31 Jan + 1 would become 3 Mar. Clamp to the
  // last day of the intended month instead, which is what date-fns did before
  // and what "same day next cycle" is meant to mean.
  const dayOfMonth = next.getUTCDate();

  if (unit === "years") {
    next.setUTCFullYear(next.getUTCFullYear() + value);
  } else {
    next.setUTCMonth(next.getUTCMonth() + value);
  }

  if (next.getUTCDate() !== dayOfMonth) {
    // Day 0 of the month we overflowed into = last day of the intended month.
    next.setUTCDate(0);
  }

  return next;
}

// How long a tenant's overdue-check result is considered fresh enough to
// skip re-running. Due dates move on a 3-month cycle, so re-checking more
// often than this buys nothing.
const OVERDUE_CHECK_TTL_MS = 5 * 60 * 1000;

// Last successful check per tenant. In-memory on purpose: this is a cache to
// avoid redundant work, never a source of truth, so losing it on restart
// just means one extra check. A multi-instance deploy would check once per
// instance per window rather than globally — still bounded, still correct.
const lastOverdueCheckAt = new Map<string, number>();

// There is no cron/scheduler in this stack, so the "auto-check" that's
// supposed to flag units overdue for cleaning is done lazily instead: every
// time a tech- or admin-facing dashboard that cares about due dates loads,
// this materializes a pending WorkOrder for any active MaintenanceSchedule
// that has crossed nextDueDate and doesn't already have an open job. Idempotent —
// safe to call on every request.
//
// Throttled per tenant (see OVERDUE_CHECK_TTL_MS) because it previously ran a
// query — and sometimes a write transaction — on every single dashboard load.
export async function syncOverdueMaintenanceWorkOrders(universityId: bigint) {
  const tenantKey = universityId.toString();
  const lastRun = lastOverdueCheckAt.get(tenantKey);

  if (lastRun !== undefined && Date.now() - lastRun < OVERDUE_CHECK_TTL_MS) {
    return;
  }
  // Recorded before the work runs so concurrent dashboard loads in the same
  // window don't all pile onto the same check.
  lastOverdueCheckAt.set(tenantKey, Date.now());

  // Compared against nextDueDate, which is a calendar day — so this has to be
  // today's date here, not the UTC instant (see APP_TIME_ZONE above).
  const today = businessDateToday();

  try {
    const overdue = await prisma.maintenanceSchedule.findMany({
      where: {
        isActive: true,
        nextDueDate: { lte: today },
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
  } catch (error) {
    // Don't let a failed run be cached as a successful one, or a transient DB
    // error would suppress the check for the rest of the TTL window.
    lastOverdueCheckAt.delete(tenantKey);
    throw error;
  }
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

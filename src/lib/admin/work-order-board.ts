// The work order board's query shape and row mapping, in one place.
//
// getOrgAdminData() serves the board's first page alongside the rest of the
// dashboard and getWorkOrdersPage() serves every page after it. They have to
// agree exactly: a field added to one and forgotten in the other shows up as
// rows that change shape when you page past the first 50. Keeping the select,
// the ordering and the mapper here is what makes that impossible to get wrong,
// and none of it can live in a "use server" file, which may export only async
// functions.
import type { Prisma } from "@/generated/prisma/client";

// How many work orders the board loads at once. It lives here rather than in
// a "use server" module because those may only export async functions — the
// UI still receives the number as getOrgAdminData().workOrderPage.pageSize so
// it can render real paging controls rather than silently showing one page.
export const WORK_ORDER_PAGE_SIZE = 50;

// The board's row shape, defined once. getOrgAdminData() serves the first page
// with the rest of the dashboard and getWorkOrdersPage() serves the others, so
// without this the two would each carry their own copy of the same select and
// mapping — and a field added to one and forgotten in the other would show up
// as rows that quietly change shape when you page past the first 50.
export const workOrderBoardSelect = {
  id: true,
  status: true,
  type: true,
  priority: true,
  issueDescription: true,
  resolutionNotes: true,
  images: true,
  assignedAt: true,
  claimedAt: true,
  completedAt: true,
  createdAt: true,
  airConditionerId: true,
  airConditioner: {
    select: {
      acCode: true,
      brand: true,
      btu: true,
      // The unit's own condition, surfaced as `acStatus` below so the board
      // can label a row repair vs. cleaning. Nothing stores a job type for a
      // work order itself, so this is the same signal the technician view and
      // the calendar already infer from.
      status: true,
      room: {
        select: {
          name: true,
          building: { select: { name: true, abbreviation: true } },
        },
      },
      acBrand: { select: { name: true } },
    },
  },
  claimedByUser: { select: { name: true } },
  reportedByUser: { select: { name: true } },
  assignedToUser: { select: { name: true } },
} as const;

// Newest first, with id as a tiebreaker — and the tiebreaker is not optional.
// 17 of the 52 work orders currently carry a NULL created_at, and rows that
// compare equal have no defined order in SQL: the engine is free to return
// them differently on each call. Under skip/take that means a row can appear
// on two pages, or on none, depending on how the ties happened to land that
// time. id is the primary key, so adding it makes the total order unique and
// paging repeatable.
export const workOrderBoardOrderBy = [
  { createdAt: "desc" },
  { id: "desc" },
] satisfies Prisma.WorkOrderOrderByWithRelationInput[];

export type WorkOrderBoardRow = Prisma.WorkOrderGetPayload<{ select: typeof workOrderBoardSelect }>;

export function toWorkOrderBoardRow(wo: WorkOrderBoardRow) {
  return {
    id: wo.id.toString(),
    acCode: wo.airConditioner.acCode,
    brand: wo.airConditioner.acBrand?.name || wo.airConditioner.brand || "ไม่ระบุ",
    btu: wo.airConditioner.btu,
    acStatus: wo.airConditioner.status,
    location: `${wo.airConditioner.room.building.name} (${wo.airConditioner.room.building.abbreviation}) - ห้อง ${wo.airConditioner.room.name}`,
    status: wo.status,
    // The job this order was raised for, as recorded when it was opened. Kept
    // separate from acStatus below, which is the unit's condition right now
    // and used to stand in for this.
    type: wo.type,
    priority: wo.priority,
    issueDescription: wo.issueDescription,
    resolutionNotes: wo.resolutionNotes,
    images: wo.images,
    reportedByName: wo.reportedByUser?.name || null,
    assignedToName: wo.assignedToUser?.name || null,
    assignedAt: wo.assignedAt ? wo.assignedAt.toISOString() : null,
    claimedByName: wo.claimedByUser?.name || null,
    claimedAt: wo.claimedAt ? wo.claimedAt.toISOString() : null,
    completedAt: wo.completedAt ? wo.completedAt.toISOString() : null,
    createdAt: wo.createdAt ? wo.createdAt.toISOString() : null,
    airConditionerId: wo.airConditionerId.toString(),
  };
}

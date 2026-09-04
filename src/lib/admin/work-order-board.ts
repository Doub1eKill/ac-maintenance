// The work order board's query shape and row mapping, in one place.
//
// The board used to page through the table fifty rows at a time, which is why
// this file exists: two callers built the same rows and had to agree exactly.
// It now loads the whole board at once and groups it by building, the way the
// technician lists and the urgent table do, so a building is never split
// across pages. The shared select and mapper stay here because getOrgAdminData
// still uses them, and because none of this can live in a "use server" file,
// which may export only async functions.
import type { Prisma } from "@/generated/prisma/client";
import { catalogueFlags } from "@/lib/catalogue-status";
import { formatUnitLocation } from "@/lib/location";

// How many work orders the overview's own copy of the board loads.
export const WORK_ORDER_PAGE_SIZE = 50;

// The ceiling on what the board page loads in one go. Grouping by building
// only works on rows that are actually here, so the board takes the table
// whole rather than a page of it — 58 work orders today against 73 units, and
// this leaves an order of magnitude of headroom. It is a bound rather than no
// limit at all because work orders accumulate with every cleaning cycle, where
// units do not; if it is ever reached the board says so on screen instead of
// quietly showing a truncated table.
export const WORK_ORDER_BOARD_LIMIT = 500;

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
          // id as well as the name: the board groups by building, and grouping
          // on a display string would merge two buildings that share a name.
          building: { select: { id: true, name: true, abbreviation: true } },
        },
      },
      acBrand: { select: { name: true, deletedAt: true } },
      // The board displays the brand but not the model, and still asks for the
      // model's deleted_at: every list that resolves a catalogue name carries
      // both flags, so one shared component can mark a retired entry without
      // first checking which of the two the caller happens to supply.
      acModel: { select: { deletedAt: true } },
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
    ...catalogueFlags(wo.airConditioner),
    btu: wo.airConditioner.btu,
    acStatus: wo.airConditioner.status,
    location: formatUnitLocation(wo.airConditioner.room, { withAbbreviation: true }),
    // Split out of `location`, which is assembled for display. Same pair the
    // technician job rows carry, so both sides group through groupByBuilding()
    // without either of them parsing a formatted string back apart.
    buildingId: wo.airConditioner.room.building.id.toString(),
    buildingName: wo.airConditioner.room.building.name,
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

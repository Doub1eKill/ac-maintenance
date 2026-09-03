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
import { catalogueFlags } from "@/lib/catalogue-status";
import { formatUnitLocation } from "@/lib/location";

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

// Matches the board's search box against the database instead of against
// whatever rows happen to be loaded.
//
// The client used to filter the current page only, which was fine while the
// board loaded one page and stopped. Once real paging arrived, searching from
// page 2 for a unit listed on page 1 reported \"not found\" — the row existed,
// it simply was not in the array being filtered. Nothing about that failure
// tells the user they are looking at a page rather than the whole table.
//
// The four fields are the ones the client matched: unit code, brand, location
// and the technician holding the job. `location` is assembled for display from
// the building and room, so there is no column to match it against — the
// building name, its abbreviation and the room name are each matched instead,
// which covers what anyone would actually type.
//
// No `mode: 'insensitive'`: these columns are utf8mb4_unicode_ci, so MySQL
// already compares them without regard to case. Prisma only honours that flag
// on PostgreSQL anyway.
export function workOrderSearchWhere(search: string): Prisma.WorkOrderWhereInput | undefined {
  const q = search.trim();
  if (!q) return undefined;

  return {
    OR: [
      { airConditioner: { acCode: { contains: q } } },
      // Brand lives in the catalogue when the unit was registered from it, and
      // in a free-text column when it was typed in as \"other\" — the board
      // displays whichever exists, so both have to be searchable.
      { airConditioner: { acBrand: { name: { contains: q } } } },
      { airConditioner: { brand: { contains: q } } },
      { airConditioner: { room: { name: { contains: q } } } },
      { airConditioner: { room: { building: { name: { contains: q } } } } },
      { airConditioner: { room: { building: { abbreviation: { contains: q } } } } },
      { claimedByUser: { name: { contains: q } } },
    ],
  };
}

export type WorkOrderBoardStatusFilter = "pending" | "claimed" | "completed" | "cancelled";

// Combines the search box with the board's status/building filters into one
// where clause. Kept separate from workOrderSearchWhere so callers that only
// need the search half (there are none left, but the split is cheap to keep)
// aren't forced to reason about the other two.
export function workOrderBoardWhere(params: {
  search?: string;
  status?: WorkOrderBoardStatusFilter;
  buildingId?: string;
}): Prisma.WorkOrderWhereInput | undefined {
  const clauses: Prisma.WorkOrderWhereInput[] = [];

  const searchWhere = workOrderSearchWhere(params.search ?? "");
  if (searchWhere) clauses.push(searchWhere);

  if (params.status) clauses.push({ status: params.status });

  if (params.buildingId) {
    clauses.push({ airConditioner: { room: { building: { id: BigInt(params.buildingId) } } } });
  }

  if (clauses.length === 0) return undefined;
  return clauses.length === 1 ? clauses[0] : { AND: clauses };
}

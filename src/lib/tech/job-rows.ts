import type { Prisma } from "@/generated/prisma/client";
import { catalogueFlags } from "@/lib/catalogue-status";
import { formatUnitLocation } from "@/lib/location";

/**
 * The query shape and the row mapping behind the technician's three job lists,
 * in one place.
 *
 * "งานทั้งหมด", "งานของฉัน" and "ประวัติ" are the same work order rendered by
 * the same card; they differ only in which work orders they select and which
 * timestamp the card shows. The include block and the mapping were nonetheless
 * written out three times, identical character for character, and the cost was
 * not theoretical: the same field had to be added to all three by hand twice in
 * a fortnight — buildingId/buildingName on 28 Aug and the catalogue flags on
 * 3 Sep. Nothing warns when one copy is missed, because they are three separate
 * object literals with no shared type between them.
 *
 * Mirrors what work-order-board.ts already does for the admin board, for the
 * same reason: the select, the mapper and the row type belong together, and
 * none of them can live in a "use server" file, which may export only async
 * functions.
 */
export const techJobInclude = {
  airConditioner: {
    include: {
      acBrand: true,
      acModel: { select: { deletedAt: true } },
      room: {
        include: {
          building: true,
        },
      },
    },
  },
} satisfies Prisma.WorkOrderInclude;

export type TechJobRecord = Prisma.WorkOrderGetPayload<{ include: typeof techJobInclude }>;

/**
 * Everything the three lists say about a job except its date. Each list adds
 * its own — createdAt for the pool, claimedAt for mine, completedAt for the
 * history — because that is the only thing that actually differs between them.
 */
export function toTechJobRow(wo: TechJobRecord) {
  return {
    id: wo.id.toString(),
    acCode: wo.airConditioner.acCode,
    brand: wo.airConditioner.acBrand?.name || wo.airConditioner.brand || "ไม่ระบุ",
    ...catalogueFlags(wo.airConditioner),
    btu: wo.airConditioner.btu,
    airConditionerId: wo.airConditionerId.toString(),
    status: wo.airConditioner.status,
    priority: wo.priority,
    location: formatUnitLocation(wo.airConditioner.room, { withAbbreviation: true, withFloor: true }),
    // The same location without the building, for the lists that group their
    // rows under a building header and would otherwise repeat it on every row.
    roomLocation: formatUnitLocation(wo.airConditioner.room, {
      withAbbreviation: true,
      withFloor: true,
      withBuilding: false,
    }),
    buildingId: wo.airConditioner.room.building.id.toString(),
    buildingName: wo.airConditioner.room.building.name,
  };
}

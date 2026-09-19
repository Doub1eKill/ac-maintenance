import { prisma } from "@/lib/prisma";
import type { WorkOrderType as MaintenanceJobType } from "@/generated/prisma/enums";
import { catalogueFlags } from "@/lib/catalogue-status";
import { formatUnitLocation } from "@/lib/location";
import { compareJobOrder } from "@/lib/maintenance";
import { verifyOrgAdmin } from "@/lib/auth-guards";

/**
 * The building → room → unit tree, and the three things derived from walking
 * it: the headline unit counts, the flattened unit list the create-work-order
 * dropdown needs, and the urgent list.
 *
 * Extracted so each admin page can ask for the tree on its own. It used to be
 * assembled only inside getOrgAdminData, which meant every page paid for it —
 * the asset manager genuinely needs the whole tree, but the approvals page,
 * which renders a list of pending users, was loading 5 buildings, 32 rooms, 73
 * units and 73 schedules to do it.
 *
 * The walk stays a single pass. Counting units, spotting the ones needing
 * attention and shaping the tree all happen together because they are all
 * reading the same nested arrays, and splitting them into three passes over the
 * same data would trade a real cost for no gain.
 */
export const buildingTreeSelect = {
  id: true,
  name: true,
  abbreviation: true,
  rooms: {
    select: {
      id: true,
      name: true,
      floor: true,
      airConditioners: {
        select: {
          id: true,
          acCode: true,
          qrCode: true,
          brand: true,
          model: true,
          btu: true,
          status: true,
          acBrand: { select: { name: true, deletedAt: true } },
          acModel: { select: { name: true, deletedAt: true } },
          maintenanceSchedules: {
            select: {
              isActive: true,
              frequencyValue: true,
              frequencyUnit: true,
              nextDueDate: true,
            },
          },
        },
        orderBy: { acCode: "asc" },
      },
    },
    orderBy: { name: "asc" },
  },
} as const;

/** A pending work order, as much of it as the urgent list shows. */
export interface PendingJobRef {
  id: bigint;
  type: MaintenanceJobType;
  priority: string | null;
  issueDescription: string | null;
  createdAt: Date | null;
  // "pending" is a job the admin can still hand out; "claimed" is one a
  // technician already holds, whose name rides along so the row can say so.
  status: "pending" | "claimed";
  claimedByName: string | null;
}

export interface UrgentUnit {
  id: string;
  acCode: string;
  location: string;
  roomLocation: string;
  roomId: string;
  roomName: string;
  floor: number | null;
  brand: string;
  model: string | null;
  brandDeleted: boolean;
  modelDeleted: boolean;
  btu: number | null;
  status: string;
  // Both, not just the name: the grouped list keys on the id (names are not
  // unique enough — this dataset has two "Administration Building" entries
  // differing only in a trailing number) and shows the name.
  buildingId: string;
  buildingName: string;
  type: MaintenanceJobType;
  workOrderId: string | null;
  // The technician holding the unit's open job, when it has been claimed or
  // assigned and so cannot be handed out (or raised) again. Exclusive with
  // workOrderId above: a job is either still waiting or already someone's.
  claimedByName: string | null;
  priority: string | null;
  issueDescription: string | null;
  reportedAt: string | null;
}

type BuildingRow = Awaited<ReturnType<typeof queryBuildingTree>>[number];

function queryBuildingTree() {
  return prisma.building.findMany({
    select: buildingTreeSelect,
    orderBy: { name: "asc" },
  });
}

/**
 * @param pendingJobByAcId open work orders keyed by unit id. Pass an empty map
 * when the caller only wants the tree: the urgent list still comes back, with
 * every entry's job details null, and a caller that does not read it pays
 * nothing for it.
 */
export function shapeBuildingTree(
  rows: BuildingRow[],
  pendingJobByAcId: Map<string, PendingJobRef>
) {
  let totalUnits = 0;
  let brokenOrCleaningUnits = 0;
  let repairUnits = 0;
  let cleaningUnits = 0;
  const urgentUnits: UrgentUnit[] = [];

  const buildings = rows.map((b) => {
    let bldgUnits = 0;
    const roomList = b.rooms.map((r) => {
      bldgUnits += r.airConditioners.length;
      totalUnits += r.airConditioners.length;
      r.airConditioners.forEach((ac) => {
        if (ac.status === "broken" || ac.status === "needs_cleaning") {
          brokenOrCleaningUnits += 1;
          if (ac.status === "broken") repairUnits += 1;
          else cleaningUnits += 1;

          const pendingWo = pendingJobByAcId.get(ac.id.toString());
          urgentUnits.push({
            id: ac.id.toString(),
            acCode: ac.acCode,
            location: formatUnitLocation({ name: r.name, building: { name: b.name } }),
            roomLocation: formatUnitLocation(
              { name: r.name, building: { name: b.name } },
              { withBuilding: false }
            ),
            roomId: r.id.toString(),
            roomName: r.name,
            floor: r.floor,
            brand: ac.acBrand?.name || ac.brand || "ไม่ระบุ",
            model: ac.acModel?.name || ac.model || null,
            ...catalogueFlags(ac),
            btu: ac.btu,
            status: ac.status,
            buildingId: b.id.toString(),
            buildingName: b.name,
            // What the open job was raised for. A unit flagged as needing
            // attention without an open job still has to sort somewhere, and
            // its own condition is all that is left to place it by.
            type: pendingWo?.type ?? (ac.status === "broken" ? "repair" : "cleaning"),
            // The open job behind this unit, or null when it has none. The
            // urgent list ticks units but assignment happens on a job, so the
            // board needs this to know which rows it can actually send to
            // bulkAssignWorkOrdersAction.
            workOrderId: pendingWo?.status === "pending" ? pendingWo.id.toString() : null,
            claimedByName: pendingWo?.status === "claimed" ? pendingWo.claimedByName : null,
            priority: pendingWo?.priority ?? null,
            issueDescription: pendingWo?.issueDescription ?? null,
            reportedAt: pendingWo?.createdAt ? pendingWo.createdAt.toISOString() : null,
          });
        }
      });
      return {
        id: r.id.toString(),
        name: r.name,
        floor: r.floor,
        acUnits: r.airConditioners.map((ac) => {
          const activeSchedule = ac.maintenanceSchedules?.find((s) => s.isActive);
          return {
            id: ac.id.toString(),
            acCode: ac.acCode,
            brand: ac.acBrand?.name || ac.brand || "ไม่ระบุ",
            model: ac.acModel?.name || ac.model || null,
            ...catalogueFlags(ac),
            btu: ac.btu,
            status: ac.status,
            qrCode: ac.qrCode,
            maintenanceSchedule: activeSchedule
              ? {
                  frequencyValue: activeSchedule.frequencyValue,
                  frequencyUnit: activeSchedule.frequencyUnit,
                  nextDueDate: activeSchedule.nextDueDate.toISOString(),
                }
              : null,
          };
        }),
      };
    });

    return {
      id: b.id.toString(),
      name: b.name,
      abbreviation: b.abbreviation,
      unitsCount: bldgUnits,
      rooms: roomList,
    };
  });

  // Building, then repairs before cleanings, then oldest report first — the
  // same order the technician asset list uses, via the same comparator.
  urgentUnits.sort((a, b) =>
    compareJobOrder(
      { buildingName: a.buildingName, jobType: a.type, sortDate: a.reportedAt },
      { buildingName: b.buildingName, jobType: b.type, sortDate: b.reportedAt }
    )
  );

  return {
    buildings,
    urgentUnits,
    unitCounts: { totalUnits, brokenOrCleaningUnits, repairUnits, cleaningUnits },
  };
}

export type BuildingTree = ReturnType<typeof shapeBuildingTree>["buildings"];

/** Every unit as one line, for the create-work-order dropdown. */
export function flattenUnitOptions(buildings: BuildingTree) {
  const options: Array<{ id: string; label: string }> = [];
  buildings.forEach((b) => {
    b.rooms.forEach((r) => {
      r.acUnits.forEach((ac) => {
        options.push({
          id: ac.id,
          label: `${ac.acCode} - ${b.name} ห้อง ${r.name} (${ac.brand})`,
        });
      });
    });
  });
  return options;
}

/**
 * The tree on its own, for pages that render assets but have no use for the
 * open work orders behind them (the asset manager, the QR code manager).
 */
export async function getBuildingTree() {
  await verifyOrgAdmin();
  const rows = await queryBuildingTree();
  return shapeBuildingTree(rows, new Map()).buildings;
}

/** Shared by the pages that do need the open jobs: the overview and the board. */
export async function getPendingJobsByAcId() {
  const rows = await prisma.workOrder.findMany({
    where: { status: { in: ["pending", "claimed"] } },
    select: {
      id: true,
      airConditionerId: true,
      type: true,
      priority: true,
      issueDescription: true,
      createdAt: true,
      status: true,
      claimedByUser: { select: { name: true } },
    },
  });
  // One entry per unit. A unit may hold a waiting job and a claimed one at
  // once (one open job per type), and the waiting one wins: it is the one
  // the admin can still act on, so the row stays assignable.
  const byAc = new Map<string, PendingJobRef>();
  for (const wo of rows) {
    const key = wo.airConditionerId.toString();
    const ref: PendingJobRef = {
      id: wo.id,
      type: wo.type,
      priority: wo.priority,
      issueDescription: wo.issueDescription,
      createdAt: wo.createdAt,
      status: wo.status === "pending" ? "pending" : "claimed",
      claimedByName: wo.claimedByUser?.name ?? null,
    };
    const existing = byAc.get(key);
    if (!existing || (existing.status === "claimed" && ref.status === "pending")) byAc.set(key, ref);
  }
  return byAc;
}

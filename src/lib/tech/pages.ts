import { prisma } from "@/lib/prisma";
import { getOrganisationName } from "@/lib/organisation";
import { syncOverdueMaintenanceWorkOrders, getTechnicianAssetList } from "@/lib/maintenance";
import { verifyTechnician } from "@/lib/tech/guards";
import { techJobInclude, toTechJobRow } from "@/lib/tech/job-rows";
import { formatUnitLocation } from "@/lib/location";
// The catalogue loader is the admin one. It answers to verifyAssetEditor now,
// so both roles read the same list through the same query.
import { getAcMasterData } from "@/lib/admin/master-data";

/**
 * One loader per technician page, matching what the admin side does.
 *
 * getTechnicianData() fetched all three job lists, the full asset list and the
 * building filter on every load, whichever tab was open. A technician looking
 * at their own two jobs was paying for 73 units and the pool as well.
 */

/** Sidebar, header and the building filter — shared by every technician page. */
export async function getTechShellData() {
  const session = await verifyTechnician();
  const techId = BigInt(session.user.id!);

  const [currentUser, organisationName, buildingRows, poolCount, myJobsCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: techId },
      select: {
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        phones: { where: { isPrimary: true }, select: { phoneNumber: true }, take: 1 },
      },
    }),
    getOrganisationName(),
    // Every building that has a unit in it, for the "ทุกอาคาร" filter. It used
    // to be derived from whichever job lists happened to be loaded, so a
    // building with no open work showed up in the dropdown only by accident.
    prisma.building.findMany({
      where: { rooms: { some: { airConditioners: { some: { deletedAt: null } } } } },
      select: { id: true, name: true, abbreviation: true },
      orderBy: { name: "asc" },
    }),
    prisma.workOrder.count({ where: { status: "pending" } }),
    prisma.workOrder.count({ where: { claimedBy: techId, status: "claimed" } }),
  ]);

  return {
    user: {
      id: session.user.id,
      name: currentUser?.name ?? session.user.name ?? "",
      email: currentUser?.email ?? session.user.email ?? "",
      role: currentUser?.role ?? session.user.role,
      // See the note in admin/pages.ts — the sidebar chip needs it too.
      avatarUrl: currentUser?.avatarUrl ?? null,
    },
    universityName: organisationName,
    profile: {
      name: currentUser?.name ?? session.user.name ?? "",
      email: currentUser?.email ?? session.user.email ?? "",
      role: currentUser?.role ?? session.user.role,
      phone: currentUser?.phones[0]?.phoneNumber ?? null,
      avatarUrl: currentUser?.avatarUrl ?? null,
    },
    buildings: buildingRows.map((b) => ({
      id: b.id.toString(),
      name: b.name,
      abbr: b.abbreviation,
    })),
    badges: { jobPool: poolCount, myJobs: myJobsCount },
  };
}

export async function getJobPoolPageData() {
  await verifyTechnician();
  // The pool is the one page that must see units that have just come due, so
  // the overdue check runs here rather than on every technician page.
  await syncOverdueMaintenanceWorkOrders();

  const rows = await prisma.workOrder.findMany({
    where: { status: "pending" },
    include: techJobInclude,
    orderBy: { createdAt: "desc" },
  });

  return {
    jobPool: rows.map((wo) => ({
      ...toTechJobRow(wo),
      createdAt: wo.createdAt ? wo.createdAt.toISOString() : null,
    })),
  };
}

export async function getMyJobsPageData() {
  const session = await verifyTechnician();
  const rows = await prisma.workOrder.findMany({
    where: { claimedBy: BigInt(session.user.id!), status: "claimed" },
    include: techJobInclude,
    orderBy: { claimedAt: "desc" },
  });

  return {
    myJobs: rows.map((wo) => ({
      ...toTechJobRow(wo),
      claimedAt: wo.claimedAt ? wo.claimedAt.toISOString() : null,
    })),
  };
}

export async function getHistoryPageData() {
  const session = await verifyTechnician();
  const rows = await prisma.workOrder.findMany({
    where: { claimedBy: BigInt(session.user.id!), status: "completed" },
    include: techJobInclude,
    orderBy: { completedAt: "desc" },
    take: 50,
  });

  return {
    completedJobs: rows.map((wo) => ({
      ...toTechJobRow(wo),
      completedAt: wo.completedAt ? wo.completedAt.toISOString() : null,
    })),
  };
}

export async function getTechAssetsPageData() {
  await verifyTechnician();
  await syncOverdueMaintenanceWorkOrders();
  // Rooms come from their own query rather than from the units: a technician
  // registering the first unit in a room could not pick a room that no unit
  // points at yet, which is exactly the room they are standing in.
  const [{ units, summary }, rooms] = await Promise.all([
    getTechnicianAssetList(),
    listRoomOptions(),
  ]);
  return { assetList: units, assetSummary: summary, rooms };
}

export interface RoomOption {
  id: string;
  label: string;
  buildingName: string;
}

async function listRoomOptions(): Promise<RoomOption[]> {
  const buildings = await prisma.building.findMany({
    select: {
      name: true,
      abbreviation: true,
      rooms: { select: { id: true, name: true, floor: true } },
    },
  });

  return buildings
    .flatMap((building) =>
      building.rooms.map((room) => ({
        id: room.id.toString(),
        // Everything the picker searches on lives in the label, so typing a
        // building abbreviation, a floor or a room number all narrow the list.
        label: `${building.name} · ${room.floor === null ? "ไม่ระบุชั้น" : `ชั้น ${room.floor}`} · ห้อง ${room.name}`,
        buildingName: building.name,
        sortKey: [building.name, room.floor ?? 9999, room.name] as const,
      }))
    )
    // Sorted here rather than by the database: the names are Thai, and MariaDB's
    // utf8mb4_unicode_ci puts words starting with a leading vowel at the end.
    // localeCompare with "th" is the same comparison the rest of the UI uses.
    .sort((a, b) => {
      const byBuilding = a.sortKey[0].localeCompare(b.sortKey[0], "th");
      if (byBuilding !== 0) return byBuilding;
      if (a.sortKey[1] !== b.sortKey[1]) return Number(a.sortKey[1]) - Number(b.sortKey[1]);
      return String(a.sortKey[2]).localeCompare(String(b.sortKey[2]), "th");
    })
    .map(({ id, label, buildingName }) => ({ id, label, buildingName }));
}

/**
 * The brand/model catalogue as the technician page sees it.
 *
 * verifyTechnician first so this page is refused to an admin the way every
 * other /tech loader is — they have their own richer page at
 * /admin/master-data, with the trash bin this one deliberately lacks.
 */
export async function getTechCataloguePageData() {
  await verifyTechnician();
  return getAcMasterData();
}

/** One thing the header search box can jump to. */
export interface SearchIndexEntry {
  type: "unit";
  id: string;
  /** The line the suggestion is titled with, and the first thing matched. */
  label: string;
  /** The line under it — matched too, so a building name finds its units. */
  hint: string;
}

/**
 * Everything the technician's search box can offer, fetched once.
 *
 * Pulled whole and filtered in the browser rather than queried per keystroke.
 * A per-keystroke query would need Prisma's `contains`, and `contains` is not
 * the same comparison on both engines — MySQL's utf8mb4_unicode_ci ignores
 * case, PostgreSQL's LIKE does not — so the box would quietly start behaving
 * differently after the database move. Nothing in src/ uses it today, and that
 * is what made the move mechanical; this keeps it that way.
 *
 * Only what a suggestion needs is selected. At the current 73 units the payload
 * is a few KB. Past a few thousand this stops being sensible and the box has to
 * become a debounced server query — see the note in HANDOFF.md.
 */
export async function getTechSearchIndex(): Promise<SearchIndexEntry[]> {
  await verifyTechnician();

  const units = await prisma.airConditioner.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      acCode: true,
      brand: true,
      acBrand: { select: { name: true } },
      acModel: { select: { name: true } },
      room: {
        select: { name: true, floor: true, building: { select: { name: true, abbreviation: true } } },
      },
    },
  });

  return units.map((unit) => ({
    type: "unit" as const,
    id: unit.id.toString(),
    label: unit.acCode,
    // Brand and place on one line: typing a building name, a room number or a
    // brand all reach the same unit, which is how people actually describe the
    // machine they are standing in front of.
    hint: [unit.acBrand?.name ?? unit.brand, unit.acModel?.name, formatUnitLocation(unit.room)]
      .filter(Boolean)
      .join(" · "),
  }));
}

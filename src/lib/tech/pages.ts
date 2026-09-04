import { prisma } from "@/lib/prisma";
import { getOrganisationName } from "@/lib/organisation";
import { syncOverdueMaintenanceWorkOrders, getTechnicianAssetList } from "@/lib/maintenance";
import { verifyTechnician } from "@/lib/tech/guards";
import { techJobInclude, toTechJobRow } from "@/lib/tech/job-rows";

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
  const { units, summary } = await getTechnicianAssetList();
  return { assetList: units, assetSummary: summary };
}

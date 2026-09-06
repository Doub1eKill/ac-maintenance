import { prisma } from "@/lib/prisma";
import { format, subDays } from "date-fns";
import { verifyOrgAdmin } from "@/lib/auth-guards";
import { syncOverdueMaintenanceWorkOrders } from "@/lib/maintenance";
import { getOrganisationName, getOrganisationInfo, getDefaultMaintenanceFrequency } from "@/lib/organisation";
import { getAcMasterData } from "@/lib/admin/master-data";
import {
  WORK_ORDER_PAGE_SIZE,
  WORK_ORDER_BOARD_LIMIT,
  workOrderBoardSelect,
  workOrderBoardOrderBy,
  toWorkOrderBoardRow,
} from "@/lib/admin/work-order-board";
import {
  buildingTreeSelect,
  shapeBuildingTree,
  flattenUnitOptions,
  getBuildingTree,
  getPendingJobsByAcId,
} from "@/lib/admin/asset-tree";

/**
 * One loader per admin page.
 *
 * The dashboard used to be a single route with nine tabs switched by useState,
 * fed by one getOrgAdminData() that fetched everything any tab might want:
 * nine queries and roughly 437 rows on every visit, including all 189 AC models
 * that only the settings tab reads. Opening the approvals list — five pending
 * users — paid for the entire asset tree.
 *
 * Each page now asks for its own data, so the cost of a page is the cost of
 * what it shows. Several of these are two or three queries; the approvals page
 * is one.
 */

// Shared by every page: who is signed in and what the sidebar badges say.
// Deliberately small — it runs on every navigation.
export async function getAdminShellData() {
  const session = await verifyOrgAdmin();

  const [currentUser, organisationName, pendingWorkOrders, pendingUsersCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: BigInt(session.user.id!) },
      select: {
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        phones: { where: { isPrimary: true }, select: { phoneNumber: true }, take: 1 },
      },
    }),
    getOrganisationName(),
    prisma.workOrder.count({ where: { status: "pending" } }),
    prisma.user.count({ where: { status: "pending" } }),
  ]);

  return {
    user: {
      id: session.user.id,
      name: currentUser?.name ?? session.user.name ?? "",
      email: currentUser?.email ?? session.user.email ?? "",
      role: currentUser?.role ?? session.user.role,
      // Also on `user`, not only on `profile`: the sidebar chip draws an
      // avatar too, and leaving it on initials after an upload reads as the
      // upload having failed.
      avatarUrl: currentUser?.avatarUrl ?? null,
    },
    universityName: organisationName,
    profile: {
      name: currentUser?.name ?? session.user.name ?? "",
      email: currentUser?.email ?? session.user.email ?? "",
      role: currentUser?.role ?? session.user.role,
      phone: currentUser?.phones[0]?.phoneNumber ?? null,
      // null means the account has never set a picture — the profile card
      // renders the user's initials in that case.
      avatarUrl: currentUser?.avatarUrl ?? null,
    },
    badges: { pendingWorkOrders, pendingUsers: pendingUsersCount },
  };
}

/** Technicians who can be assigned work — needed by both modals. */
async function getActiveTechnicians() {
  const rows = await prisma.user.findMany({
    where: { role: "technician", status: "active" },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
    orderBy: { name: "asc" },
  });
  return rows.map((u) => ({
    id: u.id.toString(),
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt ? u.createdAt.toISOString() : null,
  }));
}

export async function getAdminOverviewData() {
  await verifyOrgAdmin();
  await syncOverdueMaintenanceWorkOrders();

  const [buildingRows, pendingJobs, workOrdersRaw, logsLast7Days, activeTechsCount, activeTechnicians] =
    await Promise.all([
      prisma.building.findMany({ select: buildingTreeSelect, orderBy: { name: "asc" } }),
      getPendingJobsByAcId(),
      prisma.workOrder.findMany({
        select: workOrderBoardSelect,
        orderBy: workOrderBoardOrderBy,
        take: WORK_ORDER_PAGE_SIZE,
      }),
      prisma.maintenanceLog.findMany({
        where: { performedAt: { gte: subDays(new Date(), 7) } },
        select: { performedAt: true },
      }),
      prisma.user.count({ where: { role: "technician", status: "active" } }),
      getActiveTechnicians(),
    ]);

  const { buildings, urgentUnits, unitCounts } = shapeBuildingTree(buildingRows, pendingJobs);

  const weeklyActivity = Array.from({ length: 7 }).map((_, i) => ({
    day: format(subDays(new Date(), 6 - i), "EEE"),
    repairs: 0,
  }));
  logsLast7Days.forEach((log) => {
    const day = weeklyActivity.find((d) => d.day === format(log.performedAt, "EEE"));
    if (day) day.repairs += 1;
  });

  return {
    metrics: {
      ...unitCounts,
      pendingWorkOrders: pendingJobs.size,
      activeTechsCount,
    },
    weeklyActivity,
    urgentUnits,
    buildings,
    workOrders: workOrdersRaw.map(toWorkOrderBoardRow),
    allAcUnits: flattenUnitOptions(buildings),
    activeTechnicians,
  };
}

export async function getWorkOrdersPageData() {
  await verifyOrgAdmin();
  await syncOverdueMaintenanceWorkOrders();

  // No building tree here any more. It was loaded solely to fill the board's
  // "ทุกอาคาร" dropdown, and the board groups by building instead now — the
  // rows carry their own building, so the whole building→room→unit query goes
  // away with the dropdown that needed it.
  const [rows, total, activeTechnicians] = await Promise.all([
    prisma.workOrder.findMany({
      select: workOrderBoardSelect,
      orderBy: workOrderBoardOrderBy,
      // The whole board, not a page of it: it groups by building, and a group
      // assembled from fifty of the table's rows would be missing whatever
      // landed on the next page. See WORK_ORDER_BOARD_LIMIT for the ceiling.
      take: WORK_ORDER_BOARD_LIMIT,
    }),
    prisma.workOrder.count(),
    getActiveTechnicians(),
  ]);

  const workOrders = rows.map(toWorkOrderBoardRow);

  return {
    workOrders,
    workOrderPage: {
      total,
      loaded: workOrders.length,
      hasMore: total > workOrders.length,
    },
    activeTechnicians,
  };
}

function toUserRow(u: {
  id: bigint;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: Date | null;
}) {
  return {
    id: u.id.toString(),
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt ? u.createdAt.toISOString() : null,
  };
}

const userListSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
} as const;

/** One query. The old dashboard loaded the whole asset tree to render this. */
export async function getApprovalsPageData() {
  await verifyOrgAdmin();
  const rows = await prisma.user.findMany({
    where: { status: "pending" },
    select: userListSelect,
    orderBy: { createdAt: "desc" },
  });
  return { pendingUsers: rows.map(toUserRow) };
}

export async function getTeamPageData() {
  await verifyOrgAdmin();
  const rows = await prisma.user.findMany({
    select: userListSelect,
    orderBy: { createdAt: "desc" },
  });
  return { allUsers: rows.map(toUserRow) };
}

export async function getAssetsPageData() {
  await verifyOrgAdmin();
  const [buildings, brandsRaw] = await Promise.all([
    getBuildingTree(),
    prisma.acBrand.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        models: {
          where: { deletedAt: null },
          select: { id: true, name: true, defaultBtu: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  // Ids stringified because the register-AC form's <select> hands back a
  // string: a BigInt id here never matched the selected value, leaving the
  // model dropdown empty and — with the field required — no way to add a unit.
  const brands = brandsRaw.map((b) => ({
    id: b.id.toString(),
    name: b.name,
    models: b.models.map((m) => ({
      id: m.id.toString(),
      name: m.name,
      defaultBtu: m.defaultBtu,
    })),
  }));

  return { buildings, brands };
}

export async function getQrCodesPageData() {
  await verifyOrgAdmin();
  return { buildings: await getBuildingTree() };
}

/** The calendar fetches its own schedules; this is only what its modal needs. */
export async function getCalendarPageData() {
  await verifyOrgAdmin();
  const [buildings, activeTechnicians] = await Promise.all([
    getBuildingTree(),
    getActiveTechnicians(),
  ]);
  return { buildings, allAcUnits: flattenUnitOptions(buildings), activeTechnicians };
}

export async function getSettingsPageData() {
  await verifyOrgAdmin();
  const [{ brands }, organisationInfo, defaultFrequency] = await Promise.all([
    getAcMasterData(),
    getOrganisationInfo(),
    getDefaultMaintenanceFrequency(),
  ]);
  return { masterDataBrands: brands, organisationInfo, defaultFrequency };
}

/**
 * The lists the create-work-order modal needs, loaded when it opens rather than
 * on every page.
 *
 * The "สร้างใบงานซ่อมบำรุง" button sits in the header, so it is present on all
 * nine pages, but the modal behind it needs the full unit list and the roster of
 * technicians. Loading those with the shell would put the heaviest query in the
 * app back on every navigation — exactly what splitting the dashboard was meant
 * to stop — so the modal asks for them the first time it is opened.
 */
export async function getCreateWorkOrderFormData() {
  await verifyOrgAdmin();
  const [buildings, activeTechnicians] = await Promise.all([
    getBuildingTree(),
    getActiveTechnicians(),
  ]);
  return { buildings, allAcUnits: flattenUnitOptions(buildings), activeTechnicians };
}

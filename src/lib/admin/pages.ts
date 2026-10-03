import { prisma } from "@/lib/prisma";
import { formatUnitLocation } from "@/lib/location";
import type { SearchEntry } from "@/lib/search";
import { verifyOrgAdmin } from "@/lib/auth-guards";
import { isOnline } from "@/lib/presence";
import { syncOverdueMaintenanceWorkOrders } from "@/lib/maintenance";
import { getOrganisationName, getOrganisationInfo, getDefaultMaintenanceFrequency } from "@/lib/organisation";
import { getAcMasterData } from "@/lib/admin/master-data";
import {
  WORK_ORDER_BOARD_LIMIT,
  workOrderBoardSelect,
  workOrderBoardOrderBy,
  toWorkOrderBoardRow,
} from "@/lib/admin/work-order-board";
import { getWorkOrderStats } from "@/lib/admin/work-order-stats";
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

/**
 * Technicians who can be assigned work — needed by both modals.
 *
 * Shares userListSelect and toUserRow with the team and approvals lists rather
 * than spelling the same fields out again: the three had already drifted once,
 * when the team page started needing avatar_url and this one did not grow it.
 */
async function getActiveTechnicians() {
  const rows = await prisma.user.findMany({
    where: { role: "technician", status: "active" },
    select: userListSelect,
    orderBy: { name: "asc" },
  });
  return rows.map(toUserRow);
}

export async function getAdminOverviewData() {
  await verifyOrgAdmin();
  await syncOverdueMaintenanceWorkOrders();

  // The analytics donut is fed an aggregate over every work order, not the
  // board's first page: fifty rows made "รวมทั้งหมด" read 50 whatever the
  // table held. Nothing else on the overview needed the rows.
  const [buildingRows, pendingJobs, workOrderStats, activeTechsCount, activeTechnicians] =
    await Promise.all([
      prisma.building.findMany({ select: buildingTreeSelect, orderBy: { name: "asc" } }),
      getPendingJobsByAcId(),
      getWorkOrderStats(),
      prisma.user.count({ where: { role: "technician", status: "active" } }),
      getActiveTechnicians(),
    ]);

  const { buildings, urgentUnits, unitCounts } = shapeBuildingTree(buildingRows, pendingJobs);

  return {
    metrics: {
      ...unitCounts,
      // The map now also carries claimed jobs (so the urgent rows can name
      // who holds them); the badge still counts only the ones still waiting.
      pendingWorkOrders: [...pendingJobs.values()].filter((j) => j.status === "pending").length,
      activeTechsCount,
    },
    urgentUnits,
    buildings,
    workOrderStats,
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
  avatarUrl: string | null;
  createdAt: Date | null;
  lastSeenAt: Date | null;
  signedOutAt: Date | null;
}) {
  return {
    id: u.id.toString(),
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    avatarUrl: u.avatarUrl,
    createdAt: u.createdAt ? u.createdAt.toISOString() : null,
    // Decided here rather than sent as timestamps, so the browser's clock and
    // time zone never enter into it. The team page then keeps it current
    // through /api/presence.
    online: isOnline(u),
  };
}

const userListSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  // The team page leads with the photo now. Phone numbers stay out: they live
  // one query away in user_phones and only the detail panel shows them, so
  // fetching them for forty people to render none of them is wasted work.
  avatarUrl: true,
  createdAt: true,
  // For the Online/Offline badge (lib/presence.ts).
  lastSeenAt: true,
  signedOutAt: true,
} as const;

/** One query. The old dashboard loaded the whole asset tree to render this. */
export async function getApprovalsPageData() {
  await verifyOrgAdmin();
  const rows = await prisma.user.findMany({
    where: { status: "pending" },
    // Phones are fetched here and not in userListSelect, because this is the
    // one list that shows them: approving an account means reading back
    // everything the person typed at registration, and the phone is part of
    // that. The team directory shows forty people and none of their numbers.
    select: { ...userListSelect, phones: { select: { phoneNumber: true, isPrimary: true } } },
    orderBy: { createdAt: "desc" },
  });

  return {
    pendingUsers: rows.map((row) => ({
      ...toUserRow(row),
      // The primary number, falling back to whichever exists — registration
      // only ever writes one, but an account edited afterwards can have more.
      phone: (row.phones.find((p) => p.isPrimary) ?? row.phones[0])?.phoneNumber ?? null,
    })),
  };
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

/**
 * Everything the admin header search box can jump to.
 *
 * The admin's version of getTechSearchIndex, and it works the same way: fetched
 * once on first focus and filtered in the browser, so no Prisma `contains` is
 * needed. See the note there for why that matters to the PostgreSQL move.
 *
 * Open work orders and people are the two kinds only an admin sees. Both are
 * bounded — completed work orders are excluded, since "find that job" almost
 * always means one that is still open — but this is the part of the index most
 * likely to outgrow the fetch-it-all approach.
 */
export async function getAdminSearchIndex(): Promise<SearchEntry[]> {
  await verifyOrgAdmin();

  const [units, buildings, brands, openWorkOrders, people] = await Promise.all([
    prisma.airConditioner.findMany({
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
    }),
    prisma.building.findMany({
      select: {
        id: true,
        name: true,
        abbreviation: true,
        rooms: {
          select: { id: true, name: true, floor: true, _count: { select: { airConditioners: true } } },
        },
      },
    }),
    prisma.acBrand.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        models: { where: { deletedAt: null }, select: { id: true, name: true, defaultBtu: true } },
      },
    }),
    prisma.workOrder.findMany({
      // Open orders only. This was `not: "completed"`, which also took every
      // cancelled order — listed in the omnibox as "กำลังดำเนินการ", since the
      // label below only tells pending from the rest, and growing without end.
      where: { status: { in: ["pending", "claimed"] } },
      select: {
        id: true,
        status: true,
        type: true,
        airConditioner: {
          select: {
            acCode: true,
            room: {
              select: { name: true, floor: true, building: { select: { name: true, abbreviation: true } } },
            },
          },
        },
      },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, status: true },
    }),
  ]);

  const entries: SearchEntry[] = [];

  for (const unit of units) {
    entries.push({
      type: "unit",
      id: unit.id.toString(),
      label: unit.acCode,
      hint: [unit.acBrand?.name ?? unit.brand, unit.acModel?.name, formatUnitLocation(unit.room)]
        .filter(Boolean)
        .join(" · "),
      href: `/admin/assets?q=${encodeURIComponent(unit.acCode)}`,
    });
  }

  for (const workOrder of openWorkOrders) {
    entries.push({
      type: "workOrder",
      id: workOrder.id.toString(),
      label: workOrder.airConditioner.acCode,
      hint: [
        workOrder.type === "repair" ? "งานซ่อม" : "งานล้าง",
        workOrder.status === "pending" ? "รอรับงาน" : "กำลังดำเนินการ",
        formatUnitLocation(workOrder.airConditioner.room),
      ].join(" · "),
      href: `/admin/work-orders?q=${encodeURIComponent(workOrder.airConditioner.acCode)}`,
    });
  }

  for (const building of buildings) {
    const unitCount = building.rooms.reduce((sum, room) => sum + room._count.airConditioners, 0);
    entries.push({
      type: "building",
      id: building.id.toString(),
      label: building.name,
      hint: `${building.abbreviation} · ${building.rooms.length} ห้อง · ${unitCount} เครื่อง`,
      href: `/admin/assets?q=${encodeURIComponent(building.name)}`,
    });

    for (const room of building.rooms) {
      entries.push({
        type: "room",
        id: room.id.toString(),
        label: `ห้อง ${room.name}`,
        hint: `${building.name} · ${room.floor === null ? "ไม่ระบุชั้น" : `ชั้น ${room.floor}`} · ${room._count.airConditioners} เครื่อง`,
        href: `/admin/assets?q=${encodeURIComponent(room.name)}`,
      });
    }
  }

  for (const brand of brands) {
    for (const model of brand.models) {
      entries.push({
        type: "model",
        id: model.id.toString(),
        label: model.name,
        hint: [brand.name, model.defaultBtu ? `${model.defaultBtu.toLocaleString()} BTU` : null]
          .filter(Boolean)
          .join(" · "),
        href: "/admin/master-data",
      });
    }
  }

  for (const person of people) {
    entries.push({
      type: "user",
      id: person.id.toString(),
      label: person.name,
      hint: [
        person.email,
        person.role === "org_admin" ? "ผู้ดูแลระบบ" : "ช่างเทคนิค",
        person.status === "active" ? null : "รออนุมัติ",
      ]
        .filter(Boolean)
        .join(" · "),
      // Pending accounts live on the approvals page, not the team list.
      href:
        person.status === "active"
          ? `/admin/team?q=${encodeURIComponent(person.name)}`
          : "/admin/approvals",
    });
  }

  return entries;
}

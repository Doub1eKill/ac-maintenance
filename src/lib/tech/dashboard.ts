import { prisma } from "@/lib/prisma";
import { getOrganisationName } from "@/lib/organisation";
import { syncOverdueMaintenanceWorkOrders, getTechnicianAssetList } from "@/lib/maintenance";
import { verifyTechnician } from "@/lib/tech/guards";
import { techJobInclude, toTechJobRow } from "@/lib/tech/job-rows";

// Everything the technician workspace renders on first load, in one round of
// queries. Split out of app/tech/actions.ts, which had grown to hold this
// alongside every write action, following the same split the admin side made in
// August: the implementation lives in a plain module and actions.ts is the only
// file that exposes it.
export async function getTechnicianData() {
  const session = await verifyTechnician();
  const techId = BigInt(session.user.id!);

  try {
    await syncOverdueMaintenanceWorkOrders();

    const [pendingOrdersRaw, myJobsRaw, completedJobsRaw, assetListResult, organisationName, currentUser] = await Promise.all([
      prisma.workOrder.findMany({
        where: { status: "pending" },
        include: techJobInclude,
        orderBy: { createdAt: "desc" },
      }),
      prisma.workOrder.findMany({
        where: { claimedBy: techId, status: "claimed" },
        include: techJobInclude,
        orderBy: { claimedAt: "desc" },
      }),
      prisma.workOrder.findMany({
        where: { claimedBy: techId, status: "completed" },
        include: techJobInclude,
        orderBy: { completedAt: "desc" },
        take: 50,
      }),
      getTechnicianAssetList(),
      getOrganisationName(),
      // The signed-in technician's own profile, read from the database rather
      // than taken from the session, for the same reason getOrgAdminData()
      // does it: the session is a JWT minted at sign-in, so a name changed
      // through updateProfileAction would keep showing the old value until the
      // next login. Runs alongside the queries above rather than after them,
      // so the profile costs no extra round trip.
      prisma.user.findUnique({
        where: { id: techId },
        select: {
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
          phones: {
            where: { isPrimary: true },
            select: { phoneNumber: true },
            take: 1,
          },
        },
      }),
    ]);

    // Building broken out alongside the combined `location` string on all
    // The three lists differ only in which date the card shows, so that is all
    // each one adds. Everything else comes from toTechJobRow — see
    // lib/tech/job-rows.ts for why these are no longer written out three times.
    const jobPool = pendingOrdersRaw.map((wo) => ({
      ...toTechJobRow(wo),
      createdAt: wo.createdAt ? wo.createdAt.toISOString() : null,
    }));

    const myJobs = myJobsRaw.map((wo) => ({
      ...toTechJobRow(wo),
      claimedAt: wo.claimedAt ? wo.claimedAt.toISOString() : null,
    }));

    const completedJobs = completedJobsRaw.map((wo) => ({
      ...toTechJobRow(wo),
      completedAt: wo.completedAt ? wo.completedAt.toISOString() : null,
    }));

    // Extract unique buildings for the filter
    const buildingsMap = new Map();
    [...pendingOrdersRaw, ...myJobsRaw, ...completedJobsRaw].forEach(wo => {
      const bldg = wo.airConditioner.room.building;
      buildingsMap.set(bldg.id.toString(), { id: bldg.id.toString(), name: bldg.name, abbr: bldg.abbreviation });
    });
    const buildings = Array.from(buildingsMap.values());

    return {
      dbError: null,
      universityName: organisationName,
      // Same shape as getOrgAdminData().profile, deliberately — ProfilePanel is
      // shared between the two dashboards, so anything that differs here would
      // have to be special-cased there. Falls back to the session only if the
      // row somehow can't be read.
      profile: {
        name: currentUser?.name ?? session.user.name ?? "",
        email: currentUser?.email ?? session.user.email ?? "",
        role: currentUser?.role ?? session.user.role,
        phone: currentUser?.phones[0]?.phoneNumber ?? null,
        avatarUrl: currentUser?.avatarUrl ?? null,
      },
      jobPool,
      myJobs,
      completedJobs,
      buildings,
      assetList: assetListResult.units,
      assetSummary: assetListResult.summary,
    };
  } catch (error) {
    console.error("Technician Data query failed:", error);
    return {
      dbError: "ไม่สามารถเชื่อมต่อฐานข้อมูล MariaDB/MySQL ได้ (Connection Pool Timeout) - กรุณาตรวจสอบว่าเซิร์ฟเวอร์ MySQL บนพอร์ต 3307 เปิดใช้งานอยู่ และเรียกใช้ 'npx tsx prisma/seed.ts'",
      universityName: await getOrganisationName(),
      // Session-only fallback: the database is unreachable on this path, so the
      // profile card still renders with whatever the JWT carries. Without this
      // the shared ProfilePanel would receive undefined and crash the whole
      // technician page on a DB outage, while the admin one degrades cleanly.
      profile: {
        name: session.user.name ?? "",
        email: session.user.email ?? "",
        role: session.user.role,
        phone: null,
        avatarUrl: null,
      },
      jobPool: [],
      myJobs: [],
      completedJobs: [],
      buildings: [],
      assetList: [],
      assetSummary: { total: 0, cleaningJobs: 0, repairJobs: 0 },
    };
  }
}

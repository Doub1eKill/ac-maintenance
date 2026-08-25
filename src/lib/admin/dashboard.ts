// Everything the org admin dashboard renders on first load, in one query batch.
//
// A plain module rather than a "use server" one: src/app/admin/actions.ts is
// the only file that exposes these to the client, so the server action surface
// stays in one place instead of being spread across every module that happens
// to hold an implementation.

import { prisma } from "@/lib/prisma";
import type { WorkOrderType as MaintenanceJobType } from "@/generated/prisma/enums";
import { compareJobOrder, syncOverdueMaintenanceWorkOrders } from "@/lib/maintenance";
import { getOrganisationName } from "@/lib/organisation";
import { format, subDays } from "date-fns";
import { verifyOrgAdmin } from "@/lib/auth-guards";
import {
  WORK_ORDER_PAGE_SIZE,
  workOrderBoardSelect,
  workOrderBoardOrderBy,
  toWorkOrderBoardRow,
} from "@/lib/admin/work-order-board";

export async function getOrgAdminData() {
  const session = await verifyOrgAdmin();

  try {
    await syncOverdueMaintenanceWorkOrders();

    const [
      buildings,
      workOrdersRaw,
      techsRaw,
      allUsersRaw,
      maintenanceLogsRaw,
      brandsRaw,
      totalWorkOrders,
      pendingWorkOrders,
      currentUser,
      organisationName,
    ] = await Promise.all([
      // This is the widest query on the page — every building, room and unit.
      // `include` pulled full rows plus full acBrand, acModel and
      // maintenanceSchedules records; the shaping below uses a handful of
      // columns, so select exactly those.
      prisma.building.findMany({
        select: {
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
                  acBrand: { select: { name: true } },
                  acModel: { select: { name: true } },
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
        },
        orderBy: { name: "asc" },
      }),
      // Page one. getWorkOrdersPage() serves the rest from the same shape.
      prisma.workOrder.findMany({
        select: workOrderBoardSelect,
        orderBy: workOrderBoardOrderBy,
        take: WORK_ORDER_PAGE_SIZE,
      }),
      prisma.user.findMany({
        where: { role: "technician", status: "active" },
        select: { id: true, name: true, email: true },
      }),
      // One query for every user; the pending-approval list is just a filter
      // over this (it used to be a second, redundant query). Explicit select
      // so the password hash never leaves the database.
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.maintenanceLog.findMany({
        where: { performedAt: { gte: subDays(new Date(), 7) } },
        // Only performedAt is used (to bucket the weekly activity chart).
        select: { performedAt: true },
      }),
      prisma.acBrand.findMany({
        select: {
          id: true,
          name: true,
          models: {
            select: { id: true, name: true, defaultBtu: true },
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      }),
      // Counted in SQL, not derived from workOrdersRaw: that list is capped at
      // WORK_ORDER_PAGE_SIZE, so counting pending inside it under-reports as
      // soon as there are more work orders than one page.
      prisma.workOrder.count(),
      prisma.workOrder.count({ where: { status: "pending" } }),
      // The signed-in admin's own profile, read from the database rather than
      // taken from the session. The session is a JWT minted at sign-in, so a
      // name changed through updateProfileAction would keep showing the old
      // value until the next login — this row is always current.
      prisma.user.findUnique({
        where: { id: BigInt(session.user.id) },
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
      // Joins the same batch rather than adding a round trip of its own.
      getOrganisationName(),
    ]);

    // Aggregate metrics
    let totalUnits = 0;
    let brokenOrCleaningUnits = 0;
    let repairUnits = 0;
    let cleaningUnits = 0;

    // Pending work orders keyed by unit, so the urgent list below can show
    // priority/issue text alongside each broken or overdue-for-cleaning unit.
    const pendingWorkOrderByAcId = new Map(
      workOrdersRaw
        .filter((wo) => wo.status === "pending")
        .map((wo) => [wo.airConditionerId.toString(), wo])
    );

    // Urgent list (backlog #6): broken + overdue-for-cleaning units, shaped
    // location-first to match the Technician card layout (backlog #2).
    const urgentUnits: Array<{
      id: string;
      acCode: string;
      location: string;
      brand: string;
      model: string | null;
      btu: number | null;
      status: string;
      buildingName: string;
      type: MaintenanceJobType;
      workOrderId: string | null;
      priority: string | null;
      issueDescription: string | null;
      reportedAt: string | null;
    }> = [];

    const buildingList = buildings.map((b) => {
      let bldgUnits = 0;
      const roomList = b.rooms.map((r) => {
        bldgUnits += r.airConditioners.length;
        totalUnits += r.airConditioners.length;
        r.airConditioners.forEach((ac) => {
          if (ac.status === "broken" || ac.status === "needs_cleaning") {
            brokenOrCleaningUnits += 1;
            if (ac.status === "broken") repairUnits += 1;
            else cleaningUnits += 1;

            const pendingWo = pendingWorkOrderByAcId.get(ac.id.toString());
            urgentUnits.push({
              id: ac.id.toString(),
              acCode: ac.acCode,
              location: `${b.name} - ห้อง ${r.name}`,
              brand: ac.acBrand?.name || ac.brand || "ไม่ระบุ",
              model: ac.acModel?.name || ac.model || null,
              btu: ac.btu,
              status: ac.status,
              buildingName: b.name,
              // What the open job was raised for. A unit flagged as needing
              // attention without an open job still has to sort somewhere, and
              // its own condition is all that is left to place it by.
              type: pendingWo?.type ?? (ac.status === "broken" ? "repair" : "cleaning"),
              // The open job behind this unit, or null when it has none. The
              // urgent list ticks units but assignment happens on a job, so the
              // board needs this to know which rows it can actually send to
              // bulkAssignWorkOrdersAction.
              workOrderId: pendingWo?.id.toString() ?? null,
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
            const activeSchedule = ac.maintenanceSchedules?.find(s => s.isActive);
            return {
              id: ac.id.toString(),
              acCode: ac.acCode,
              brand: ac.acBrand?.name || ac.brand || "ไม่ระบุ",
              model: ac.acModel?.name || ac.model || null,
              btu: ac.btu,
              status: ac.status,
              qrCode: ac.qrCode,
              maintenanceSchedule: activeSchedule ? {
                frequencyValue: activeSchedule.frequencyValue,
                frequencyUnit: activeSchedule.frequencyUnit,
                nextDueDate: activeSchedule.nextDueDate.toISOString()
              } : null
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

    const workOrders = workOrdersRaw.map(toWorkOrderBoardRow);

    const allUsers = allUsersRaw.map((u) => ({
      id: u.id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt ? u.createdAt.toISOString() : null,
    }));

    // Same rows, same createdAt-desc order as the old dedicated query.
    const pendingUsers = allUsers.filter((u) => u.status === "pending");

    // Ids stringified like every other list here. This was the one value
    // returned straight off Prisma, and it broke the register-AC form: the
    // brand <select> hands back a string, so `brands.find(b => b.id ===
    // selectedBrandId)` never matched a BigInt id and the model dropdown
    // stayed empty — with the field marked required, no unit could be added.
    const brands = brandsRaw.map((b) => ({
      id: b.id.toString(),
      name: b.name,
      models: b.models.map((m) => ({
        id: m.id.toString(),
        name: m.name,
        defaultBtu: m.defaultBtu,
      })),
    }));

    // Flatten AC list for Create Work Order dropdown
    const allAcUnits: Array<{ id: string; label: string }> = [];
    buildingList.forEach((b) => {
      b.rooms.forEach((r) => {
        r.acUnits.forEach((ac) => {
          allAcUnits.push({
            id: ac.id,
            label: `${ac.acCode} - ${b.name} ห้อง ${r.name} (${ac.brand})`,
          });
        });
      });
    });

    const weeklyActivity = Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dayStr = format(date, "EEE");
      return {
        day: dayStr,
        repairs: 0,
      };
    });

    // We already fetched maintenanceLogsRaw from the last 7 days

    maintenanceLogsRaw.forEach(log => {
      const dayStr = format(log.performedAt, "EEE");
      const activityDay = weeklyActivity.find(d => d.day === dayStr);
      if (activityDay) {
        activityDay.repairs += 1;
      }
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
      dbError: null,
      // Still the university's name, just no longer a per-tenant lookup —
      // the field keeps its name so the UI reading it needs no change.
      universityName: organisationName,
      // Everything the profile card needs, in one place. Falls back to the
      // session values only if the row somehow can't be read.
      profile: {
        name: currentUser?.name ?? session.user.name ?? "",
        email: currentUser?.email ?? session.user.email ?? "",
        role: currentUser?.role ?? session.user.role,
        phone: currentUser?.phones[0]?.phoneNumber ?? null,
        // null means the account has never set a picture — the profile card
        // renders the user's initials in that case, so this is displayable as
        // it stands and needs no placeholder from here.
        avatarUrl: currentUser?.avatarUrl ?? null,
      },
      metrics: {
        totalUnits,
        brokenOrCleaningUnits,
        repairUnits,
        cleaningUnits,
        pendingWorkOrders,
        activeTechsCount: techsRaw.length,
        pendingUsersCount: pendingUsers.length,
      },
      weeklyActivity,
      workOrders,
      workOrderPage: {
        total: totalWorkOrders,
        pageSize: WORK_ORDER_PAGE_SIZE,
        loaded: workOrders.length,
        hasMore: totalWorkOrders > workOrders.length,
      },
      urgentUnits,
      buildings: buildingList,
      allAcUnits,
      pendingUsers,
      allUsers,
      brands,
    };
  } catch (error) {
    console.error("Org Admin Data query failed:", error);
    return {
      dbError: "ไม่สามารถเชื่อมต่อฐานข้อมูล MariaDB/MySQL ได้ (Connection Pool Timeout) - กรุณาตรวจสอบว่าเซิร์ฟเวอร์ MySQL บนพอร์ต 3307 เปิดใช้งานอยู่ และเรียกใช้ 'npx tsx prisma/seed.ts'",
      universityName: await getOrganisationName(),
      // Session-only fallback: the database is unreachable on this path, so
      // the card still renders with whatever the JWT carries.
      profile: {
        name: session.user.name ?? "",
        email: session.user.email ?? "",
        role: session.user.role,
        phone: null,
        avatarUrl: null,
      },
      metrics: {
        totalUnits: 0,
        brokenOrCleaningUnits: 0,
        repairUnits: 0,
        cleaningUnits: 0,
        pendingWorkOrders: 0,
        activeTechsCount: 0,
        pendingUsersCount: 0,
      },
      weeklyActivity: [],
      workOrders: [],
      workOrderPage: { total: 0, pageSize: WORK_ORDER_PAGE_SIZE, loaded: 0, hasMore: false },
      urgentUnits: [],
      buildings: [],
      allAcUnits: [],
      pendingUsers: [],
      allUsers: [],
    };
  }
}

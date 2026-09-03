"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit, logAuditMany } from "@/lib/audit";
import {
  syncOverdueMaintenanceWorkOrders,
  getTechnicianAssetList,
  businessDateToday,
  addMaintenanceInterval,
} from "@/lib/maintenance";
import { MaintenanceAction } from "@/generated/prisma/client";
import { getOrganisationName } from "@/lib/organisation";
import { withDeadlockRetry } from "@/lib/db-retry";
import { saveUpload } from "@/lib/upload";
import { catalogueFlags } from "@/lib/catalogue-status";
import { formatUnitLocation } from "@/lib/location";
import { techJobInclude, toTechJobRow } from "@/lib/tech/job-rows";

async function verifyTechnician() {
  const session = await auth();
  if (!session?.user || session.user.role !== "technician") {
    throw new Error("Unauthorized: Technician access required");
  }
  return session;
}

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

export async function claimWorkOrderAction(workOrderId: string) {
  // Delegates to the atomic bulk-claim path (status=pending guarded update)
  // instead of its own find-then-update, which had a TOCTOU race: two techs
  // hitting "claim" on the same job at once could both pass the check before
  // either write landed.
  const result = await bulkClaimWorkOrdersAction([workOrderId]);

  if ("error" in result) return { error: result.error };
  if (result.claimedCount === 0) {
    return { error: "ใบงานนี้ถูกรับไปแล้วหรือไม่มีในระบบ" };
  }
  return { success: true as const };
}

export async function bulkClaimWorkOrdersAction(workOrderIds: string[]) {
  const session = await verifyTechnician();
  const techId = BigInt(session.user.id!);

  if (!Array.isArray(workOrderIds) || workOrderIds.length === 0) {
    return { error: "กรุณาเลือกงานอย่างน้อย 1 รายการ" };
  }

  const ids = workOrderIds.map((id) => BigInt(id));
  // Second-aligned on purpose: work_orders.claimed_at is Timestamp(0), so a
  // Date carrying milliseconds would be truncated on write and would no
  // longer equal this value when we read the claimed rows back below.
  const claimedAt = new Date(Math.floor(Date.now() / 1000) * 1000);

  try {
    // Only work_orders rows are touched here, so there's no cross-table order
    // to get wrong — but two techs bulk-claiming overlapping sets can still
    // collide on the row locks if their id lists are ordered differently.
    const { claimedCount, claimedIds } = await withDeadlockRetry(
      "bulkClaimWorkOrdersAction",
      () => prisma.$transaction(async (tx) => {
      // One guarded write for the whole batch instead of a round trip per id.
      // The status=pending guard is what makes this safe: a job another tech
      // grabbed a moment ago simply isn't matched, so it's skipped rather
      // than double-claimed, and `count` is the exact number won.
      const { count } = await tx.workOrder.updateMany({
        where: { id: { in: ids }, status: "pending" },
        data: { status: "claimed", claimedBy: techId, claimedAt },
      });

      if (count === 0) return { claimedCount: 0, claimedIds: [] as bigint[] };

      // Read back which of the requested ids this call is now holding, to
      // attribute the audit rows. Scoped by claimedBy + claimedAt so a
      // batch claimed earlier by the same tech isn't picked up.
      const rows = await tx.workOrder.findMany({
        where: { id: { in: ids }, status: "claimed", claimedBy: techId, claimedAt },
        select: { id: true },
      });

      return { claimedCount: count, claimedIds: rows.map((r) => r.id) };
      })
    );

    await logAuditMany(
      claimedIds.map((id) => ({
        userId: techId,
        action: "CLAIM_WORKORDER",
        entityType: "workOrder",
        entityId: id,
        newValues: { status: "claimed", claimedBy: techId.toString(), bulk: true },
        ipAddress: "server_action",
      }))
    );

    revalidatePath("/tech");

    return {
      success: true,
      claimedCount,
      skippedCount: ids.length - claimedCount,
    };
  } catch (error) {
    console.error("Failed to bulk claim work orders:", error);
    return { error: "เกิดข้อผิดพลาดในการรับงานหลายรายการ" };
  }
}

const logActionSchema = z.object({
  // Optional: a technician who walks up to a unit and fixes it on the spot has
  // no work order to close. One is created for them (see below) so the visit
  // is still attached to a job rather than floating loose.
  workOrderId: z.string().optional(),
  airConditionerId: z.string().min(1),
  actions: z.string().min(1), // JSON stringified array of actions
  notes: z.string().optional(),
  repairDetail: z.string().trim().optional(),
  acStatus: z.enum(["normal", "broken", "needs_cleaning"]),
});

export async function logMaintenanceAction(formData: FormData) {
  const session = await verifyTechnician();
  const techId = BigInt(session.user.id!);

  const raw = {
    workOrderId: formData.get("workOrderId") || undefined,
    airConditionerId: formData.get("airConditionerId"),
    actions: formData.get("actions"),
    notes: formData.get("notes") || undefined,
    repairDetail: formData.get("repairDetail") || undefined,
    acStatus: formData.get("acStatus") || "normal",
  };

  const parsed = logActionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" };
  }

  const { workOrderId, airConditionerId, actions, notes, repairDetail, acStatus } = parsed.data;

  try {
    const acId = BigInt(airConditionerId);

    // Parse actions JSON
    let actionsArray: MaintenanceAction[] = [];
    try {
      actionsArray = JSON.parse(actions);
      if (!Array.isArray(actionsArray) || actionsArray.length === 0) {
        throw new Error("Invalid actions format");
      }
    } catch (e) {
      return { error: "รูปแบบประเภทงานไม่ถูกต้อง" };
    }

    // A repair has to say what was repaired — the whole point of recording it
    // is so the next technician can see what was already done to this unit.
    if (actionsArray.includes("repair") && !repairDetail) {
      return { error: "กรุณาระบุรายละเอียดการซ่อม" };
    }

    // Process File Uploads
    const beforePhotoFile = formData.get("beforePhoto") as File | null;
    const afterPhotoFile = formData.get("afterPhoto") as File | null;

    const beforePhotoUrl = await saveUpload(beforePhotoFile);
    const afterPhotoUrl = await saveUpload(afterPhotoFile);

    const performedAt = new Date();

    const { workOrderId: closedWorkOrderId, wasAutoCreated } = await withDeadlockRetry(
      "logMaintenanceAction",
      () => prisma.$transaction(async (tx) => {
      // The two parent rows this transaction ends up owning — the work order
      // and the unit — are locked exclusively first, before the log rows that
      // reference them are inserted. Insert first and InnoDB takes a shared
      // lock on each parent for the foreign-key check, so the updates below
      // become S->X upgrades; an admin cancelling the same job, or the overdue
      // check touching the same unit, holds the matching lock and neither side
      // can move. Both cases were reproducible deadlocks (error 1213) before
      // this order was imposed. Locking X up front leaves the FK checks to
      // find a lock this transaction already holds.

      // 1. Walk-up work: no job was raised in advance, so one is opened and
      //    closed in the same breath. Every log row points at a work order,
      //    and the admin board shows the visit rather than silently missing
      //    it. Created inside the transaction so a later failure can't leave
      //    a completed job with nothing recorded against it. A row this
      //    transaction just inserted is nobody else's to lock, so the
      //    ordering above has nothing to say about this branch.
      let wId: bigint;
      if (workOrderId) {
        wId = BigInt(workOrderId);

        // Closing the existing job — this is the exclusive lock that has to
        // be taken before the log insert below.
        await tx.workOrder.update({
          where: { id: wId },
          data: { status: "completed", completedAt: performedAt },
        });
      } else {
        const created = await tx.workOrder.create({
          data: {
            airConditionerId: acId,
            status: "completed",
            // The job is opened and closed in the same breath, so what the
            // technician just recorded is the best possible description of what
            // it was for — no inference needed.
            type: actionsArray.includes("repair") ? "repair" : "cleaning",
            priority: "low",
            issueDescription: "ช่างเข้าปฏิบัติงานหน้างานโดยไม่มีใบงานล่วงหน้า (ระบบสร้างอัตโนมัติ)",
            reportedById: techId,
            claimedBy: techId,
            claimedAt: performedAt,
            completedAt: performedAt,
          },
          select: { id: true },
        });
        wId = created.id;
      }

      // 2. Update Air Conditioner status — likewise before the insert.
      await tx.airConditioner.update({
        where: { id: acId },
        data: { status: acStatus as any },
      });

      // 3. Create Multiple Maintenance Logs (one for each action checked)
      await tx.maintenanceLog.createMany({
        data: actionsArray.map((action) => ({
          airConditionerId: acId,
          workOrderId: wId,
          userId: techId,
          action: action as MaintenanceAction,
          notes,
          // Only the repair row carries it; a cleaning row in the same visit
          // has nothing to say about what was fixed.
          repairDetail: action === "repair" ? repairDetail : null,
          beforePhotoUrl,
          afterPhotoUrl,
          performedAt,
        })),
      });

      // 4. Roll the maintenance schedule forward so the calendar reflects
      // the work that was just done, instead of staying stuck on the old
      // due date until an admin edits it by hand.
      const schedule = await tx.maintenanceSchedule.findFirst({
        where: { airConditionerId: acId, isActive: true },
      });

      if (schedule) {
        // Both columns are @db.Date (a calendar day), so they're derived from
        // today's date in the operating timezone rather than from performedAt,
        // which is a UTC instant: a job closed after midnight local time would
        // otherwise be filed under yesterday and re-scheduled a day early.
        const performedOn = businessDateToday();
        const nextDueDate = addMaintenanceInterval(
          performedOn,
          schedule.frequencyValue,
          schedule.frequencyUnit
        );

        await tx.maintenanceSchedule.update({
          where: { id: schedule.id },
          data: { lastPerformedAt: performedOn, nextDueDate },
        });
      }

      return { workOrderId: wId, wasAutoCreated: !workOrderId };
      })
    );

    await logAudit({
      userId: techId,
      action: "COMPLETE_WORKORDER",
      entityType: "workOrder",
      entityId: closedWorkOrderId,
      newValues: {
        status: "completed",
        actions: actionsArray,
        acStatus,
        // Distinguishes a job the technician was assigned from one the system
        // opened for them on the spot, which is otherwise invisible later.
        autoCreatedWorkOrder: wasAutoCreated,
      },
      ipAddress: "server_action",
    });

    revalidatePath("/tech");
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to log maintenance action:", error);
    return { error: "ไม่สามารถบันทึกประวัติการซ่อมได้" };
  }
}

export async function scanQrCodeAction(acCode: string) {
  await verifyTechnician();

  try {
    const ac = await prisma.airConditioner.findFirst({
      where: { acCode },
      include: {
        acBrand: true,
        acModel: { select: { deletedAt: true } },
        room: {
          include: { building: true },
        },
        workOrders: {
          where: { status: "pending" },
          take: 1,
        },
        maintenanceLogs: {
          orderBy: { performedAt: "desc" },
          take: 1,
        }
      },
    });

    if (!ac) {
      return { error: "ไม่พบข้อมูลเครื่องปรับอากาศรหัสนี้ในระบบ" };
    }

    const lastLog = ac.maintenanceLogs[0];
    const pendingJob = ac.workOrders[0];

    return {
      success: true,
      acDetails: {
        id: ac.id.toString(),
        acCode: ac.acCode,
        brand: ac.acBrand?.name || ac.brand || "ไม่ระบุ",
        ...catalogueFlags(ac),
        btu: ac.btu,
        status: ac.status,
        location: formatUnitLocation(ac.room),
        lastMaintenance: lastLog ? lastLog.performedAt.toISOString() : null,
      },
      pendingJobId: pendingJob ? pendingJob.id.toString() : null,
    };
  } catch (error) {
    console.error("Scan QR failed:", error);
    return { error: "เกิดข้อผิดพลาดในการสแกนข้อมูล" };
  }
}

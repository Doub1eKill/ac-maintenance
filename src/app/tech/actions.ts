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
import { ORGANISATION_NAME } from "@/lib/organisation";

async function verifyTechnician() {
  const session = await auth();
  if (!session?.user || session.user.role !== "technician") {
    throw new Error("Unauthorized: Technician access required");
  }
  return session;
}

import { promises as fs } from "fs";
import path from "path";

// Evidence photos come straight off a technician's phone camera, which means
// 3-5 MB files at 4000px+ — far more than the UI ever displays, and paid for
// twice: once on the tech's mobile upload, again on every admin who views the
// work order. Downscale and re-encode before writing to disk.
const MAX_IMAGE_DIMENSION = 1600;
const IMAGE_QUALITY = 80;

// Helper function to save uploaded file
async function saveUpload(file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uploadDir = path.join(process.cwd(), "public/uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    if (file.type?.startsWith("image/")) {
      try {
        const { default: sharp } = await import("sharp");
        const processed = await sharp(buffer)
          // withoutEnlargement: a photo already smaller than the cap is left
          // at its own size rather than being upscaled into a bigger file.
          .rotate() // honour EXIF orientation before stripping metadata
          .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ quality: IMAGE_QUALITY, mozjpeg: true })
          .toBuffer();

        const filename = `${Date.now()}-${safeName.replace(/\.[^.]+$/, "")}.jpg`;
        await fs.writeFile(path.join(uploadDir, filename), processed);
        return `/uploads/${filename}`;
      } catch (imageError) {
        // Corrupt/unsupported image, or sharp unavailable on this platform —
        // fall through and store the original rather than losing the evidence.
        console.error("Image processing failed, storing original:", imageError);
      }
    }

    const filename = `${Date.now()}-${safeName}`;
    await fs.writeFile(path.join(uploadDir, filename), buffer);
    return `/uploads/${filename}`;
  } catch (error) {
    console.error("Failed to save file:", error);
    return null;
  }
}

function formatAcLocation(room: { name: string; floor: number | null; building: { name: string; abbreviation: string } }) {
  return `${room.building.name} (${room.building.abbreviation}) - ห้อง ${room.name} (ชั้น ${room.floor || 1})`;
}

export async function getTechnicianData() {
  const session = await verifyTechnician();
  const techId = BigInt(session.user.id!);

  try {
    await syncOverdueMaintenanceWorkOrders();

    const [pendingOrdersRaw, myJobsRaw, completedJobsRaw, assetListResult] = await Promise.all([
      prisma.workOrder.findMany({
        where: { status: "pending" },
        include: {
          airConditioner: {
            include: {
              acBrand: true,
              room: {
                include: {
                  building: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.workOrder.findMany({
        where: { claimedBy: techId, status: "claimed" },
        include: {
          airConditioner: {
            include: {
              acBrand: true,
              room: {
                include: {
                  building: true,
                },
              },
            },
          },
        },
        orderBy: { claimedAt: "desc" },
      }),
      prisma.workOrder.findMany({
        where: { claimedBy: techId, status: "completed" },
        include: {
          airConditioner: {
            include: {
              acBrand: true,
              room: {
                include: {
                  building: true,
                },
              },
            },
          },
        },
        orderBy: { completedAt: "desc" },
        take: 50,
      }),
      getTechnicianAssetList(),
    ]);

    const jobPool = pendingOrdersRaw.map((wo) => ({
      id: wo.id.toString(),
      acCode: wo.airConditioner.acCode,
      brand: wo.airConditioner.acBrand?.name || wo.airConditioner.brand || "ไม่ระบุ",
      btu: wo.airConditioner.btu,
      status: wo.airConditioner.status,
      location: formatAcLocation(wo.airConditioner.room),
      createdAt: wo.createdAt ? wo.createdAt.toISOString() : null,
    }));

    const myJobs = myJobsRaw.map((wo) => ({
      id: wo.id.toString(),
      acCode: wo.airConditioner.acCode,
      brand: wo.airConditioner.acBrand?.name || wo.airConditioner.brand || "ไม่ระบุ",
      btu: wo.airConditioner.btu,
      airConditionerId: wo.airConditionerId.toString(),
      status: wo.airConditioner.status,
      location: formatAcLocation(wo.airConditioner.room),
      claimedAt: wo.claimedAt ? wo.claimedAt.toISOString() : null,
    }));

    const completedJobs = completedJobsRaw.map((wo) => ({
      id: wo.id.toString(),
      acCode: wo.airConditioner.acCode,
      brand: wo.airConditioner.acBrand?.name || wo.airConditioner.brand || "ไม่ระบุ",
      btu: wo.airConditioner.btu,
      airConditionerId: wo.airConditionerId.toString(),
      status: wo.airConditioner.status,
      location: formatAcLocation(wo.airConditioner.room),
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
      universityName: ORGANISATION_NAME,
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
      universityName: ORGANISATION_NAME,
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
    const { claimedCount, claimedIds } = await prisma.$transaction(async (tx) => {
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
    });

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
  workOrderId: z.string().min(1),
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
    workOrderId: formData.get("workOrderId"),
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
    const wId = BigInt(workOrderId);
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

    // 1. Create Multiple Maintenance Logs (one for each action checked)
    const performedAt = new Date();
    const logsData = actionsArray.map(action => ({
      airConditionerId: acId,
      workOrderId: wId,
      userId: techId,
      action: action as MaintenanceAction,
      notes,
      // Only the repair row carries it; a cleaning row in the same visit has
      // nothing to say about what was fixed.
      repairDetail: action === "repair" ? repairDetail : null,
      beforePhotoUrl,
      afterPhotoUrl,
      performedAt,
    }));

    await prisma.$transaction(async (tx) => {
      // 1. Create Multiple Maintenance Logs (one for each action checked)
      await tx.maintenanceLog.createMany({ data: logsData });

      // 2. Mark Work Order as completed
      await tx.workOrder.update({
        where: { id: wId },
        data: { status: "completed", completedAt: performedAt },
      });

      // 3. Update Air Conditioner status
      await tx.airConditioner.update({
        where: { id: acId },
        data: { status: acStatus as any },
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
    });

    await logAudit({
      userId: techId,
      action: "COMPLETE_WORKORDER",
      entityType: "workOrder",
      entityId: wId,
      newValues: { status: "completed", actions: actionsArray, acStatus },
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
        btu: ac.btu,
        status: ac.status,
        location: `${ac.room.building.name} - ห้อง ${ac.room.name}`,
        lastMaintenance: lastLog ? lastLog.performedAt.toISOString() : null,
      },
      pendingJobId: pendingJob ? pendingJob.id.toString() : null,
    };
  } catch (error) {
    console.error("Scan QR failed:", error);
    return { error: "เกิดข้อผิดพลาดในการสแกนข้อมูล" };
  }
}

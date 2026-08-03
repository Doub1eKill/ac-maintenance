"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addDays, addMonths, addYears } from "date-fns";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { syncOverdueMaintenanceWorkOrders, getTechnicianAssetList } from "@/lib/maintenance";
import { MaintenanceAction } from "@/generated/prisma/client";

async function verifyTechnician() {
  const session = await auth();
  if (!session?.user || session.user.role !== "technician" || !session.user.universityId) {
    throw new Error("Unauthorized: Technician access required");
  }
  return session;
}

import { promises as fs } from "fs";
import path from "path";

// Helper function to save uploaded file
async function saveUpload(file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null;
  
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const uploadDir = path.join(process.cwd(), "public/uploads");
    await fs.mkdir(uploadDir, { recursive: true });
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
  const universityId = BigInt(session.user.universityId!);
  const techId = BigInt(session.user.id!);

  try {
    await syncOverdueMaintenanceWorkOrders(universityId);

    const [university, pendingOrdersRaw, myJobsRaw, completedJobsRaw, assetListResult] = await Promise.all([
      prisma.university.findUnique({ where: { id: universityId } }),
      prisma.workOrder.findMany({
        where: { universityId, status: "pending" },
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
        where: { universityId, claimedBy: techId, status: "claimed" },
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
        where: { universityId, claimedBy: techId, status: "completed" },
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
      getTechnicianAssetList(universityId),
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
      universityName: university?.name || "มหาวิทยาลัย",
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
      universityName: "มหาวิทยาลัย",
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
  const universityId = BigInt(session.user.universityId!);

  if (!Array.isArray(workOrderIds) || workOrderIds.length === 0) {
    return { error: "กรุณาเลือกงานอย่างน้อย 1 รายการ" };
  }

  const ids = workOrderIds.map((id) => BigInt(id));
  const claimedAt = new Date();

  try {
    // Claim each selected id under a status=pending guard so a job someone
    // else grabbed a moment ago is silently skipped instead of failing (or
    // double-claiming) the whole batch.
    const claimedIds = await prisma.$transaction(async (tx) => {
      const successes: bigint[] = [];
      for (const id of ids) {
        const { count } = await tx.workOrder.updateMany({
          where: { id, status: "pending", universityId },
          data: { status: "claimed", claimedBy: techId, claimedAt },
        });
        if (count > 0) successes.push(id);
      }
      return successes;
    });

    await Promise.all(
      claimedIds.map((id) =>
        logAudit({
          universityId,
          userId: techId,
          action: "CLAIM_WORKORDER",
          entityType: "workOrder",
          entityId: id,
          newValues: { status: "claimed", claimedBy: techId.toString(), bulk: true },
          ipAddress: "server_action",
        })
      )
    );

    revalidatePath("/tech");

    return {
      success: true,
      claimedCount: claimedIds.length,
      skippedCount: ids.length - claimedIds.length,
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
    acStatus: formData.get("acStatus") || "normal",
  };

  const parsed = logActionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" };
  }

  const { workOrderId, airConditionerId, actions, notes, acStatus } = parsed.data;

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
        const nextDueDate =
          schedule.frequencyUnit === "days"
            ? addDays(performedAt, schedule.frequencyValue)
            : schedule.frequencyUnit === "years"
            ? addYears(performedAt, schedule.frequencyValue)
            : addMonths(performedAt, schedule.frequencyValue);

        await tx.maintenanceSchedule.update({
          where: { id: schedule.id },
          data: { lastPerformedAt: performedAt, nextDueDate },
        });
      }
    });

    await logAudit({
      universityId: BigInt(session.user.universityId!),
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
  const session = await verifyTechnician();
  const universityId = BigInt(session.user.universityId!);

  try {
    const ac = await prisma.airConditioner.findFirst({
      where: { acCode, room: { building: { universityId } } },
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

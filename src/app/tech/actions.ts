"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { MaintenanceAction } from "@/generated/prisma/client";

async function verifyTechnician() {
  const session = await auth();
  if (!session?.user || session.user.role !== "technician" || !session.user.universityId) {
    throw new Error("Unauthorized: Technician access required");
  }
  return session;
}

export async function getTechnicianData() {
  const session = await verifyTechnician();
  const universityId = BigInt(session.user.universityId!);
  const techId = BigInt(session.user.id!);

  try {
    const [university, pendingOrdersRaw, myJobsRaw] = await Promise.all([
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
    ]);

    const jobPool = pendingOrdersRaw.map((wo) => ({
      id: wo.id.toString(),
      acCode: wo.airConditioner.acCode,
      brand: wo.airConditioner.acBrand?.name || wo.airConditioner.brand || "ไม่ระบุ",
      btu: wo.airConditioner.btu,
      status: wo.airConditioner.status,
      location: `${wo.airConditioner.room.building.name} (${wo.airConditioner.room.building.abbreviation}) - ห้อง ${wo.airConditioner.room.name} (ชั้น ${wo.airConditioner.room.floor || 1})`,
      createdAt: wo.createdAt ? wo.createdAt.toISOString() : null,
    }));

    const myJobs = myJobsRaw.map((wo) => ({
      id: wo.id.toString(),
      acCode: wo.airConditioner.acCode,
      brand: wo.airConditioner.acBrand?.name || wo.airConditioner.brand || "ไม่ระบุ",
      btu: wo.airConditioner.btu,
      airConditionerId: wo.airConditionerId.toString(),
      status: wo.airConditioner.status,
      location: `${wo.airConditioner.room.building.name} (${wo.airConditioner.room.building.abbreviation}) - ห้อง ${wo.airConditioner.room.name} (ชั้น ${wo.airConditioner.room.floor || 1})`,
      claimedAt: wo.claimedAt ? wo.claimedAt.toISOString() : null,
    }));

    return {
      dbError: null,
      universityName: university?.name || "มหาวิทยาลัย",
      jobPool,
      myJobs,
    };
  } catch (error) {
    console.error("Technician Data query failed:", error);
    return {
      dbError: "ไม่สามารถเชื่อมต่อฐานข้อมูล MariaDB/MySQL ได้ (Connection Pool Timeout) - กรุณาตรวจสอบว่าเซิร์ฟเวอร์ MySQL บนพอร์ต 3307 เปิดใช้งานอยู่ และเรียกใช้ 'npx tsx prisma/seed.ts'",
      universityName: "มหาวิทยาลัย",
      jobPool: [],
      myJobs: [],
    };
  }
}

export async function claimWorkOrderAction(workOrderId: string) {
  const session = await verifyTechnician();
  const techId = BigInt(session.user.id!);

  try {
    const order = await prisma.workOrder.findUnique({
      where: { id: BigInt(workOrderId) },
    });

    if (!order || order.status !== "pending") {
      return { error: "ใบงานนี้ถูกรับไปแล้วหรือไม่มีในระบบ" };
    }

    await prisma.workOrder.update({
      where: { id: BigInt(workOrderId) },
      data: {
        claimedBy: techId,
        claimedAt: new Date(),
        status: "claimed",
      },
    });

    await logAudit({
      universityId: BigInt(session.user.universityId!),
      userId: techId,
      action: "CLAIM_WORKORDER",
      entityType: "workOrder",
      entityId: BigInt(workOrderId),
      newValues: { status: "claimed", claimedBy: techId.toString() },
      ipAddress: "server_action",
    });

    revalidatePath("/tech");
    return { success: true };
  } catch (error) {
    console.error("Failed to claim work order:", error);
    return { error: "เกิดข้อผิดพลาดในการกดรับงาน" };
  }
}

const logActionSchema = z.object({
  workOrderId: z.string().min(1),
  airConditionerId: z.string().min(1),
  action: z.enum(["cleaning", "repair", "refill_refrigerant"]),
  notes: z.string().optional(),
});

export async function logMaintenanceAction(formData: FormData) {
  const session = await verifyTechnician();
  const techId = BigInt(session.user.id!);

  const raw = {
    workOrderId: formData.get("workOrderId"),
    airConditionerId: formData.get("airConditionerId"),
    action: formData.get("action"),
    notes: formData.get("notes") || undefined,
  };

  const parsed = logActionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" };
  }

  const { workOrderId, airConditionerId, action, notes } = parsed.data;

  try {
    const wId = BigInt(workOrderId);
    const acId = BigInt(airConditionerId);

    // 1. Create Maintenance Log
    await prisma.maintenanceLog.create({
      data: {
        airConditionerId: acId,
        workOrderId: wId,
        userId: techId,
        action: action as MaintenanceAction,
        notes,
        performedAt: new Date(),
      },
    });

    // 2. Mark Work Order as completed
    await prisma.workOrder.update({
      where: { id: wId },
      data: { status: "completed" },
    });

    // 3. Reset Air Conditioner status to normal
    await prisma.airConditioner.update({
      where: { id: acId },
      data: { status: "normal" },
    });

    await logAudit({
      universityId: BigInt(session.user.universityId!),
      userId: techId,
      action: "COMPLETE_WORKORDER",
      entityType: "workOrder",
      entityId: wId,
      newValues: { status: "completed", action },
      ipAddress: "server_action",
    });

    revalidatePath("/tech");
    return { success: true };
  } catch (error) {
    console.error("Failed to log maintenance action:", error);
    return { error: "ไม่สามารถบันทึกประวัติการซ่อมได้" };
  }
}

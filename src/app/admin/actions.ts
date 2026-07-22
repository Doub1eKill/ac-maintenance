"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function verifyOrgAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "org_admin" || !session.user.universityId) {
    throw new Error("Unauthorized: Org Admin access required");
  }
  return session;
}

export async function getOrgAdminData() {
  const session = await verifyOrgAdmin();
  const universityId = BigInt(session.user.universityId!);

  try {
    const [
      university,
      buildings,
      workOrdersRaw,
      techsRaw,
      pendingUsersRaw,
      allUsersRaw,
    ] = await Promise.all([
      prisma.university.findUnique({ where: { id: universityId } }),
      prisma.building.findMany({
        where: { universityId },
        include: {
          rooms: {
            include: {
              airConditioners: true,
            },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.workOrder.findMany({
        where: { universityId },
        include: {
          airConditioner: {
            include: {
              room: {
                include: {
                  building: true,
                },
              },
            },
          },
          claimedByUser: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.user.findMany({
        where: { universityId, role: "technician", status: "active" },
        select: { id: true, name: true, email: true },
      }),
      prisma.user.findMany({
        where: { universityId, status: "pending" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findMany({
        where: { universityId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Aggregate metrics
    let totalUnits = 0;
    let brokenOrCleaningUnits = 0;

    const buildingList = buildings.map((b) => {
      let bldgUnits = 0;
      const roomList = b.rooms.map((r) => {
        bldgUnits += r.airConditioners.length;
        totalUnits += r.airConditioners.length;
        r.airConditioners.forEach((ac) => {
          if (ac.status === "broken" || ac.status === "needs_cleaning") {
            brokenOrCleaningUnits += 1;
          }
        });
        return {
          id: r.id.toString(),
          name: r.name,
          floor: r.floor,
          acUnits: r.airConditioners.map((ac) => ({
            id: ac.id.toString(),
            acCode: ac.acCode,
            brand: ac.brand,
            model: ac.model,
            btu: ac.btu,
            status: ac.status,
          })),
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

    const pendingWorkOrders = workOrdersRaw.filter((wo) => wo.status === "pending").length;

    const workOrders = workOrdersRaw.map((wo) => ({
      id: wo.id.toString(),
      acCode: wo.airConditioner.acCode,
      brand: wo.airConditioner.brand,
      location: `${wo.airConditioner.room.building.name} (${wo.airConditioner.room.building.abbreviation}) - ห้อง ${wo.airConditioner.room.name}`,
      status: wo.status,
      claimedByName: wo.claimedByUser?.name || null,
      claimedAt: wo.claimedAt ? wo.claimedAt.toISOString() : null,
      createdAt: wo.createdAt ? wo.createdAt.toISOString() : null,
      airConditionerId: wo.airConditionerId.toString(),
    }));

    const pendingUsers = pendingUsersRaw.map((u) => ({
      id: u.id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt ? u.createdAt.toISOString() : null,
    }));

    const allUsers = allUsersRaw.map((u) => ({
      id: u.id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt ? u.createdAt.toISOString() : null,
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

    return {
      dbError: null,
      universityName: university?.name || "มหาวิทยาลัย",
      metrics: {
        totalUnits,
        brokenOrCleaningUnits,
        pendingWorkOrders,
        activeTechsCount: techsRaw.length,
        pendingUsersCount: pendingUsers.length,
      },
      workOrders,
      buildings: buildingList,
      allAcUnits,
      pendingUsers,
      allUsers,
    };
  } catch (error) {
    console.error("Org Admin Data query failed:", error);
    return {
      dbError: "ไม่สามารถเชื่อมต่อฐานข้อมูล MariaDB/MySQL ได้ (Connection Pool Timeout) - กรุณาตรวจสอบว่าเซิร์ฟเวอร์ MySQL บนพอร์ต 3307 เปิดใช้งานอยู่ และเรียกใช้ 'npx tsx prisma/seed.ts'",
      universityName: "มหาวิทยาลัย",
      metrics: {
        totalUnits: 0,
        brokenOrCleaningUnits: 0,
        pendingWorkOrders: 0,
        activeTechsCount: 0,
        pendingUsersCount: 0,
      },
      workOrders: [],
      buildings: [],
      allAcUnits: [],
      pendingUsers: [],
      allUsers: [],
    };
  }
}

export async function updateUserStatusByOrgAdminAction(
  targetUserId: string,
  newStatus: "active" | "suspended"
) {
  const session = await verifyOrgAdmin();
  const universityId = BigInt(session.user.universityId!);

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: BigInt(targetUserId) },
      select: { id: true, universityId: true, role: true },
    });

    if (!targetUser || targetUser.universityId !== universityId) {
      return { error: "ไม่พบผู้ใช้หรือผู้ใช้ไม่ได้อยู่ในสังกัดมหาวิทยาลัยนี้" };
    }

    if (targetUser.role === "super_admin") {
      return { error: "ไม่มีสิทธิ์ปรับเปลี่ยนสถานะของ Super Admin" };
    }

    await prisma.user.update({
      where: { id: BigInt(targetUserId) },
      data: { status: newStatus },
    });

    console.log(
      `[AUDIT TRAIL] User status updated by OrgAdmin (AdminID: ${session.user.id}, Tenant: ${universityId}): TargetUser ${targetUserId} -> Status: ${newStatus} at ${new Date().toISOString()}`
    );

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to update user status by org admin:", error);
    return { error: "ไม่สามารถอัปเดตสถานะผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง" };
  }
}

const createWorkOrderSchema = z.object({
  airConditionerId: z.string().min(1, "กรุณาเลือกเครื่องปรับอากาศ"),
});

export async function createWorkOrderAction(formData: FormData) {
  const session = await verifyOrgAdmin();
  const universityId = BigInt(session.user.universityId!);

  const raw = {
    airConditionerId: formData.get("airConditionerId"),
  };

  const parsed = createWorkOrderSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" };
  }

  try {
    const acId = BigInt(parsed.data.airConditionerId);

    // Create Work Order
    await prisma.workOrder.create({
      data: {
        airConditionerId: acId,
        universityId: universityId,
        status: "pending",
      },
    });

    // Update AC status to broken/needs_cleaning if it was normal
    await prisma.airConditioner.update({
      where: { id: acId },
      data: { status: "broken" },
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to create work order:", error);
    return { error: "ไม่สามารถออกใบงานซ่อมบำรุงได้" };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { format, subDays } from "date-fns";

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
      maintenanceLogsRaw,
    ] = await Promise.all([
      prisma.university.findUnique({ where: { id: universityId } }),
      prisma.building.findMany({
        where: { universityId },
        include: {
          rooms: {
            include: {
              airConditioners: {
                include: { acBrand: true, acModel: true },
                orderBy: { acCode: "asc" },
              },
            },
            orderBy: { name: "asc" },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.workOrder.findMany({
        where: { universityId },
        include: {
          airConditioner: {
            include: {
              acBrand: true,
              acModel: true,
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
      prisma.maintenanceLog.findMany({
        where: { 
          airConditioner: { room: { building: { universityId } } },
          performedAt: { gte: subDays(new Date(), 7) }
        },
      })
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
            brand: ac.acBrand?.name || ac.brand || "ไม่ระบุ",
            model: ac.acModel?.name || ac.model || null,
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
      brand: wo.airConditioner.acBrand?.name || wo.airConditioner.brand || "ไม่ระบุ",
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
      weeklyActivity,
      workOrders,
      buildings: buildingList,
      allAcUnits,
      pendingUsers,
      allUsers,
      brands: await prisma.acBrand.findMany({ include: { models: true }, orderBy: { name: 'asc' } }),
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
      weeklyActivity: [],
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
    const workOrder = await prisma.workOrder.create({
      data: {
        airConditionerId: acId,
        universityId: universityId,
        status: "pending",
      },
    });

    await logAudit({
      universityId: universityId,
      userId: BigInt(session.user.id!),
      action: "CREATE_WORKORDER",
      entityType: "workOrder",
      entityId: workOrder.id,
      newValues: { status: "pending", airConditionerId: acId.toString() },
      ipAddress: "server_action",
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

const buildingSchema = z.object({
  name: z.string().min(1, "กรุณาระบุชื่ออาคาร"),
  abbreviation: z.string().min(1, "กรุณาระบุตัวย่ออาคาร"),
});

export async function createBuildingAction(formData: FormData) {
  const session = await verifyOrgAdmin();
  const universityId = BigInt(session.user.universityId!);
  
  const parsed = buildingSchema.safeParse({
    name: formData.get("name"),
    abbreviation: formData.get("abbreviation"),
  });
  
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" };
  
  try {
    const existing = await prisma.building.findFirst({
      where: {
        universityId,
        OR: [
          { name: parsed.data.name },
          { abbreviation: parsed.data.abbreviation }
        ]
      }
    });
    
    if (existing) return { error: "มีชื่อหรือตัวย่ออาคารนี้ในระบบแล้ว" };
    
    await prisma.building.create({
      data: {
        universityId,
        name: parsed.data.name,
        abbreviation: parsed.data.abbreviation
      }
    });
    
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "เกิดข้อผิดพลาดในการบันทึกอาคาร" };
  }
}

const roomSchema = z.object({
  buildingId: z.string().min(1, "กรุณาเลือกอาคาร"),
  name: z.string().min(1, "กรุณาระบุชื่อ/หมายเลขห้อง"),
  floor: z.string().transform(val => val ? parseInt(val, 10) : null).nullable(),
});

export async function createRoomAction(formData: FormData) {
  const session = await verifyOrgAdmin();
  const universityId = BigInt(session.user.universityId!);
  
  const parsed = roomSchema.safeParse({
    buildingId: formData.get("buildingId"),
    name: formData.get("name"),
    floor: formData.get("floor"),
  });
  
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" };
  
  try {
    // Verify building belongs to university
    const building = await prisma.building.findUnique({
      where: { id: BigInt(parsed.data.buildingId) }
    });
    
    if (!building || building.universityId !== universityId) {
      return { error: "อาคารไม่ถูกต้อง" };
    }
    
    const existing = await prisma.room.findUnique({
      where: {
        buildingId_name: {
          buildingId: building.id,
          name: parsed.data.name
        }
      }
    });
    
    if (existing) return { error: "มีห้องนี้อยู่ในอาคารแล้ว" };
    
    await prisma.room.create({
      data: {
        buildingId: building.id,
        name: parsed.data.name,
        floor: parsed.data.floor
      }
    });
    
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "เกิดข้อผิดพลาดในการบันทึกห้อง" };
  }
}

const acSchema = z.object({
  roomId: z.string().min(1, "กรุณาเลือกห้อง"),
  brandType: z.enum(["master", "other"]),
  acModelId: z.string().optional(),
  customBrand: z.string().optional(),
  customModel: z.string().optional(),
  btu: z.string().transform(val => val ? parseInt(val, 10) : null).nullable()
});

export async function createAirConditionerAction(formData: FormData) {
  const session = await verifyOrgAdmin();
  const universityId = BigInt(session.user.universityId!);
  
  const parsed = acSchema.safeParse({
    roomId: formData.get("roomId"),
    brandType: formData.get("brandType"),
    acModelId: formData.get("acModelId"),
    customBrand: formData.get("customBrand"),
    customModel: formData.get("customModel"),
    btu: formData.get("btu"),
  });
  
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" };
  const data = parsed.data;
  
  if (data.brandType === "master" && !data.acModelId) {
    return { error: "กรุณาเลือกรุ่นแอร์" };
  }
  if (data.brandType === "other" && !data.customBrand) {
    return { error: "กรุณาระบุยี่ห้อแอร์" };
  }

  try {
    // Verify room belongs to university
    const room = await prisma.room.findUnique({
      where: { id: BigInt(data.roomId) },
      include: { building: { include: { university: true } }, airConditioners: true }
    });
    
    if (!room || room.building.universityId !== universityId) {
      return { error: "ห้องไม่ถูกต้อง" };
    }
    
    // Generate AC Code: [UNI]-[BLDG]-[ROOM]-[NN]
    const unitCount = room.airConditioners.length + 1;
    const acCode = `${room.building.university.abbreviation}-${room.building.abbreviation}-${room.name}-${unitCount.toString().padStart(2, '0')}`;
    const qrCode = crypto.randomUUID();
    
    let dbData: any = {
      roomId: room.id,
      acCode,
      qrCode,
      btu: data.btu,
      installedAt: new Date()
    };
    
    if (data.brandType === "master") {
      const model = await prisma.acModel.findUnique({
        where: { id: BigInt(data.acModelId!) }
      });
      if (!model) return { error: "ไม่พบรุ่นแอร์ที่เลือก" };
      
      dbData.acBrandId = model.brandId;
      dbData.acModelId = model.id;
    } else {
      dbData.brand = data.customBrand;
      dbData.model = data.customModel;
    }
    
    await prisma.airConditioner.create({ data: dbData });
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "เกิดข้อผิดพลาดในการลงทะเบียนแอร์" };
  }
}

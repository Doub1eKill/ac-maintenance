"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { format, subDays } from "date-fns";

async function verifySuperAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    throw new Error("Unauthorized: Super Admin access required");
  }
  return session;
}

export async function getSuperAdminData() {
  await verifySuperAdmin();

  try {
    const [
      totalUniversities,
      pendingUsersCount,
      totalTechsCount,
      totalWorkOrdersCount,
      pendingUsersRaw,
      universitiesRaw,
      brandsRaw,
      recentUsersRaw,
    ] = await Promise.all([
      prisma.university.count(),
      prisma.user.count({ where: { status: "pending" } }),
      prisma.user.count({ where: { role: "technician" } }),
      prisma.workOrder.count(),
      prisma.user.findMany({
        where: { status: "pending" },
        include: { university: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.university.findMany({
        include: {
          _count: {
            select: {
              buildings: true,
              users: true,
              workOrders: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.acBrand.findMany({
        include: {
          models: true,
          _count: {
            select: { models: true, airConditioners: true }
          }
        },
        orderBy: { name: 'asc' }
      }),
      prisma.user.findMany({
        where: { createdAt: { gte: subDays(new Date(), 7) } },
        select: { createdAt: true },
      }),
    ]);

    const pendingUsers = pendingUsersRaw.map((u) => ({
      id: u.id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt ? u.createdAt.toISOString() : null,
      universityName: u.university?.name || "ไม่ระบุ",
      universityAbbr: u.university?.abbreviation || "-",
    }));

    const universities = universitiesRaw.map((u) => ({
      id: u.id.toString(),
      name: u.name,
      abbreviation: u.abbreviation,
      address: u.address,
      phone: u.phone,
      buildingsCount: u._count.buildings,
      usersCount: u._count.users,
      workOrdersCount: u._count.workOrders,
      createdAt: u.createdAt ? u.createdAt.toISOString() : null,
    }));

    const brands = brandsRaw.map((b) => ({
      id: b.id.toString(),
      name: b.name,
      modelsCount: b._count.models,
      acCount: b._count.airConditioners,
      models: b.models.map((m) => ({
        id: m.id.toString(),
        brandId: m.brandId.toString(),
        name: m.name,
        defaultBtu: m.defaultBtu
      }))
    }));

    const registrationActivity = Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dayStr = format(date, "EEE");
      return {
        day: dayStr,
        users: 0,
      };
    });

    recentUsersRaw.forEach((u) => {
      if (u.createdAt) {
        const dayStr = format(u.createdAt, "EEE");
        const activityDay = registrationActivity.find(d => d.day === dayStr);
        if (activityDay) {
          activityDay.users += 1;
        }
      }
    });

    // Per-university breakdown for the colored multi-tenant chart. Raw SQL
    // because MaintenanceLog only reaches its university through a 3-hop
    // join (ac -> room -> building -> university) with no denormalized key
    // to group by, so a single grouped query is far cheaper than assembling
    // this by hand from separate Prisma calls.
    const universityBreakdownRaw = await prisma.$queryRaw<
      Array<{
        university_id: bigint;
        university_name: string;
        abbreviation: string;
        total_ac_count: bigint;
        broken_count: bigint;
        tech_count: bigint;
        cleaned_count: bigint;
        repaired_count: bigint;
      }>
    >`
      SELECT
        u.id AS university_id,
        u.name AS university_name,
        u.abbreviation AS abbreviation,
        COUNT(DISTINCT ac.id) AS total_ac_count,
        COUNT(DISTINCT CASE WHEN ac.status = 'broken' THEN ac.id END) AS broken_count,
        (SELECT COUNT(*) FROM users us WHERE us.university_id = u.id AND us.role = 'technician') AS tech_count,
        (SELECT COUNT(*) FROM maintenance_logs ml
           JOIN air_conditioners ac2 ON ac2.id = ml.air_conditioner_id
           JOIN rooms r2 ON r2.id = ac2.room_id
           JOIN buildings b2 ON b2.id = r2.building_id
           WHERE b2.university_id = u.id AND ml.action = 'cleaning') AS cleaned_count,
        (SELECT COUNT(*) FROM maintenance_logs ml
           JOIN air_conditioners ac2 ON ac2.id = ml.air_conditioner_id
           JOIN rooms r2 ON r2.id = ac2.room_id
           JOIN buildings b2 ON b2.id = r2.building_id
           WHERE b2.university_id = u.id AND ml.action = 'repair') AS repaired_count
      FROM universities u
      LEFT JOIN buildings b ON b.university_id = u.id
      LEFT JOIN rooms r ON r.building_id = b.id
      LEFT JOIN air_conditioners ac ON ac.room_id = r.id AND ac.deleted_at IS NULL
      GROUP BY u.id, u.name, u.abbreviation
      ORDER BY u.name ASC
    `;

    const universityBreakdown = universityBreakdownRaw.map((row) => ({
      universityId: row.university_id.toString(),
      universityName: row.university_name,
      abbreviation: row.abbreviation,
      totalAcCount: Number(row.total_ac_count),
      brokenCount: Number(row.broken_count),
      techCount: Number(row.tech_count),
      cleanedCount: Number(row.cleaned_count),
      repairedCount: Number(row.repaired_count),
    }));

    return {
      dbError: null,
      metrics: {
        totalUniversities,
        pendingUsersCount,
        totalTechsCount,
        totalWorkOrdersCount,
      },
      pendingUsers,
      universities,
      brands,
      registrationActivity,
      universityBreakdown,
    };
  } catch (error) {
    console.error("Super Admin Data query failed:", error);
    return {
      dbError: "ไม่สามารถเชื่อมต่อฐานข้อมูล MariaDB/MySQL ได้ (Connection Pool Timeout) - กรุณาตรวจสอบว่าเซิร์ฟเวอร์ MySQL บนพอร์ต 3307 เปิดใช้งานอยู่ และเรียกใช้ 'npx tsx prisma/seed.ts'",
      metrics: {
        totalUniversities: 0,
        pendingUsersCount: 0,
        totalTechsCount: 0,
        totalWorkOrdersCount: 0,
      },
      pendingUsers: [],
      universities: [],
      brands: [],
      registrationActivity: [],
      universityBreakdown: [],
    };
  }
}

export async function updateUserStatusAction(userId: string, newStatus: "active" | "suspended") {
  await verifySuperAdmin();

  try {
    await prisma.user.update({
      where: { id: BigInt(userId) },
      data: { status: newStatus },
    });
    revalidatePath("/super-admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to update user status:", error);
    return { error: "ไม่สามารถอัปเดตสถานะผู้ใช้ได้ กรุณาตรวจสอบการเชื่อมต่อฐานข้อมูล" };
  }
}

const universitySchema = z.object({
  name: z.string().min(2, "ชื่อมหาวิทยาลัยต้องมีความยาวอย่างน้อย 2 ตัวอักษร"),
  abbreviation: z.string().min(2, "ตัวย่อสถาบันต้องมีความยาว 2-10 ตัวอักษร").max(10),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export async function createUniversityAction(formData: FormData) {
  await verifySuperAdmin();

  const raw = {
    name: formData.get("name"),
    abbreviation: formData.get("abbreviation"),
    address: formData.get("address") || undefined,
    phone: formData.get("phone") || undefined,
  };

  const parsed = universitySchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" };
  }

  try {
    const existing = await prisma.university.findFirst({
      where: {
        OR: [
          { name: parsed.data.name },
          { abbreviation: parsed.data.abbreviation.toUpperCase() },
        ],
      },
    });

    if (existing) {
      return { error: "ชื่อหรือตัวย่อสถาบันนี้มีอยู่ในระบบแล้ว" };
    }

    await prisma.university.create({
      data: {
        name: parsed.data.name,
        abbreviation: parsed.data.abbreviation.toUpperCase(),
        address: parsed.data.address,
        phone: parsed.data.phone,
      },
    });

    revalidatePath("/super-admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to create university:", error);
    return { error: "เกิดข้อผิดพลาดในการบันทึกข้อมูลมหาวิทยาลัย" };
  }
}

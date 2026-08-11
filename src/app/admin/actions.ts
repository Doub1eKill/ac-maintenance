"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  syncOverdueMaintenanceWorkOrders,
  businessDateToday,
  businessDateFrom,
  getMaintenanceHistory,
} from "@/lib/maintenance";
import { ORGANISATION_NAME } from "@/lib/organisation";
import { format, subDays } from "date-fns";

// How many work orders the board loads at once. Not exported directly (a
// "use server" file may only export async functions) — the UI receives it as
// getOrgAdminData().workOrderPage.pageSize so it can render real paging
// controls instead of silently showing only the newest page.
const WORK_ORDER_PAGE_SIZE = 50;

async function verifyOrgAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "org_admin") {
    throw new Error("Unauthorized: Org Admin access required");
  }
  return session;
}

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
      prisma.workOrder.findMany({
        select: {
          id: true,
          status: true,
          priority: true,
          issueDescription: true,
          resolutionNotes: true,
          images: true,
          assignedAt: true,
          claimedAt: true,
          completedAt: true,
          createdAt: true,
          airConditionerId: true,
          airConditioner: {
            select: {
              acCode: true,
              brand: true,
              btu: true,
              // The unit's own condition, surfaced as `acStatus` below so the
              // board can label a row repair vs. cleaning. Nothing stores a
              // job type for a work order itself, so this is the same signal
              // the technician view and the calendar already infer from.
              status: true,
              room: {
                select: {
                  name: true,
                  building: { select: { name: true, abbreviation: true } },
                },
              },
              acBrand: { select: { name: true } },
            },
          },
          claimedByUser: { select: { name: true } },
          reportedByUser: { select: { name: true } },
          assignedToUser: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
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
          phones: {
            where: { isPrimary: true },
            select: { phoneNumber: true },
            take: 1,
          },
        },
      }),
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

    const workOrders = workOrdersRaw.map((wo) => ({
      id: wo.id.toString(),
      acCode: wo.airConditioner.acCode,
      brand: wo.airConditioner.acBrand?.name || wo.airConditioner.brand || "ไม่ระบุ",
      btu: wo.airConditioner.btu,
      // Named apart from `status` below, which is the work order's own status
      // (pending/claimed/...). "broken" -> repair job, anything else -> cleaning.
      acStatus: wo.airConditioner.status,
      location: `${wo.airConditioner.room.building.name} (${wo.airConditioner.room.building.abbreviation}) - ห้อง ${wo.airConditioner.room.name}`,
      status: wo.status,
      priority: wo.priority,
      issueDescription: wo.issueDescription,
      resolutionNotes: wo.resolutionNotes,
      images: wo.images,
      reportedByName: wo.reportedByUser?.name || null,
      assignedToName: wo.assignedToUser?.name || null,
      assignedAt: wo.assignedAt ? wo.assignedAt.toISOString() : null,
      claimedByName: wo.claimedByUser?.name || null,
      claimedAt: wo.claimedAt ? wo.claimedAt.toISOString() : null,
      completedAt: wo.completedAt ? wo.completedAt.toISOString() : null,
      createdAt: wo.createdAt ? wo.createdAt.toISOString() : null,
      airConditionerId: wo.airConditionerId.toString(),
    }));

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

    return {
      dbError: null,
      // Still the university's name, just no longer a per-tenant lookup —
      // the field keeps its name so the UI reading it needs no change.
      universityName: ORGANISATION_NAME,
      // Everything the profile card needs, in one place. Falls back to the
      // session values only if the row somehow can't be read.
      profile: {
        name: currentUser?.name ?? session.user.name ?? "",
        email: currentUser?.email ?? session.user.email ?? "",
        role: currentUser?.role ?? session.user.role,
        phone: currentUser?.phones[0]?.phoneNumber ?? null,
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
      universityName: ORGANISATION_NAME,
      // Session-only fallback: the database is unreachable on this path, so
      // the card still renders with whatever the JWT carries.
      profile: {
        name: session.user.name ?? "",
        email: session.user.email ?? "",
        role: session.user.role,
        phone: null,
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

export async function updateUserStatusByOrgAdminAction(
  targetUserId: string,
  newStatus: "active" | "suspended"
) {
  const session = await verifyOrgAdmin();

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: BigInt(targetUserId) },
      select: { id: true },
    });

    if (!targetUser) {
      return { error: "ไม่พบผู้ใช้" };
    }

    await prisma.user.update({
      where: { id: BigInt(targetUserId) },
      data: { status: newStatus },
    });

    console.log(
      `[AUDIT TRAIL] User status updated by OrgAdmin (AdminID: ${session.user.id}): TargetUser ${targetUserId} -> Status: ${newStatus} at ${new Date().toISOString()}`
    );

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to update user status by org admin:", error);
    return { error: "ไม่สามารถอัปเดตสถานะผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง" };
  }
}

const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "กรุณากรอกชื่อ-นามสกุล")
    .max(255, "ชื่อ-นามสกุลยาวเกินไป"),
  // Left deliberately permissive — Thai numbers get written with and without
  // spaces, dashes and a +66 prefix, and rejecting a real number a user typed
  // their own way is worse here than storing it slightly unevenly.
  phone: z
    .string()
    .trim()
    .max(20, "เบอร์โทรศัพท์ยาวเกินไป")
    .refine(
      (v) => v === "" || /^[\d+\-\s()]{9,20}$/.test(v),
      "รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง"
    )
    .optional(),
});

/**
 * Updates the signed-in user's own name and primary phone number.
 *
 * Guarded on the session alone rather than through verifyOrgAdmin(): it only
 * ever writes to the caller's own row, so there's nothing a technician could
 * reach here that they shouldn't, and the technician profile page planned in
 * F5 can reuse this instead of a near-identical copy under tech/.
 *
 * `phone` distinguishes three cases: omitted leaves the number untouched, ""
 * clears it, and a value replaces it. The previous number is deleted, not
 * kept as a secondary — see the transaction below.
 */
export async function updateProfileAction(name: string, phone?: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "active") {
    throw new Error("Unauthorized: sign-in required");
  }

  const parsed = updateProfileSchema.safeParse({ name, phone });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" };
  }

  const userId = BigInt(session.user.id);
  const { name: newName, phone: newPhone } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { name: newName },
      });

      if (newPhone === undefined) return;

      // Replace the old number rather than demoting it to a secondary. The
      // profile form exposes a single phone field, so a number the user typed
      // over should not survive as a row they can neither see nor delete.
      // Only the primary is removed — any secondary numbers on the account
      // were recorded elsewhere and aren't this form's to discard.
      await tx.userPhone.deleteMany({ where: { userId, isPrimary: true } });

      if (newPhone === "") return;

      // The new number may already exist as one of those secondaries, and
      // [userId, phoneNumber] is unique — promote that row instead of
      // inserting a duplicate that would violate the constraint.
      const existing = await tx.userPhone.findUnique({
        where: { userId_phoneNumber: { userId, phoneNumber: newPhone } },
        select: { id: true },
      });

      if (existing) {
        await tx.userPhone.update({
          where: { id: existing.id },
          data: { isPrimary: true },
        });
      } else {
        await tx.userPhone.create({
          data: { userId, phoneNumber: newPhone, isPrimary: true },
        });
      }
    });

    revalidatePath(session.user.role === "technician" ? "/tech" : "/admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to update own profile:", error);
    return { error: "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง" };
  }
}

const createWorkOrderSchema = z.object({
  airConditionerId: z.string().min(1, "กรุณาเลือกเครื่องปรับอากาศ"),
  assignToUserId: z.string().optional(),
});

export async function createWorkOrderAction(formData: FormData) {
  const session = await verifyOrgAdmin();

  const raw = {
    airConditionerId: formData.get("airConditionerId"),
    assignToUserId: formData.get("assignToUserId") || undefined,
  };

  const parsed = createWorkOrderSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" };
  }

  try {
    const acId = BigInt(parsed.data.airConditionerId);
    const assignTo = parsed.data.assignToUserId ? BigInt(parsed.data.assignToUserId) : null;

    // Create Work Order
    const workOrder = await prisma.workOrder.create({
      data: {
        airConditionerId: acId,
        status: assignTo ? "claimed" : "pending",
        claimedBy: assignTo,
        claimedAt: assignTo ? new Date() : null,
      },
    });

    await logAudit({
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

export async function assignWorkOrderAction(workOrderId: string, assignToUserId: string) {
  const session = await verifyOrgAdmin();

  try {
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: BigInt(workOrderId) },
      select: { status: true },
    });

    if (!workOrder) {
      return { error: "ไม่พบใบงานซ่อมบำรุง" };
    }
    if (workOrder.status !== "pending") {
      return { error: "ไม่สามารถมอบหมายงานได้ (งานอาจถูกรับไปแล้ว)" };
    }

    const techUser = await prisma.user.findUnique({
      where: { id: BigInt(assignToUserId) },
      select: { role: true, status: true },
    });

    if (!techUser || techUser.role !== "technician" || techUser.status !== "active") {
      return { error: "ไม่พบข้อมูลช่างเทคนิค หรือช่างเทคนิคไม่ได้อยู่ในสถานะที่พร้อมรับงาน" };
    }

    await prisma.workOrder.update({
      where: { id: BigInt(workOrderId) },
      data: {
        status: "claimed",
        claimedBy: BigInt(assignToUserId),
        claimedAt: new Date(),
      },
    });

    await logAudit({
      userId: BigInt(session.user.id!),
      action: "ASSIGN_WORKORDER",
      entityType: "workOrder",
      entityId: BigInt(workOrderId),
      newValues: { status: "claimed", claimedBy: assignToUserId },
      ipAddress: "server_action",
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to assign work order:", error);
    return { error: "ไม่สามารถมอบหมายงานได้ กรุณาลองใหม่อีกครั้ง" };
  }
}

const buildingSchema = z.object({
  name: z.string().min(1, "กรุณาระบุชื่ออาคาร"),
  abbreviation: z.string().min(1, "กรุณาระบุตัวย่ออาคาร"),
});

export async function createBuildingAction(formData: FormData) {
  await verifyOrgAdmin();

  const parsed = buildingSchema.safeParse({
    name: formData.get("name"),
    abbreviation: formData.get("abbreviation"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" };

  try {
    const existing = await prisma.building.findFirst({
      where: {
        OR: [
          { name: parsed.data.name },
          { abbreviation: parsed.data.abbreviation }
        ]
      }
    });

    if (existing) return { error: "มีชื่อหรือตัวย่ออาคารนี้ในระบบแล้ว" };

    await prisma.building.create({
      data: {
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
  await verifyOrgAdmin();

  const parsed = roomSchema.safeParse({
    buildingId: formData.get("buildingId"),
    name: formData.get("name"),
    floor: formData.get("floor"),
  });
  
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" };
  
  try {
    const building = await prisma.building.findUnique({
      where: { id: BigInt(parsed.data.buildingId) }
    });

    if (!building) {
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
  btu: z.string().transform(val => val ? parseInt(val, 10) : null).nullable(),
  // Optional: an empty field means "today", handled below. Only the shape is
  // checked here so the error message can name the field.
  installedAt: z
    .string()
    .trim()
    .refine((v) => v === "" || businessDateFrom(v) !== null, "วันที่ติดตั้งไม่ถูกต้อง")
    .optional(),
});

export async function createAirConditionerAction(formData: FormData) {
  await verifyOrgAdmin();

  // Every optional field is read with `?? undefined`. The form renders only
  // one of the two brand branches at a time, so the inputs belonging to the
  // other one are absent from the DOM entirely and formData.get() returns
  // null for them — and z.string().optional() accepts undefined but rejects
  // null, which failed the whole parse with a bare "Invalid input" no matter
  // which branch was used.
  const parsed = acSchema.safeParse({
    roomId: formData.get("roomId"),
    brandType: formData.get("brandType"),
    acModelId: formData.get("acModelId") ?? undefined,
    customBrand: formData.get("customBrand") ?? undefined,
    customModel: formData.get("customModel") ?? undefined,
    btu: formData.get("btu"),
    installedAt: formData.get("installedAt") ?? undefined,
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
    const room = await prisma.room.findUnique({
      where: { id: BigInt(data.roomId) },
      include: { building: true, airConditioners: true }
    });

    if (!room) {
      return { error: "ห้องไม่ถูกต้อง" };
    }

    // Generate AC Code: [BLDG]-[ROOM]-[NN]. The university segment this used
    // to carry was dropped along with multi-tenancy — one institution means
    // the building abbreviation is already unique on its own.
    const unitCount = room.airConditioners.length + 1;
    const acCode = `${room.building.abbreviation}-${room.name}-${unitCount.toString().padStart(2, '0')}`;
    const qrCode = crypto.randomUUID();
    
    // installed_at is a DATE column, so it needs a calendar day anchored at
    // UTC midnight — not `new Date()`, whose UTC date is still yesterday
    // between 00:00 and 07:00 here (the same trap P16 fixed for the
    // maintenance schedule dates). Left blank, registration means today.
    const installedAt = data.installedAt
      ? businessDateFrom(data.installedAt)
      : businessDateToday();

    let dbData: any = {
      roomId: room.id,
      acCode,
      qrCode,
      btu: data.btu,
      installedAt,
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

/**
 * One unit's full service record, for the "ดูประวัติ" view in the asset
 * manager. Returns the unit's identifying details alongside the log so the
 * caller can title the panel without a second round trip.
 *
 * Guarded on an active session rather than on org_admin: the same history is
 * already public on the QR page, so restricting it further here would only
 * stop a technician reusing this, not protect anything.
 */
export async function getAirConditionerHistory(airConditionerId: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "active") {
    throw new Error("Unauthorized: sign-in required");
  }

  let acId: bigint;
  try {
    acId = BigInt(airConditionerId);
  } catch {
    return { error: "รหัสเครื่องปรับอากาศไม่ถูกต้อง" };
  }

  try {
    const [ac, history] = await Promise.all([
      prisma.airConditioner.findUnique({
        where: { id: acId },
        select: {
          acCode: true,
          brand: true,
          model: true,
          btu: true,
          status: true,
          installedAt: true,
          acBrand: { select: { name: true } },
          acModel: { select: { name: true } },
          room: {
            select: { name: true, building: { select: { name: true } } },
          },
        },
      }),
      getMaintenanceHistory(acId),
    ]);

    if (!ac) return { error: "ไม่พบเครื่องปรับอากาศ" };

    return {
      unit: {
        acCode: ac.acCode,
        brand: ac.acBrand?.name ?? ac.brand ?? "ไม่ระบุ",
        model: ac.acModel?.name ?? ac.model ?? null,
        btu: ac.btu,
        status: ac.status,
        location: `${ac.room.building.name} - ห้อง ${ac.room.name}`,
        installedAt: ac.installedAt ? ac.installedAt.toISOString() : null,
      },
      history,
    };
  } catch (error) {
    console.error("Failed to load air conditioner history:", error);
    return { error: "ไม่สามารถโหลดประวัติการซ่อมบำรุงได้" };
  }
}

const scheduleSchema = z.object({
  airConditionerId: z.string().min(1, "กรุณาเลือกเครื่องปรับอากาศ"),
  frequencyValue: z.string().transform(val => parseInt(val, 10)),
  frequencyUnit: z.enum(["days", "months", "years"]),
});

export async function saveMaintenanceScheduleAction(formData: FormData) {
  await verifyOrgAdmin();

  const parsed = scheduleSchema.safeParse({
    airConditionerId: formData.get("airConditionerId"),
    frequencyValue: formData.get("frequencyValue"),
    frequencyUnit: formData.get("frequencyUnit"),
  });
  
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" };
  const data = parsed.data;

  try {
    const ac = await prisma.airConditioner.findUnique({
      where: { id: BigInt(data.airConditionerId) },
      select: { id: true }
    });

    if (!ac) {
      return { error: "ไม่พบเครื่องปรับอากาศ" };
    }

    // Calculate nextDueDate
    let nextDueDate = new Date();
    if (data.frequencyUnit === "days") {
      nextDueDate.setDate(nextDueDate.getDate() + data.frequencyValue);
    } else if (data.frequencyUnit === "months") {
      nextDueDate.setMonth(nextDueDate.getMonth() + data.frequencyValue);
    } else if (data.frequencyUnit === "years") {
      nextDueDate.setFullYear(nextDueDate.getFullYear() + data.frequencyValue);
    }

    const existingSchedule = await prisma.maintenanceSchedule.findFirst({
      where: { airConditionerId: BigInt(data.airConditionerId) }
    });

    if (existingSchedule) {
      await prisma.maintenanceSchedule.update({
        where: { id: existingSchedule.id },
        data: {
          frequencyValue: data.frequencyValue,
          frequencyUnit: data.frequencyUnit,
          nextDueDate
        }
      });
    } else {
      await prisma.maintenanceSchedule.create({
        data: {
          airConditionerId: BigInt(data.airConditionerId),
          frequencyValue: data.frequencyValue,
          frequencyUnit: data.frequencyUnit,
          nextDueDate,
          isActive: true
        }
      });
    }

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "เกิดข้อผิดพลาดในการบันทึกรอบการบำรุงรักษา" };
  }
}

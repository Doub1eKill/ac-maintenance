import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { businessDateToday, businessDateFrom, addMaintenanceInterval, getMaintenanceHistory } from "@/lib/maintenance";
import { getDefaultMaintenanceFrequency } from "@/lib/organisation";
import { verifyOrgAdmin } from "@/lib/auth-guards";
import { catalogueFlags } from "@/lib/catalogue-status";

const buildingSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "กรุณาระบุชื่ออาคาร")
    // A name that's only digits (e.g. "20") reads as an abbreviation, not a
    // name -- once combined with the real abbreviation for display it comes
    // out as a confusing "20 (20)" instead of a place someone can recognize.
    // Thai digits count too — "๒๐" reads exactly the same way to a reader as
    // "20" does, and \d alone matches only the ASCII ones.
    .refine((v) => !/^[\d๐-๙]+$/.test(v), 'ชื่ออาคารต้องไม่เป็นตัวเลขล้วน กรุณาระบุชื่อจริง เช่น "อาคารเรียนรวม"'),
  abbreviation: z.string().trim().min(1, "กรุณาระบุตัวย่ออาคาร"),
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
      // findFirst rather than findUnique: a retired model — or one whose brand
      // was retired — is still a row with that id, and accepting it here would
      // put a new unit onto a model the catalogue no longer offers. It reads
      // back as "not found", which is what it is as far as the form goes.
      const model = await prisma.acModel.findFirst({
        where: { id: BigInt(data.acModelId!), deletedAt: null, brand: { deletedAt: null } }
      });
      if (!model) return { error: "ไม่พบรุ่นแอร์ที่เลือก" };
      
      dbData.acBrandId = model.brandId;
      dbData.acModelId = model.id;
    } else {
      dbData.brand = data.customBrand;
      dbData.model = data.customModel;
    }
    
    // A unit registered without a maintenance schedule is invisible to the
    // overdue check — it would never be flagged for cleaning until somebody
    // noticed and set a cycle by hand. Nothing created one before now; the
    // 189 that exist came from a one-off backfill, so every unit added since
    // has been in that blind spot. Created here, in the same transaction as
    // the unit, using the default cycle from settings.
    const { value: frequencyValue, unit: frequencyUnit } =
      await getDefaultMaintenanceFrequency();

    await prisma.$transaction(async (tx) => {
      const ac = await tx.airConditioner.create({ data: dbData, select: { id: true } });

      await tx.maintenanceSchedule.create({
        data: {
          airConditionerId: ac.id,
          frequencyValue,
          frequencyUnit,
          nextDueDate: firstDueDateFor(installedAt, frequencyValue, frequencyUnit),
          isActive: true,
        },
      });
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "เกิดข้อผิดพลาดในการลงทะเบียนแอร์" };
  }
}

// How far back an installation date can be before the unit is treated as due
// straight away rather than being given a cycle counted from installation.
const OVERDUE_ON_REGISTRATION_MONTHS = 6;

/**
 * When a unit's first cleaning falls due.
 *
 * Counting from the installation date is what makes a unit installed three
 * months ago on a six-month cycle come due in three months rather than six.
 * But units are often registered long after they were installed, and counting
 * from a date years back would produce a due date equally far in the past —
 * technically true, useless as a date. Past the cutoff the unit is simply due
 * now: it plainly needs attention, and today is when it got it.
 */
function firstDueDateFor(installedAt: Date | null, value: number, unit: string): Date {
  const today = businessDateToday();
  if (!installedAt) return addMaintenanceInterval(today, value, unit);

  const cutoff = addMaintenanceInterval(today, -OVERDUE_ON_REGISTRATION_MONTHS, "months");
  if (installedAt < cutoff) return today;

  return addMaintenanceInterval(installedAt, value, unit);
}

const updateAcSchema = z.object({
  airConditionerId: z.string().min(1, "ไม่พบเครื่องปรับอากาศ"),
  brandType: z.enum(["master", "other"]),
  acModelId: z.string().optional(),
  customBrand: z.string().optional(),
  customModel: z.string().optional(),
  btu: z.string().transform((val) => (val ? parseInt(val, 10) : null)).nullable(),
  status: z.enum(["normal", "broken", "needs_cleaning"]),
  installedAt: z
    .string()
    .trim()
    .refine((v) => v === "" || businessDateFrom(v) !== null, "วันที่ติดตั้งไม่ถูกต้อง")
    .optional(),
});

/**
 * Corrects a unit's own record: what it is, when it was installed, and what
 * condition it is in.
 *
 * Deliberately cannot move a unit to another room. acCode is derived from the
 * building and room at registration and is printed on the QR sticker, so a
 * move would either invalidate the label or leave the code describing a place
 * the unit no longer is — and the schema's comment on WorkOrder relies on
 * roomId never changing.
 *
 * Status is editable here because the usual reason to touch it is a mistake:
 * a unit marked broken by a report against the wrong machine has no other way
 * back to normal. Note this only rewrites the unit's condition — an open work
 * order raised for it stays open, since cancelling someone's job is a
 * different decision from correcting a status.
 */
export async function updateAirConditionerAction(formData: FormData) {
  const session = await verifyOrgAdmin();

  const parsed = updateAcSchema.safeParse({
    airConditionerId: formData.get("airConditionerId"),
    brandType: formData.get("brandType"),
    acModelId: formData.get("acModelId") ?? undefined,
    customBrand: formData.get("customBrand") ?? undefined,
    customModel: formData.get("customModel") ?? undefined,
    btu: formData.get("btu"),
    status: formData.get("status"),
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
    const acId = BigInt(data.airConditionerId);
    const existing = await prisma.airConditioner.findUnique({
      where: { id: acId },
      select: { id: true, status: true, btu: true, installedAt: true },
    });

    if (!existing) return { error: "ไม่พบเครื่องปรับอากาศ" };

    // The two brand paths are mutually exclusive: switching to a catalogue
    // model must clear the typed-in text, and switching away must clear the
    // foreign keys, or the unit would keep answering to whichever the display
    // code happens to prefer.
    const brandFields =
      data.brandType === "master"
        ? await (async () => {
            // Retired models filtered out here too, for the reason given in
            // createAirConditionerAction.
            const model = await prisma.acModel.findFirst({
              where: { id: BigInt(data.acModelId!), deletedAt: null, brand: { deletedAt: null } },
              select: { id: true, brandId: true },
            });
            if (!model) return null;
            return { acBrandId: model.brandId, acModelId: model.id, brand: null, model: null };
          })()
        : { acBrandId: null, acModelId: null, brand: data.customBrand, model: data.customModel ?? null };

    if (!brandFields) return { error: "ไม่พบรุ่นแอร์ที่เลือก" };

    await prisma.airConditioner.update({
      where: { id: acId },
      data: {
        ...brandFields,
        btu: data.btu,
        status: data.status,
        installedAt: data.installedAt ? businessDateFrom(data.installedAt) : null,
      },
    });

    await logAudit({
      userId: BigInt(session.user.id!),
      action: "UPDATE_AIRCONDITIONER",
      entityType: "airConditioner",
      entityId: acId,
      oldValues: {
        status: existing.status,
        btu: existing.btu,
        installedAt: existing.installedAt?.toISOString() ?? null,
      },
      newValues: {
        status: data.status,
        btu: data.btu,
        installedAt: data.installedAt || null,
      },
      ipAddress: "server_action",
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to update air conditioner:", error);
    return { error: "ไม่สามารถบันทึกข้อมูลเครื่องปรับอากาศได้" };
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
          acBrand: { select: { name: true, deletedAt: true } },
          acModel: { select: { name: true, deletedAt: true } },
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
        ...catalogueFlags(ac),
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

const updateLogSchema = z.object({
  logId: z.string().min(1),
  action: z.enum(["cleaning", "repair", "refill_refrigerant"]),
  notes: z.string().trim().optional(),
  repairDetail: z.string().trim().optional(),
});

/**
 * Corrects a maintenance log a technician got wrong — the job type they
 * ticked, the note they wrote, or what they said was repaired.
 *
 * A technician may only correct their own entries; an org admin may correct
 * any. The ownership check reads userId from the row itself rather than
 * trusting anything the client sends, so a technician cannot edit a
 * colleague's work by passing someone else's log id.
 *
 * What it will not touch: performedAt, the photos, and which unit the log
 * belongs to. Those are the parts that make the entry evidence of a
 * particular visit — a wrong one should be raised with an admin, not quietly
 * rewritten. Every change is written to the audit log with its previous
 * values, since this edits history rather than current state.
 */
export async function updateMaintenanceLogAction(
  logId: string,
  action: "cleaning" | "repair" | "refill_refrigerant",
  notes?: string,
  repairDetail?: string
) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "active") {
    throw new Error("Unauthorized: sign-in required");
  }

  const parsed = updateLogSchema.safeParse({ logId, action, notes, repairDetail });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" };
  }
  const data = parsed.data;

  if (data.action === "repair" && !data.repairDetail) {
    return { error: "กรุณาระบุรายละเอียดการซ่อม" };
  }

  let id: bigint;
  try {
    id = BigInt(data.logId);
  } catch {
    return { error: "ไม่พบรายการประวัติ" };
  }

  try {
    const log = await prisma.maintenanceLog.findUnique({
      where: { id },
      select: { id: true, userId: true, action: true, notes: true, repairDetail: true },
    });

    if (!log) return { error: "ไม่พบรายการประวัติ" };

    const isOwner = log.userId.toString() === session.user.id;
    const isAdmin = session.user.role === "org_admin";
    if (!isOwner && !isAdmin) {
      return { error: "แก้ไขได้เฉพาะประวัติที่คุณเป็นผู้บันทึกเท่านั้น" };
    }

    await prisma.maintenanceLog.update({
      where: { id },
      data: {
        action: data.action,
        notes: data.notes || null,
        // Cleared when the entry is no longer a repair, so a corrected job
        // type can't leave repair text stranded on a cleaning record.
        repairDetail: data.action === "repair" ? data.repairDetail : null,
      },
    });

    await logAudit({
      userId: BigInt(session.user.id),
      action: "UPDATE_MAINTENANCE_LOG",
      entityType: "maintenanceLog",
      entityId: id,
      oldValues: { action: log.action, notes: log.notes, repairDetail: log.repairDetail },
      newValues: {
        action: data.action,
        notes: data.notes || null,
        repairDetail: data.action === "repair" ? data.repairDetail : null,
      },
      ipAddress: "server_action",
    });

    revalidatePath("/admin");
    revalidatePath("/tech");
    return { success: true };
  } catch (error) {
    console.error("Failed to update maintenance log:", error);
    return { error: "ไม่สามารถแก้ไขประวัติได้" };
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
    // Was `new Date()` plus local-time setters, which got this wrong three
    // ways against a @db.Date column: the UTC date is still yesterday between
    // midnight and 07:00 here, local setters read the wrong fields off a
    // UTC-midnight anchor, and month arithmetic rolled 31 Jan + 1 month
    // forward into March instead of clamping to the end of February. Both
    // helpers exist for exactly this and were already used everywhere else.
    const nextDueDate = addMaintenanceInterval(
      businessDateToday(),
      data.frequencyValue,
      data.frequencyUnit
    );

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

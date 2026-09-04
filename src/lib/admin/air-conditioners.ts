import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { businessDateToday, businessDateFrom, addMaintenanceInterval } from "@/lib/maintenance";
import { getDefaultMaintenanceFrequency } from "@/lib/organisation";
import { verifyOrgAdmin } from "@/lib/auth-guards";

// Registering and editing an air conditioner. The longest of the five asset
// modules, because creating a unit also mints its QR code and opens its first
// maintenance schedule.
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


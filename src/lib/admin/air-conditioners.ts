import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { logAudit } from "@/lib/audit";
import { businessDateToday, businessDateFrom, addMaintenanceInterval } from "@/lib/maintenance";
import { getDefaultMaintenanceFrequency } from "@/lib/organisation";
import { verifyAssetEditor } from "@/lib/auth-guards";
import { saveUpload, deleteUpload } from "@/lib/upload";

/**
 * A unique-constraint violation coming back from Prisma.
 *
 * Only ac_code and qr_code are unique on the insert below, and qr_code is a
 * freshly minted uuid, so in practice this means the sequence number lost a
 * race. Matched on the code alone rather than on meta.target, whose shape
 * differs between the driver adapters.
 */
function isUniqueConflict(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002"
  );
}

// How many times to recompute the sequence number before giving up.
const MAX_AC_CODE_ATTEMPTS = 5;

// Blank means "not given"; anything else must be a whole positive number.
// The column is UnsignedInt, and MariaDB clamps a negative to 0 without a
// word — "-5" typed into the form came back as a 0 BTU unit (QA
// 20260913-1742, BUG-006); PostgreSQL would have stored the -5. Checked here
// so both forms and both branches get the same answer.
const btuField = z
  .string()
  .nullable()
  .transform((val) => (val ? parseInt(val, 10) : null))
  .refine(
    (v) => v === null || (Number.isInteger(v) && v > 0),
    "ขนาด BTU ต้องเป็นจำนวนเต็มมากกว่า 0"
  );

// Registering and editing an air conditioner. The longest of the five asset
// modules, because creating a unit also mints its QR code and opens its first
// maintenance schedule.
const acSchema = z.object({
  roomId: z.string().min(1, "กรุณาเลือกห้อง"),
  brandType: z.enum(["master", "other"]),
  acModelId: z.string().optional(),
  customBrand: z.string().optional(),
  customModel: z.string().optional(),
  btu: btuField,
  // Optional: an empty field means "today", handled below. Only the shape is
  // checked here so the error message can name the field.
  installedAt: z
    .string()
    .trim()
    .refine((v) => v === "" || businessDateFrom(v) !== null, "วันที่ติดตั้งไม่ถูกต้อง")
    .optional(),
});

export async function createAirConditionerAction(formData: FormData) {
  const session = await verifyAssetEditor();

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

  // The unit's own picture is part of registering it: the sticker page shows
  // it first, to a visitor who has nothing else to go on. Required here, not
  // only in the forms, because the forms are a courtesy and this is the guard.
  // Stored before the row so a failure to store it fails registration, and
  // removed again if the row never happens.
  const photoFile = formData.get("photo");
  if (!(photoFile instanceof File) || photoFile.size === 0) {
    return { error: "กรุณาแนบรูปเครื่องปรับอากาศ 1 รูป" };
  }
  const photoUrl = await saveUpload(photoFile);
  if (!photoUrl) return { error: "ไฟล์รูปเครื่องปรับอากาศอ่านไม่ได้ กรุณาเลือกรูปภาพอื่น" };

  try {
    const room = await prisma.room.findUnique({
      where: { id: BigInt(data.roomId) },
      select: { id: true, name: true, building: { select: { abbreviation: true } } }
    });

    if (!room) {
      await deleteUpload(photoUrl);
      return { error: "ห้องไม่ถูกต้อง" };
    }

    // installed_at is a DATE column, so it needs a calendar day anchored at
    // UTC midnight — not `new Date()`, whose UTC date is still yesterday
    // between 00:00 and 07:00 here (the same trap P16 fixed for the
    // maintenance schedule dates). Left blank, registration means today.
    const installedAt = data.installedAt
      ? businessDateFrom(data.installedAt)
      : businessDateToday();

    // acCode and qrCode are added at the insert, once the sequence is known.
    const dbData: Omit<Prisma.AirConditionerUncheckedCreateInput, "acCode" | "qrCode"> = {
      roomId: room.id,
      btu: data.btu,
      installedAt,
      photoUrl,
    };

    if (data.brandType === "master") {
      // findFirst rather than findUnique: a retired model — or one whose brand
      // was retired — is still a row with that id, and accepting it here would
      // put a new unit onto a model the catalogue no longer offers. It reads
      // back as "not found", which is what it is as far as the form goes.
      const model = await prisma.acModel.findFirst({
        where: { id: BigInt(data.acModelId!), deletedAt: null, brand: { deletedAt: null } }
      });
      if (!model) {
        await deleteUpload(photoUrl);
        return { error: "ไม่พบรุ่นแอร์ที่เลือก" };
      }
      
      dbData.acBrandId = model.brandId;
      dbData.acModelId = model.id;
      // The admin form shows no BTU field on this branch — the size is the
      // model's — so btu arrives null. It used to be stored that way, and
      // every unit registered from the catalogue printed "ไม่ระบุ BTU" on
      // its sticker and had no size on the board (QA 20260913-1742,
      // BUG-005). The model's default is the unit's size unless the form
      // sent one of its own (the technician's form has a field).
      dbData.btu = data.btu ?? model.defaultBtu;
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

    // acCode is [BLDG]-[ROOM]-[NN]; the university segment it used to carry
    // went away with multi-tenancy, since one institution makes the building
    // abbreviation unique on its own. No floor segment on purpose: rooms are
    // already unique per building by constraint, both datasets encode the floor
    // in the room name, rooms.floor is nullable, and this string is printed on
    // a sticker and never changes while the floor can be corrected at any time.
    //
    // The sequence is counted, not stored, so two people registering into the
    // same room at once compute the same number. One admin could not race
    // themselves; technicians in the field can. Recount and try again rather
    // than hold a row lock: locking would mean raw SQL, and src/ has none —
    // which is what kept the move to PostgreSQL a mechanical job.
    //
    // `+ attempt` rather than `+ 1` so a room whose codes have a gap in them
    // (a unit hard-deleted long ago) climbs past the gap instead of retrying
    // onto the same taken number until it runs out of attempts.
    let created: { id: bigint; acCode: string } | null = null;

    for (let attempt = 1; attempt <= MAX_AC_CODE_ATTEMPTS; attempt++) {
      // Soft-deleted units are counted deliberately: skipping them would hand
      // a new unit the code of a retired one, which is still a row under the
      // same unique index.
      const unitCount = await prisma.airConditioner.count({ where: { roomId: room.id } });
      const sequence = unitCount + attempt;
      const acCode = `${room.building.abbreviation}-${room.name}-${sequence.toString().padStart(2, "0")}`;

      try {
        created = await prisma.$transaction(async (tx) => {
          const ac = await tx.airConditioner.create({
            data: { ...dbData, acCode, qrCode: crypto.randomUUID() },
            select: { id: true, acCode: true },
          });

          await tx.maintenanceSchedule.create({
            data: {
              airConditionerId: ac.id,
              frequencyValue,
              frequencyUnit,
              nextDueDate: firstDueDateFor(installedAt, frequencyValue, frequencyUnit),
              isActive: true,
            },
          });

          return ac;
        });
        break;
      } catch (error) {
        if (!isUniqueConflict(error) || attempt === MAX_AC_CODE_ATTEMPTS) throw error;
        console.warn(`[ac-code] ${acCode} taken, recomputing (attempt ${attempt})`);
      }
    }

    if (!created) {
      await deleteUpload(photoUrl);
      return { error: "ไม่สามารถสร้างรหัสแอร์ที่ไม่ซ้ำได้ กรุณาลองใหม่อีกครั้ง" };
    }

    await logAudit({
      userId: BigInt(session.user.id!),
      action: "CREATE_AIRCONDITIONER",
      entityType: "airConditioner",
      entityId: created.id,
      newValues: {
        acCode: created.acCode,
        roomId: room.id.toString(),
        // What was stored, not what the form sent — the two differ for a
        // catalogue model (see above).
        btu: dbData.btu,
        installedAt: installedAt?.toISOString() ?? null,
      },
      ipAddress: "server_action",
    });

    revalidatePath("/admin", "layout");
    revalidatePath("/tech", "layout");
    return { success: true, acCode: created.acCode };
  } catch (error) {
    console.error(error);
    await deleteUpload(photoUrl);
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
  btu: btuField,
  // status and installedAt are optional so a form can edit only what it shows.
  // Absent means "leave it alone"; an empty installedAt still means "clear it".
  // formData.get() gives null for a field that is not in the DOM and "" for one
  // rendered empty, which is exactly the distinction needed — the technician's
  // model/BTU panel does not show either field, and without this it would blank
  // the install date and reset the status every time it saved.
  status: z.enum(["normal", "broken", "needs_cleaning"]).optional(),
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
  const session = await verifyAssetEditor();

  const parsed = updateAcSchema.safeParse({
    airConditionerId: formData.get("airConditionerId"),
    brandType: formData.get("brandType"),
    acModelId: formData.get("acModelId") ?? undefined,
    customBrand: formData.get("customBrand") ?? undefined,
    customModel: formData.get("customModel") ?? undefined,
    btu: formData.get("btu"),
    status: formData.get("status") ?? undefined,
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
      select: { id: true, status: true, btu: true, installedAt: true, photoUrl: true },
    });

    if (!existing) return { error: "ไม่พบเครื่องปรับอากาศ" };

    // A new picture replaces the stored one; no file means keep it. Units
    // registered before the field existed have none, and this is where they
    // get one. Stored first so a bad file fails the save before anything is
    // written; the old picture is removed only once the row points elsewhere.
    const photoFile = formData.get("photo");
    let newPhotoUrl: string | null = null;
    if (photoFile instanceof File && photoFile.size > 0) {
      newPhotoUrl = await saveUpload(photoFile);
      if (!newPhotoUrl) return { error: "ไฟล์รูปเครื่องปรับอากาศอ่านไม่ได้ กรุณาเลือกรูปภาพอื่น" };
    }

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
              select: { id: true, brandId: true, defaultBtu: true },
            });
            if (!model) return null;
            return {
              acBrandId: model.brandId,
              acModelId: model.id,
              brand: null,
              model: null,
              // Same rule as createAirConditionerAction: a catalogue model
              // chosen without a size takes the model's default.
              btu: data.btu ?? model.defaultBtu,
            };
          })()
        : { acBrandId: null, acModelId: null, brand: data.customBrand, model: data.customModel ?? null, btu: data.btu };

    if (!brandFields) {
      await deleteUpload(newPhotoUrl);
      return { error: "ไม่พบรุ่นแอร์ที่เลือก" };
    }

    await prisma.airConditioner.update({
      where: { id: acId },
      data: {
        ...brandFields,
        ...(newPhotoUrl ? { photoUrl: newPhotoUrl } : {}),
        // Both left out of the update entirely when the form did not send them,
        // rather than written as null. See the schema comment above.
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.installedAt !== undefined
          ? { installedAt: data.installedAt ? businessDateFrom(data.installedAt) : null }
          : {}),
      },
    });

    // The row no longer references the old picture; nothing else does either.
    if (newPhotoUrl && existing.photoUrl && existing.photoUrl !== newPhotoUrl) {
      await deleteUpload(existing.photoUrl);
    }

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
        status: data.status ?? existing.status,
        btu: brandFields.btu,
        ...(newPhotoUrl ? { photoUrl: newPhotoUrl } : {}),
        installedAt:
          data.installedAt !== undefined
            ? data.installedAt || null
            : existing.installedAt?.toISOString() ?? null,
      },
      ipAddress: "server_action",
    });

    revalidatePath("/admin", "layout");
    revalidatePath("/tech", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to update air conditioner:", error);
    return { error: "ไม่สามารถบันทึกข้อมูลเครื่องปรับอากาศได้" };
  }
}


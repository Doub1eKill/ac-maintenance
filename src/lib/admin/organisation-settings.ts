import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getOrganisationInfo } from "@/lib/organisation";
import { verifyOrgAdmin } from "@/lib/auth-guards";

// Organisation-wide settings: the default maintenance cycle and the university
// details shown in the header and on public pages. Both live in system_settings,
// which is a single fixed row.
const SETTINGS_ID = 1;

const defaultFrequencySchema = z.object({
  value: z.number().int().positive("รอบบำรุงรักษาต้องมากกว่า 0"),
  unit: z.enum(["days", "months", "years"]),
});

/**
 * Sets the maintenance cycle given to units registered from here on.
 * Existing units keep the cycle they already have — this never rewrites them.
 */
export async function updateDefaultFrequencyAction(value: number, unit: string) {
  const session = await verifyOrgAdmin();

  const parsed = defaultFrequencySchema.safeParse({ value, unit });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" };
  }

  try {
    const before = await prisma.systemSettings.findUnique({
      where: { id: SETTINGS_ID },
      select: { defaultFrequencyValue: true, defaultFrequencyUnit: true },
    });

    // upsert rather than update: the row is created by migration, but this
    // stays correct on a database where that somehow didn't happen.
    await prisma.systemSettings.upsert({
      where: { id: SETTINGS_ID },
      update: { defaultFrequencyValue: parsed.data.value, defaultFrequencyUnit: parsed.data.unit },
      create: {
        id: SETTINGS_ID,
        defaultFrequencyValue: parsed.data.value,
        defaultFrequencyUnit: parsed.data.unit,
      },
    });

    await logAudit({
      userId: BigInt(session.user.id!),
      action: "UPDATE_DEFAULT_FREQUENCY",
      entityType: "systemSettings",
      entityId: BigInt(SETTINGS_ID),
      oldValues: before
        ? { value: before.defaultFrequencyValue, unit: before.defaultFrequencyUnit }
        : undefined,
      newValues: { value: parsed.data.value, unit: parsed.data.unit },
      ipAddress: "server_action",
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to update default frequency:", error);
    return { error: "ไม่สามารถบันทึกรอบบำรุงรักษาเริ่มต้นได้" };
  }
}

const organisationSchema = z.object({
  name: z.string().trim().min(1, "กรุณาระบุชื่อหน่วยงาน").max(255, "ชื่อหน่วยงานยาวเกินไป"),
  address: z.string().trim().max(255, "ที่อยู่ยาวเกินไป").optional(),
  phone: z.string().trim().max(255, "เบอร์โทรศัพท์ยาวเกินไป").optional(),
});

/** Organisation details shown in the dashboard header and on public pages. */
export async function updateOrganisationInfoAction(
  name: string,
  address?: string,
  phone?: string
) {
  const session = await verifyOrgAdmin();

  const parsed = organisationSchema.safeParse({ name, address, phone });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" };
  }

  try {
    const before = await getOrganisationInfo();

    await prisma.systemSettings.upsert({
      where: { id: SETTINGS_ID },
      update: {
        organisationName: parsed.data.name,
        organisationAddress: parsed.data.address || null,
        organisationPhone: parsed.data.phone || null,
      },
      create: {
        id: SETTINGS_ID,
        organisationName: parsed.data.name,
        organisationAddress: parsed.data.address || null,
        organisationPhone: parsed.data.phone || null,
      },
    });

    await logAudit({
      userId: BigInt(session.user.id!),
      action: "UPDATE_ORGANISATION_INFO",
      entityType: "systemSettings",
      entityId: BigInt(SETTINGS_ID),
      oldValues: before,
      newValues: {
        name: parsed.data.name,
        address: parsed.data.address || null,
        phone: parsed.data.phone || null,
      },
      ipAddress: "server_action",
    });

    // The name appears in the header of every dashboard, so both trees have
    // to be rebuilt or the old one lingers until the next natural navigation.
    revalidatePath("/admin");
    revalidatePath("/tech");
    return { success: true };
  } catch (error) {
    console.error("Failed to update organisation info:", error);
    return { error: "ไม่สามารถบันทึกข้อมูลหน่วยงานได้" };
  }
}

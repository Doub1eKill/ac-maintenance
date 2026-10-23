import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { verifyAssetEditor, verifyOrgAdmin } from "@/lib/auth-guards";
import { normaliseCatalogueName, tidyCatalogueName } from "@/lib/admin/catalogue-names";
import { customUnitKey, groupCustomUnits } from "@/lib/admin/custom-unit-groups";

// ---------------------------------------------------------------------------
// Moving a "กำหนดเอง" brand and model into the catalogue
//
// The free-text branch exists so a technician is never stuck on a unit the
// catalogue does not know. The cost is that the text stays text: nobody else
// can pick it, and the same model typed twice is two strings. These turn it
// into a real brand and model — from the form while it is still being filled
// in, and for units that were already saved that way.
// ---------------------------------------------------------------------------

type Session = Awaited<ReturnType<typeof verifyAssetEditor>>;

const entrySchema = z.object({
  brand: z.string().trim().min(1, "กรุณาระบุยี่ห้อ"),
  model: z.string().trim().min(1, "กรุณาระบุรุ่นก่อนเพิ่มเข้าระบบ"),
  defaultBtu: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d+$/.test(v), "ค่า BTU ต้องเป็นตัวเลขเท่านั้น")
    .transform((v) => (v ? parseInt(v, 10) : null)),
});

type CatalogueEntry =
  | { error: string }
  | { brandId: bigint; modelId: bigint; defaultBtu: number | null; createdBrand: boolean; createdModel: boolean };

/**
 * The brand and model with these names, created if missing.
 *
 * Unlike createAcBrandAction, a live match is the answer rather than an error:
 * whoever typed the text did not know it was already there, and pointing them
 * at it is exactly what the button is for. A match in the trash still stops
 * here, for the reason createAcBrandAction gives — the unique index covers it,
 * and bringing it back is an admin's restore, not an insert.
 */
async function findOrCreateEntry(
  session: Session,
  brandText: string,
  modelText: string,
  defaultBtu: number | null
): Promise<CatalogueEntry> {
  const brandName = tidyCatalogueName(brandText);
  const modelName = tidyCatalogueName(modelText);

  let createdBrand = false;
  let brand = (
    await prisma.acBrand.findMany({ select: { id: true, name: true, deletedAt: true } })
  ).find((b) => normaliseCatalogueName(b.name) === normaliseCatalogueName(brandName));

  if (brand?.deletedAt) {
    return { error: `ยี่ห้อนี้อยู่ในถังขยะ (ชื่อในระบบ: ${brand.name}) กรุณาให้ผู้ดูแลระบบกู้คืนก่อน` };
  }
  if (!brand) {
    brand = await prisma.acBrand.create({
      data: { name: brandName },
      select: { id: true, name: true, deletedAt: true },
    });
    createdBrand = true;
    await logAudit({
      userId: BigInt(session.user.id!),
      action: "CREATE_AC_BRAND",
      entityType: "acBrand",
      entityId: brand.id,
      newValues: { name: brandName, from: "custom" },
      ipAddress: "server_action",
    });
  }

  let createdModel = false;
  let model = (
    await prisma.acModel.findMany({
      where: { brandId: brand.id },
      select: { id: true, name: true, deletedAt: true, defaultBtu: true },
    })
  ).find((m) => normaliseCatalogueName(m.name) === normaliseCatalogueName(modelName));

  if (model?.deletedAt) {
    return { error: `รุ่นนี้อยู่ในถังขยะ (ชื่อในระบบ: ${model.name}) กรุณาให้ผู้ดูแลระบบกู้คืนก่อน` };
  }
  if (!model) {
    model = await prisma.acModel.create({
      data: { brandId: brand.id, name: modelName, defaultBtu },
      select: { id: true, name: true, deletedAt: true, defaultBtu: true },
    });
    createdModel = true;
    await logAudit({
      userId: BigInt(session.user.id!),
      action: "CREATE_AC_MODEL",
      entityType: "acModel",
      entityId: model.id,
      newValues: { brandId: brand.id.toString(), name: modelName, defaultBtu, from: "custom" },
      ipAddress: "server_action",
    });
  }

  return {
    brandId: brand.id,
    modelId: model.id,
    defaultBtu: model.defaultBtu,
    createdBrand,
    createdModel,
  };
}

/**
 * The "เพิ่มเข้าระบบ" button in the form's กำหนดเอง tab.
 *
 * The unit being registered or edited is saved by its own form, which now has
 * a catalogue model selected instead of text. Units saved earlier under the
 * same text move onto the entry here too (the owner asked for it on 23 Oct):
 * otherwise they sat on free text until an admin found them on the settings
 * card. Open to technicians, the same as adding a brand or model directly —
 * the units moved are only ever ones whose typed name already says this model,
 * and each move is in the audit log with the unit ids.
 */
export async function addCustomBrandModelToCatalogueAction(formData: FormData) {
  const session = await verifyAssetEditor();

  const parsed = entrySchema.safeParse({
    brand: formData.get("brand") ?? "",
    model: formData.get("model") ?? "",
    defaultBtu: formData.get("defaultBtu") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" };
  const data = parsed.data;

  try {
    const entry = await findOrCreateEntry(session, data.brand, data.model, data.defaultBtu);
    if ("error" in entry) return { error: entry.error };

    const unitIds = await customUnitIds(customUnitKey(data.brand, data.model));
    const linked = await linkUnits(session, unitIds, entry, data.brand, data.model, "form");

    revalidatePath(linked > 0 ? "/" : "/admin", "layout");
    revalidatePath("/tech", "layout");
    return {
      success: true,
      brandId: entry.brandId.toString(),
      modelId: entry.modelId.toString(),
      created: entry.createdBrand || entry.createdModel,
      linked,
    };
  } catch (error) {
    console.error(error);
    return { error: "เกิดข้อผิดพลาดในการเพิ่มยี่ห้อ/รุ่นเข้าระบบ" };
  }
}

/** Ids of live free-text units whose typed brand and model match the key. */
async function customUnitIds(key: string): Promise<bigint[]> {
  return (await loadCustomUnits())
    .filter((u) => customUnitKey(u.brand, u.model) === key)
    .map((u) => BigInt(u.id));
}

/**
 * Points the given free-text units at a catalogue entry and clears their text.
 *
 * A unit's own BTU is kept; one saved without a size takes the model's
 * default, the same rule createAirConditionerAction applies. acModelId: null
 * in both filters so a unit someone re-pointed in the meantime is left as they
 * set it. Returns how many units moved.
 */
async function linkUnits(
  session: Session,
  unitIds: bigint[],
  entry: Extract<CatalogueEntry, { modelId: bigint }>,
  brandText: string,
  modelText: string,
  via: "form" | "settings"
): Promise<number> {
  if (unitIds.length === 0) return 0;

  const scope = { id: { in: unitIds }, acModelId: null, deletedAt: null };
  const [linked] = await prisma.$transaction([
    prisma.airConditioner.updateMany({
      where: scope,
      data: { acBrandId: entry.brandId, acModelId: entry.modelId, brand: null, model: null },
    }),
    ...(entry.defaultBtu !== null
      ? [
          prisma.airConditioner.updateMany({
            where: { ...scope, acModelId: entry.modelId, btu: null },
            data: { btu: entry.defaultBtu },
          }),
        ]
      : []),
  ]);
  if (linked.count === 0) return 0;

  await logAudit({
    userId: BigInt(session.user.id!),
    action: "LINK_CUSTOM_UNITS_TO_AC_MODEL",
    entityType: "acModel",
    entityId: entry.modelId,
    newValues: {
      brand: tidyCatalogueName(brandText),
      model: tidyCatalogueName(modelText),
      unitIds: unitIds.map(String),
      linked: linked.count,
      via,
    },
    ipAddress: "server_action",
  });
  return linked.count;
}

/** Live units still on free text, one row per brand and model. */
async function loadCustomUnits() {
  const units = await prisma.airConditioner.findMany({
    where: { deletedAt: null, acModelId: null, brand: { not: null } },
    select: { id: true, acCode: true, brand: true, model: true, btu: true },
    orderBy: { acCode: "asc" },
  });
  return units
    .filter((u) => u.brand && u.brand.trim())
    .map((u) => ({ id: u.id.toString(), acCode: u.acCode, brand: u.brand!, model: u.model, btu: u.btu }));
}

export async function getCustomUnitGroups() {
  await verifyOrgAdmin();
  try {
    return groupCustomUnits(await loadCustomUnits());
  } catch (error) {
    console.error("Failed to fetch custom units:", error);
    return [];
  }
}

const linkSchema = entrySchema.extend({
  groupKey: z.string().min(1, "ไม่พบกลุ่มแอร์ที่เลือก"),
});

/**
 * Adds a typed-in brand and model to the catalogue and moves every unit that
 * was saved under it onto the new entry.
 *
 * Admin-only: unlike adding a model, this rewrites units other people
 * registered. The admin may correct the spelling first; the units are still
 * found by the text they were saved with, carried in groupKey.
 */
export async function linkCustomUnitsToCatalogueAction(formData: FormData) {
  const session = await verifyOrgAdmin();

  const parsed = linkSchema.safeParse({
    groupKey: formData.get("groupKey") ?? "",
    brand: formData.get("brand") ?? "",
    model: formData.get("model") ?? "",
    defaultBtu: formData.get("defaultBtu") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" };
  const data = parsed.data;

  try {
    // Matched before anything is created, so a stale tab whose units were
    // already moved does not leave an empty model behind.
    // Matched before anything is created, so a stale tab whose units were
    // already moved does not leave an empty model behind.
    const unitIds = await customUnitIds(data.groupKey);
    if (unitIds.length === 0) {
      return { error: "ไม่พบแอร์ในกลุ่มนี้แล้ว อาจถูกย้ายเข้าระบบไปก่อนหน้า กรุณารีเฟรชหน้า" };
    }

    const entry = await findOrCreateEntry(session, data.brand, data.model, data.defaultBtu);
    if ("error" in entry) return { error: entry.error };

    const linked = await linkUnits(session, unitIds, entry, data.brand, data.model, "settings");

    // The public sticker pages show the brand and model too.
    revalidatePath("/", "layout");
    return {
      success: true,
      linked,
      created: entry.createdBrand || entry.createdModel,
    };
  } catch (error) {
    console.error(error);
    return { error: "เกิดข้อผิดพลาดในการย้ายแอร์เข้าระบบ" };
  }
}

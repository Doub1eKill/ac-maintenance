import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { verifyAssetEditor } from "@/lib/auth-guards";
import { normaliseCatalogueName, tidyCatalogueName } from "@/lib/admin/catalogue-names";

// The AC brand/model catalogue: the list of brands and models an air
// conditioner can be registered against, plus the soft-delete trash bin behind
// it.
//
// It used to live under /super-admin. That role is gone, and with a single
// organisation there is no tenant boundary to keep it away from, so it answers
// to the org admin instead — through the shared verifyOrgAdmin guard rather
// than the byte-identical private copy this file used to carry.
export async function getAcMasterData() {
  await verifyAssetEditor();
  
  try {
    const brands = await prisma.acBrand.findMany({
      where: { deletedAt: null },
      include: {
        models: { where: { deletedAt: null }, orderBy: { name: 'asc' } },
        _count: {
          // Counted through the same filters as the lists themselves, or a card
          // would advertise models and units the page below it does not show.
          // Units are counted live-only on purpose: a soft-deleted unit is not
          // something the admin can act on from this page.
          select: {
            models: { where: { deletedAt: null } },
            airConditioners: { where: { deletedAt: null } }
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    // Convert BigInts to strings for client components
    return {
      brands: brands.map(b => ({
        id: b.id.toString(),
        name: b.name,
        modelsCount: b._count.models,
        acCount: b._count.airConditioners,
        models: b.models.map(m => ({
          id: m.id.toString(),
          brandId: m.brandId.toString(),
          name: m.name,
          defaultBtu: m.defaultBtu
        }))
      }))
    };
  } catch (error) {
    console.error("Failed to fetch master data:", error);
    return { brands: [] };
  }
}

const brandSchema = z.object({
  name: z.string().min(1, "กรุณาระบุชื่อยี่ห้อ")
});

export async function createAcBrandAction(formData: FormData) {
  const session = await verifyAssetEditor();

  const parsed = brandSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  try {
    const name = tidyCatalogueName(parsed.data.name);

    // ac_brands_name_unique covers retired brands too, so a plain "already
    // exists" would be a dead end here: the row is real but invisible on the
    // page, and no amount of retyping gets past it. Point at the trash bin
    // instead — restoring is what is actually being asked for.
    //
    // Compared in JS rather than by findUnique so a differently-cased or
    // differently-spaced spelling of the same brand is caught as the duplicate
    // it is. The catalogue is a handful of rows, so reading it costs nothing.
    const existing = (
      await prisma.acBrand.findMany({ select: { id: true, name: true, deletedAt: true } })
    ).find((b) => normaliseCatalogueName(b.name) === normaliseCatalogueName(name));

    if (existing) {
      return {
        error: existing.deletedAt
          ? `ยี่ห้อนี้อยู่ในถังขยะ (ชื่อในระบบ: ${existing.name}) กรุณาให้ผู้ดูแลระบบกู้คืนแทนการเพิ่มใหม่`
          : `มียี่ห้อนี้อยู่ในระบบแล้ว (ชื่อในระบบ: ${existing.name})`
      };
    }

    const brand = await prisma.acBrand.create({ data: { name }, select: { id: true } });

    // Audited from here on because two roles write to the catalogue now, and
    // "who added this brand" is the first question asked when a duplicate or a
    // typo turns up in the dropdown.
    await logAudit({
      userId: BigInt(session.user.id!),
      action: "CREATE_AC_BRAND",
      entityType: "acBrand",
      entityId: brand.id,
      newValues: { name },
      ipAddress: "server_action",
    });

    revalidatePath("/admin", "layout");
    revalidatePath("/tech", "layout");
    return { success: true, brandId: brand.id.toString() };
  } catch (error) {
    console.error(error);
    return { error: "เกิดข้อผิดพลาดในการบันทึกยี่ห้อ" };
  }
}

const modelSchema = z.object({
  brandId: z.string().min(1, "กรุณาระบุยี่ห้อ"),
  name: z.string().min(1, "กรุณาระบุชื่อรุ่น"),
  defaultBtu: z.string().transform(val => val ? parseInt(val, 10) : null).nullable()
});

export async function createAcModelAction(formData: FormData) {
  const session = await verifyAssetEditor();

  const parsed = modelSchema.safeParse({
    brandId: formData.get("brandId"),
    name: formData.get("name"),
    defaultBtu: formData.get("defaultBtu")
  });
  
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" };
  if (parsed.data.defaultBtu !== null && isNaN(parsed.data.defaultBtu)) {
    return { error: "ค่า BTU ต้องเป็นตัวเลขเท่านั้น" };
  }
  
  try {
    const brandId = BigInt(parsed.data.brandId);
    const name = tidyCatalogueName(parsed.data.name);

    // Same trap as the brand name above: ac_models_brand_id_name_unique does
    // not care that the row is in the trash. Scoped to the chosen brand, since
    // the same model name under a different brand is a different product.
    const existing = (
      await prisma.acModel.findMany({
        where: { brandId },
        select: { id: true, name: true, deletedAt: true },
      })
    ).find((m) => normaliseCatalogueName(m.name) === normaliseCatalogueName(name));

    if (existing) {
      return {
        error: existing.deletedAt
          ? `รุ่นนี้อยู่ในถังขยะ (ชื่อในระบบ: ${existing.name}) กรุณาให้ผู้ดูแลระบบกู้คืนแทนการเพิ่มใหม่`
          : `มีรุ่นนี้อยู่ในยี่ห้อที่เลือกแล้ว (ชื่อในระบบ: ${existing.name})`
      };
    }

    const model = await prisma.acModel.create({
      data: {
        brandId,
        name,
        defaultBtu: parsed.data.defaultBtu
      },
      select: { id: true }
    });

    await logAudit({
      userId: BigInt(session.user.id!),
      action: "CREATE_AC_MODEL",
      entityType: "acModel",
      entityId: model.id,
      newValues: { brandId: brandId.toString(), name, defaultBtu: parsed.data.defaultBtu },
      ipAddress: "server_action",
    });

    revalidatePath("/admin", "layout");
    revalidatePath("/tech", "layout");
    // The id goes back so a form that created a model on the spot can select it
    // without a round trip — the whole point of adding one from the field.
    return { success: true, modelId: model.id.toString() };
  } catch (error) {
    console.error(error);
    return { error: "เกิดข้อผิดพลาดในการบันทึกรุ่นแอร์" };
  }
}

// Renaming and the trash bin live in their own modules; re-exported so every
// caller keeps importing the catalogue from here.
export * from "@/lib/admin/master-data-rename";
export * from "@/lib/admin/master-data-trash";
export * from "@/lib/admin/master-data-promote";

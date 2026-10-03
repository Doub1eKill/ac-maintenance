import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { verifyAssetEditor } from "@/lib/auth-guards";
import { normaliseCatalogueName, tidyCatalogueName } from "@/lib/admin/catalogue-names";

// ---------------------------------------------------------------------------
// Correcting a name that was typed wrong
//
// The catalogue is filled in from the field now, so a misspelling reaches it
// the same way a real model does. Until this the only way out was to add the
// correct spelling and ask an admin to bin the wrong one — two people and a
// wait, for a typo.
//
// Renaming is not a way around the admin-only guard on deleting. It relabels a
// row that stays; every unit keeps pointing at the same id, nothing drops out
// of a dropdown, and the old spelling is in the audit log next to who typed the
// new one. That is why these two sit under verifyAssetEditor while delete,
// restore and purge do not.
// ---------------------------------------------------------------------------

const brandRenameSchema = z.object({
  brandId: z.string().min(1, "ไม่พบยี่ห้อที่เลือก"),
  name: z.string().min(1, "กรุณาระบุชื่อยี่ห้อ"),
});

export async function updateAcBrandAction(formData: FormData) {
  const session = await verifyAssetEditor();

  const parsed = brandRenameSchema.safeParse({
    brandId: formData.get("brandId"),
    name: formData.get("name"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  try {
    const id = BigInt(parsed.data.brandId);
    const name = tidyCatalogueName(parsed.data.name);

    const brand = await prisma.acBrand.findUnique({ where: { id } });
    if (!brand) return { error: "ไม่พบยี่ห้อที่เลือก" };
    // A trashed brand shows on neither page, so this only arrives from a stale
    // tab. Editing one would quietly change what a restore brings back.
    if (brand.deletedAt) {
      return { error: "ยี่ห้อนี้อยู่ในถังขยะ กรุณาให้ผู้ดูแลระบบกู้คืนก่อนจึงจะแก้ไขชื่อได้" };
    }

    // Opening the form and saving it unchanged is not an edit: returning here
    // keeps the audit log free of rows that record nothing.
    if (brand.name === name) return { success: true };

    // The create path's duplicate check, minus the row being renamed — without
    // that exclusion, fixing only the capitalisation or the spacing of a name
    // would collide with itself. Trashed brands stay in scope because
    // ac_brands_name_unique does not skip them.
    const clash = (
      await prisma.acBrand.findMany({ select: { id: true, name: true, deletedAt: true } })
    ).find((b) => b.id !== id && normaliseCatalogueName(b.name) === normaliseCatalogueName(name));

    if (clash) {
      return {
        error: clash.deletedAt
          ? `มียี่ห้อชื่อนี้อยู่ในถังขยะ (ชื่อในระบบ: ${clash.name}) กรุณาให้ผู้ดูแลระบบจัดการก่อน`
          : `มียี่ห้อนี้อยู่ในระบบแล้ว (ชื่อในระบบ: ${clash.name})`,
      };
    }

    await prisma.acBrand.update({ where: { id }, data: { name } });

    await logAudit({
      userId: BigInt(session.user.id!),
      action: "UPDATE_AC_BRAND",
      entityType: "acBrand",
      entityId: id,
      oldValues: { name: brand.name },
      newValues: { name },
      ipAddress: "server_action",
    });

    revalidatePath("/admin", "layout");
    revalidatePath("/tech", "layout");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "เกิดข้อผิดพลาดในการแก้ไขยี่ห้อ" };
  }
}

const modelUpdateSchema = z.object({
  modelId: z.string().min(1, "ไม่พบรุ่นที่เลือก"),
  name: z.string().min(1, "กรุณาระบุชื่อรุ่น"),
  defaultBtu: z.string().transform(val => val ? parseInt(val, 10) : null).nullable(),
});

export async function updateAcModelAction(formData: FormData) {
  const session = await verifyAssetEditor();

  const parsed = modelUpdateSchema.safeParse({
    modelId: formData.get("modelId"),
    name: formData.get("name"),
    defaultBtu: formData.get("defaultBtu"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" };
  if (parsed.data.defaultBtu !== null && isNaN(parsed.data.defaultBtu)) {
    return { error: "ค่า BTU ต้องเป็นตัวเลขเท่านั้น" };
  }

  try {
    const id = BigInt(parsed.data.modelId);
    const name = tidyCatalogueName(parsed.data.name);
    const defaultBtu = parsed.data.defaultBtu;

    const model = await prisma.acModel.findUnique({
      where: { id },
      include: { brand: { select: { deletedAt: true } } },
    });
    if (!model) return { error: "ไม่พบรุ่นที่เลือก" };
    if (model.deletedAt || model.brand.deletedAt) {
      return { error: "รุ่นนี้อยู่ในถังขยะ กรุณาให้ผู้ดูแลระบบกู้คืนก่อนจึงจะแก้ไขได้" };
    }

    if (model.name === name && model.defaultBtu === defaultBtu) return { success: true };

    // Scoped to this model's own brand, like the create path: the same model
    // name under a different brand is a different product.
    const clash = (
      await prisma.acModel.findMany({
        where: { brandId: model.brandId },
        select: { id: true, name: true, deletedAt: true },
      })
    ).find((m) => m.id !== id && normaliseCatalogueName(m.name) === normaliseCatalogueName(name));

    if (clash) {
      return {
        error: clash.deletedAt
          ? `มีรุ่นชื่อนี้อยู่ในถังขยะ (ชื่อในระบบ: ${clash.name}) กรุณาให้ผู้ดูแลระบบจัดการก่อน`
          : `มีรุ่นนี้อยู่ในยี่ห้อนี้แล้ว (ชื่อในระบบ: ${clash.name})`,
      };
    }

    await prisma.acModel.update({ where: { id }, data: { name, defaultBtu } });

    // Worth knowing when reading this back: getUnitForLog falls back to
    // acModel.defaultBtu for a unit whose own btu column is null, so changing
    // the number here changes what those units display. That is the point when
    // the catalogue figure was the thing typed wrong, and it never overwrites a
    // unit that carries its own reading.
    await logAudit({
      userId: BigInt(session.user.id!),
      action: "UPDATE_AC_MODEL",
      entityType: "acModel",
      entityId: id,
      oldValues: { name: model.name, defaultBtu: model.defaultBtu },
      newValues: { name, defaultBtu },
      ipAddress: "server_action",
    });

    revalidatePath("/admin", "layout");
    revalidatePath("/tech", "layout");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "เกิดข้อผิดพลาดในการแก้ไขรุ่นแอร์" };
  }
}

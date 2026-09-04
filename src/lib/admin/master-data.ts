import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { verifyOrgAdmin } from "@/lib/auth-guards";

// The AC brand/model catalogue: the list of brands and models an air
// conditioner can be registered against, plus the soft-delete trash bin behind
// it.
//
// It used to live under /super-admin. That role is gone, and with a single
// organisation there is no tenant boundary to keep it away from, so it answers
// to the org admin instead — through the shared verifyOrgAdmin guard rather
// than the byte-identical private copy this file used to carry.
export async function getAcMasterData() {
  await verifyOrgAdmin();
  
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
  await verifyOrgAdmin();
  
  const parsed = brandSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  
  try {
    // ac_brands_name_unique covers retired brands too, so a plain "already
    // exists" would be a dead end here: the row is real but invisible on the
    // page, and no amount of retyping gets past it. Point at the trash bin
    // instead — restoring is what is actually being asked for.
    const existing = await prisma.acBrand.findUnique({
      where: { name: parsed.data.name }
    });
    if (existing) {
      return {
        error: existing.deletedAt
          ? "ยี่ห้อนี้อยู่ในถังขยะ กรุณากู้คืนจากถังขยะแทนการเพิ่มใหม่"
          : "มียี่ห้อนี้อยู่ในระบบแล้ว"
      };
    }
    
    await prisma.acBrand.create({ data: { name: parsed.data.name } });
    revalidatePath("/admin");
    return { success: true };
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
  await verifyOrgAdmin();
  
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
    const existing = await prisma.acModel.findUnique({
      where: {
        brandId_name: {
          brandId: BigInt(parsed.data.brandId),
          name: parsed.data.name
        }
      }
    });
    
    // Same trap as the brand name above: ac_models_brand_id_name_unique does
    // not care that the row is in the trash.
    if (existing) {
      return {
        error: existing.deletedAt
          ? "รุ่นนี้อยู่ในถังขยะ กรุณากู้คืนจากถังขยะแทนการเพิ่มใหม่"
          : "มีรุ่นนี้อยู่ในยี่ห้อที่เลือกแล้ว"
      };
    }
    
    await prisma.acModel.create({
      data: {
        brandId: BigInt(parsed.data.brandId),
        name: parsed.data.name,
        defaultBtu: parsed.data.defaultBtu
      }
    });
    
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "เกิดข้อผิดพลาดในการบันทึกรุ่นแอร์" };
  }
}

// ---------------------------------------------------------------------------
// Trash bin for the AC catalogue (backlog #4, phase 1)
//
// Before this the catalogue could not be pruned at all: air_conditioners holds
// ac_brand_id / ac_model_id under ON DELETE RESTRICT, every one of the five
// brands has units on it, and deleting a brand cascades into models that other
// units still point at. Soft delete sidesteps all of that for the everyday
// case — the row stays, so a unit on a discontinued model keeps showing its
// name and its history stays readable — and leaves RESTRICT to be dealt with
// only where a permanent delete is actually asked for.
// ---------------------------------------------------------------------------

// Units referencing a brand, counted the way the foreign keys see it: *every*
// air_conditioners row, soft-deleted units included. A soft-deleted unit still
// holds its ac_brand_id / ac_model_id, so RESTRICT still fires for it —
// blocking on the live count alone would promise a permanent delete that the
// database then refuses, which is the worst of both messages.
//
// The OR is what makes this a count of units rather than of references: a unit
// registered from the catalogue carries both ids, so counting the two columns
// separately and adding them up would double it.
async function countBrandReferences(brandId: bigint) {
  const where = { OR: [{ acBrandId: brandId }, { acModel: { brandId } }] };
  const [total, live] = await Promise.all([
    prisma.airConditioner.count({ where }),
    prisma.airConditioner.count({ where: { AND: [where, { deletedAt: null }] } }),
  ]);
  return { total, live };
}

async function countModelReferences(modelId: bigint) {
  const [total, live] = await Promise.all([
    prisma.airConditioner.count({ where: { acModelId: modelId } }),
    prisma.airConditioner.count({ where: { acModelId: modelId, deletedAt: null } }),
  ]);
  return { total, live };
}

// The trash bin is the right place to explain why a permanent delete is
// refused, so the message carries the number and what to do about it rather
// than just saying no. Units already in the AC trash are called out separately:
// they still block, and without saying so the count looks wrong against what
// the asset pages show.
function purgeBlockedMessage(kind: string, refs: { total: number; live: number }) {
  const hidden = refs.total - refs.live;
  const hiddenNote = hidden > 0 ? ` (รวมเครื่องที่ถูกลบไปแล้ว ${hidden} เครื่อง ซึ่งยังอ้างอิงอยู่)` : "";
  return `ลบถาวรไม่ได้ ยังมี ${refs.total} เครื่องใช้${kind}นี้อยู่${hiddenNote} กรุณาย้ายเครื่องเหล่านั้นไปใช้${kind}อื่นก่อน`;
}

export async function deleteAcBrandAction(brandId: string) {
  const session = await verifyOrgAdmin();

  try {
    const id = BigInt(brandId);
    const brand = await prisma.acBrand.findUnique({ where: { id } });
    if (!brand) return { error: "ไม่พบยี่ห้อที่เลือก" };
    if (brand.deletedAt) return { error: "ยี่ห้อนี้อยู่ในถังขยะอยู่แล้ว" };

    // deleted_at is a full timestamp, not a @db.Date business date, so it takes
    // a plain `new Date()` — the businessDate* helpers are for the date-only
    // columns and would pin this to midnight.
    await prisma.acBrand.update({ where: { id }, data: { deletedAt: new Date() } });

    // Models under the brand are deliberately left unstamped: the selection
    // queries filter on the brand's deleted_at as well, so they drop out of the
    // dropdowns anyway, and restoring the brand then brings back exactly the
    // models that were still live when it was retired.
    await logAudit({
      userId: BigInt(session.user.id!),
      action: "DELETE_AC_BRAND",
      entityType: "acBrand",
      entityId: id,
      oldValues: { name: brand.name, deletedAt: null },
      newValues: { deletedAt: "soft" },
      ipAddress: "server_action",
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "เกิดข้อผิดพลาดในการลบยี่ห้อ" };
  }
}

export async function restoreAcBrandAction(brandId: string) {
  const session = await verifyOrgAdmin();

  try {
    const id = BigInt(brandId);
    const brand = await prisma.acBrand.findUnique({ where: { id } });
    if (!brand) return { error: "ไม่พบยี่ห้อที่เลือก" };
    if (!brand.deletedAt) return { error: "ยี่ห้อนี้ไม่ได้อยู่ในถังขยะ" };

    await prisma.acBrand.update({ where: { id }, data: { deletedAt: null } });

    await logAudit({
      userId: BigInt(session.user.id!),
      action: "RESTORE_AC_BRAND",
      entityType: "acBrand",
      entityId: id,
      newValues: { name: brand.name, deletedAt: null },
      ipAddress: "server_action",
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "เกิดข้อผิดพลาดในการกู้คืนยี่ห้อ" };
  }
}

export async function permanentlyDeleteAcBrandAction(brandId: string) {
  const session = await verifyOrgAdmin();

  try {
    const id = BigInt(brandId);
    const brand = await prisma.acBrand.findUnique({ where: { id } });
    if (!brand) return { error: "ไม่พบยี่ห้อที่เลือก" };
    // Permanent delete is reachable only from the trash bin, so a live brand
    // arriving here means the UI skipped a step, not that the admin meant it.
    if (!brand.deletedAt) return { error: "ต้องลบยี่ห้อลงถังขยะก่อน จึงจะลบถาวรได้" };

    const refs = await countBrandReferences(id);
    if (refs.total > 0) {
      return { error: purgeBlockedMessage("ยี่ห้อ", refs), blockedBy: refs };
    }

    // Nothing points at the brand or at any of its models — which is exactly
    // what the count above established — so the ON DELETE CASCADE into
    // ac_models has nothing left to trip over. This is the step that finally
    // clears out models no unit ever used.
    const cascadedModels = await prisma.acModel.count({ where: { brandId: id } });
    await prisma.acBrand.delete({ where: { id } });

    await logAudit({
      userId: BigInt(session.user.id!),
      action: "PURGE_AC_BRAND",
      entityType: "acBrand",
      entityId: id,
      oldValues: { name: brand.name, cascadedModels },
      ipAddress: "server_action",
    });

    revalidatePath("/admin");
    return { success: true, cascadedModels };
  } catch (error) {
    console.error(error);
    return { error: "เกิดข้อผิดพลาดในการลบยี่ห้อถาวร" };
  }
}

export async function deleteAcModelAction(modelId: string) {
  const session = await verifyOrgAdmin();

  try {
    const id = BigInt(modelId);
    const model = await prisma.acModel.findUnique({ where: { id } });
    if (!model) return { error: "ไม่พบรุ่นที่เลือก" };
    if (model.deletedAt) return { error: "รุ่นนี้อยู่ในถังขยะอยู่แล้ว" };

    await prisma.acModel.update({ where: { id }, data: { deletedAt: new Date() } });

    await logAudit({
      userId: BigInt(session.user.id!),
      action: "DELETE_AC_MODEL",
      entityType: "acModel",
      entityId: id,
      oldValues: { name: model.name, brandId: model.brandId.toString(), deletedAt: null },
      newValues: { deletedAt: "soft" },
      ipAddress: "server_action",
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "เกิดข้อผิดพลาดในการลบรุ่นแอร์" };
  }
}

export async function restoreAcModelAction(modelId: string) {
  const session = await verifyOrgAdmin();

  try {
    const id = BigInt(modelId);
    const model = await prisma.acModel.findUnique({
      where: { id },
      include: { brand: { select: { name: true, deletedAt: true } } },
    });
    if (!model) return { error: "ไม่พบรุ่นที่เลือก" };
    if (!model.deletedAt) return { error: "รุ่นนี้ไม่ได้อยู่ในถังขยะ" };

    await prisma.acModel.update({ where: { id }, data: { deletedAt: null } });

    await logAudit({
      userId: BigInt(session.user.id!),
      action: "RESTORE_AC_MODEL",
      entityType: "acModel",
      entityId: id,
      newValues: { name: model.name, brandId: model.brandId.toString(), deletedAt: null },
      ipAddress: "server_action",
    });

    revalidatePath("/admin");
    // Restoring the model is not refused while its brand is still in the trash —
    // the row genuinely comes back — but it stays out of the dropdowns until the
    // brand returns too, and saying nothing here would make it read as a no-op.
    return {
      success: true,
      warning: model.brand.deletedAt
        ? `กู้คืนรุ่นแล้ว แต่ยี่ห้อ "${model.brand.name}" ยังอยู่ในถังขยะ รุ่นนี้จะยังไม่แสดงในรายการจนกว่าจะกู้คืนยี่ห้อด้วย`
        : undefined,
    };
  } catch (error) {
    console.error(error);
    return { error: "เกิดข้อผิดพลาดในการกู้คืนรุ่นแอร์" };
  }
}

export async function permanentlyDeleteAcModelAction(modelId: string) {
  const session = await verifyOrgAdmin();

  try {
    const id = BigInt(modelId);
    const model = await prisma.acModel.findUnique({ where: { id } });
    if (!model) return { error: "ไม่พบรุ่นที่เลือก" };
    if (!model.deletedAt) return { error: "ต้องลบรุ่นลงถังขยะก่อน จึงจะลบถาวรได้" };

    const refs = await countModelReferences(id);
    if (refs.total > 0) {
      return { error: purgeBlockedMessage("รุ่น", refs), blockedBy: refs };
    }

    await prisma.acModel.delete({ where: { id } });

    await logAudit({
      userId: BigInt(session.user.id!),
      action: "PURGE_AC_MODEL",
      entityType: "acModel",
      entityId: id,
      oldValues: { name: model.name, brandId: model.brandId.toString() },
      ipAddress: "server_action",
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "เกิดข้อผิดพลาดในการลบรุ่นแอร์ถาวร" };
  }
}

// Everything sitting in the trash, with the one fact the UI cannot work out on
// its own: whether a permanent delete would actually go through. `canPurge` is
// decided here so the button does not have to re-derive the RESTRICT rule, and
// `unitsUsing` is there to fill in the reason when it would not.
export async function getAcTrashData() {
  await verifyOrgAdmin();

  try {
    const [deletedBrands, deletedModels] = await Promise.all([
      prisma.acBrand.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
        select: {
          id: true,
          name: true,
          deletedAt: true,
          _count: { select: { models: { where: { deletedAt: null } } } },
        },
      }),
      prisma.acModel.findMany({
        where: { deletedAt: { not: null } },
        orderBy: [{ deletedAt: "desc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          defaultBtu: true,
          deletedAt: true,
          brand: { select: { id: true, name: true, deletedAt: true } },
        },
      }),
    ]);

    // Brands are few enough to count one at a time — there are five in total,
    // and only retired ones land here. Models are not: 117 of the 189 are used
    // by nothing and could all end up in the trash at once, so they get one
    // groupBy for the whole page instead of a query each.
    const brandRefs = await Promise.all(
      deletedBrands.map(async (b) => ({ id: b.id, refs: await countBrandReferences(b.id) }))
    );
    const brandRefsById = new Map(brandRefs.map((r) => [r.id.toString(), r.refs]));

    const modelIds = deletedModels.map((m) => m.id);
    const [modelTotals, modelLive] = modelIds.length
      ? await Promise.all([
          prisma.airConditioner.groupBy({
            by: ["acModelId"],
            where: { acModelId: { in: modelIds } },
            _count: { _all: true },
          }),
          prisma.airConditioner.groupBy({
            by: ["acModelId"],
            where: { acModelId: { in: modelIds }, deletedAt: null },
            _count: { _all: true },
          }),
        ])
      : [[], []];

    const totalByModel = new Map(
      modelTotals.map((r) => [r.acModelId?.toString() ?? "", r._count._all])
    );
    const liveByModel = new Map(
      modelLive.map((r) => [r.acModelId?.toString() ?? "", r._count._all])
    );

    return {
      brands: deletedBrands.map((b) => {
        const refs = brandRefsById.get(b.id.toString()) ?? { total: 0, live: 0 };
        return {
          id: b.id.toString(),
          name: b.name,
          deletedAt: b.deletedAt ? b.deletedAt.toISOString() : null,
          liveModels: b._count.models,
          unitsUsing: refs.total,
          unitsUsingLive: refs.live,
          canPurge: refs.total === 0,
        };
      }),
      models: deletedModels.map((m) => {
        const total = totalByModel.get(m.id.toString()) ?? 0;
        const live = liveByModel.get(m.id.toString()) ?? 0;
        return {
          id: m.id.toString(),
          name: m.name,
          defaultBtu: m.defaultBtu,
          deletedAt: m.deletedAt ? m.deletedAt.toISOString() : null,
          brandId: m.brand.id.toString(),
          brandName: m.brand.name,
          brandDeleted: m.brand.deletedAt !== null,
          unitsUsing: total,
          unitsUsingLive: live,
          canPurge: total === 0,
        };
      }),
    };
  } catch (error) {
    console.error("Failed to fetch AC catalogue trash:", error);
    return { brands: [], models: [] };
  }
}

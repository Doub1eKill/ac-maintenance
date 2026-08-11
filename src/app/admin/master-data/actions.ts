"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// The AC brand/model catalogue used to live under /super-admin. That role is
// gone, and with a single organisation there is no tenant boundary to keep it
// away from — so it moved here and answers to the org admin instead.
async function verifyOrgAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "org_admin") {
    throw new Error("Unauthorized: Org Admin access required");
  }
  return session;
}

export async function getAcMasterData() {
  await verifyOrgAdmin();
  
  try {
    const brands = await prisma.acBrand.findMany({
      include: {
        models: true,
        _count: {
          select: { models: true, airConditioners: true }
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
    const existing = await prisma.acBrand.findUnique({
      where: { name: parsed.data.name }
    });
    if (existing) return { error: "มียี่ห้อนี้อยู่ในระบบแล้ว" };
    
    await prisma.acBrand.create({ data: { name: parsed.data.name } });
    revalidatePath("/admin/master-data");
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
    
    if (existing) return { error: "มีรุ่นนี้อยู่ในยี่ห้อที่เลือกแล้ว" };
    
    await prisma.acModel.create({
      data: {
        brandId: BigInt(parsed.data.brandId),
        name: parsed.data.name,
        defaultBtu: parsed.data.defaultBtu
      }
    });
    
    revalidatePath("/admin/master-data");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "เกิดข้อผิดพลาดในการบันทึกรุ่นแอร์" };
  }
}

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyOrgAdmin } from "@/lib/auth-guards";

// Buildings — the top of the asset hierarchy. Split out of the former
// assets.ts, which had grown to hold buildings, rooms, units, service history
// and PM schedules in one 619-line file.
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


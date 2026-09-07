import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { businessDateToday, addMaintenanceInterval } from "@/lib/maintenance";
import { verifyAssetEditor } from "@/lib/auth-guards";

// Preventive-maintenance schedules: how often a unit is due for a clean.
const scheduleSchema = z.object({
  airConditionerId: z.string().min(1, "กรุณาเลือกเครื่องปรับอากาศ"),
  frequencyValue: z.string().transform(val => parseInt(val, 10)),
  frequencyUnit: z.enum(["days", "months", "years"]),
});

export async function saveMaintenanceScheduleAction(formData: FormData) {
  await verifyAssetEditor();

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

    revalidatePath("/admin", "layout");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "เกิดข้อผิดพลาดในการบันทึกรอบการบำรุงรักษา" };
  }
}

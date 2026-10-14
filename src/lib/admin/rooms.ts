import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyAssetEditor, verifyOrgAdmin } from "@/lib/auth-guards";
import { logAudit } from "@/lib/audit";

// Rooms — the middle of the asset hierarchy, between a building and its units.
const roomSchema = z.object({
  buildingId: z.string().min(1, "กรุณาเลือกอาคาร"),
  name: z.string().min(1, "กรุณาระบุชื่อ/หมายเลขห้อง"),
  // Required since the asset lists navigate by floor (4 Sep 2026): a room
  // saved without one lands in the "ไม่ระบุชั้น" group, which is a place to
  // fix things rather than a place to file them. Existing rooms with a null
  // floor are left alone — this guards what comes in from here on.
  floor: z
    .string()
    .min(1, "กรุณาระบุชั้น")
    .transform((val) => parseInt(val, 10))
    .refine((val) => Number.isFinite(val) && val >= 0, "ชั้นต้องเป็นตัวเลข"),
});

export async function createRoomAction(formData: FormData) {
  await verifyOrgAdmin();

  const parsed = roomSchema.safeParse({
    buildingId: formData.get("buildingId"),
    name: formData.get("name"),
    // `?? ""` because formData.get() returns null for a field that was not
    // sent at all, and a null reaches Zod as a type error whose message is
    // about types rather than about the floor — see the same rule in HANDOFF.
    floor: formData.get("floor") ?? "",
  });
  
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" };
  
  try {
    const building = await prisma.building.findUnique({
      where: { id: BigInt(parsed.data.buildingId) }
    });

    if (!building) {
      return { error: "อาคารไม่ถูกต้อง" };
    }
    
    const existing = await prisma.room.findUnique({
      where: {
        buildingId_name: {
          buildingId: building.id,
          name: parsed.data.name
        }
      }
    });
    
    if (existing) return { error: "มีห้องนี้อยู่ในอาคารแล้ว" };
    
    await prisma.room.create({
      data: {
        buildingId: building.id,
        name: parsed.data.name,
        floor: parsed.data.floor
      }
    });
    
    revalidatePath("/admin", "layout");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "เกิดข้อผิดพลาดในการบันทึกห้อง" };
  }
}


const roomUpdateSchema = roomSchema.omit({ buildingId: true });

/**
 * Rename a room, or move it to another floor. As with buildings, units already
 * in it keep their codes (the room name is the middle of an acCode, printed on
 * the sticker); units registered afterwards use the new name, numbered on from
 * the units already there.
 *
 * Technicians may do this too (the owner's call, 14 Oct 2026): they are the ones
 * standing in the room and see when its label is wrong. Buildings stay with the
 * org admin — a building's abbreviation starts every code registered in it.
 */
export async function updateRoomAction(formData: FormData) {
  const session = await verifyAssetEditor();

  const rawId = String(formData.get("id") ?? "");
  if (!/^\d+$/.test(rawId)) return { error: "ห้องไม่ถูกต้อง" };
  const id = BigInt(rawId);

  const parsed = roomUpdateSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    floor: formData.get("floor") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" };
  const { name, floor } = parsed.data;

  try {
    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) return { error: "ไม่พบห้องนี้ อาจถูกลบไปแล้ว" };
    if (room.name === name && room.floor === floor) return { success: true };

    if (room.name !== name) {
      const clash = await prisma.room.findUnique({
        where: { buildingId_name: { buildingId: room.buildingId, name } },
        select: { id: true },
      });
      if (clash) return { error: "มีห้องนี้อยู่ในอาคารแล้ว" };
    }

    await prisma.room.update({ where: { id }, data: { name, floor, updatedAt: new Date() } });

    await logAudit({
      userId: BigInt(session.user.id!),
      action: "UPDATE_ROOM",
      entityType: "room",
      entityId: id,
      oldValues: { name: room.name, floor: room.floor },
      newValues: { name, floor },
      ipAddress: "server_action",
    });

    revalidatePath("/admin", "layout");
    revalidatePath("/tech", "layout");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "เกิดข้อผิดพลาดในการบันทึกห้อง" };
  }
}

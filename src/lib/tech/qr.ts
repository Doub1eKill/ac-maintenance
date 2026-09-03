import { prisma } from "@/lib/prisma";
import { catalogueFlags } from "@/lib/catalogue-status";
import { formatUnitLocation } from "@/lib/location";
import { verifyTechnician } from "@/lib/tech/guards";

// What the scanner shows after reading a unit's QR code.
export async function scanQrCodeAction(acCode: string) {
  await verifyTechnician();

  try {
    const ac = await prisma.airConditioner.findFirst({
      where: { acCode },
      include: {
        acBrand: true,
        acModel: { select: { deletedAt: true } },
        room: {
          include: { building: true },
        },
        workOrders: {
          where: { status: "pending" },
          take: 1,
        },
        maintenanceLogs: {
          orderBy: { performedAt: "desc" },
          take: 1,
        }
      },
    });

    if (!ac) {
      return { error: "ไม่พบข้อมูลเครื่องปรับอากาศรหัสนี้ในระบบ" };
    }

    const lastLog = ac.maintenanceLogs[0];
    const pendingJob = ac.workOrders[0];

    return {
      success: true,
      acDetails: {
        id: ac.id.toString(),
        acCode: ac.acCode,
        brand: ac.acBrand?.name || ac.brand || "ไม่ระบุ",
        ...catalogueFlags(ac),
        btu: ac.btu,
        status: ac.status,
        location: formatUnitLocation(ac.room),
        lastMaintenance: lastLog ? lastLog.performedAt.toISOString() : null,
      },
      pendingJobId: pendingJob ? pendingJob.id.toString() : null,
    };
  } catch (error) {
    console.error("Scan QR failed:", error);
    return { error: "เกิดข้อผิดพลาดในการสแกนข้อมูล" };
  }
}

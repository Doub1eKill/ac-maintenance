import { prisma } from "@/lib/prisma";
import { catalogueFlags } from "@/lib/catalogue-status";
import { formatUnitLocation } from "@/lib/location";
import { verifyTechnician } from "@/lib/tech/guards";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Which unit a scanned or typed value names.
 *
 * The printed sticker encodes `<origin>/qr/<uuid>` (see qrTargetUrl in
 * qr-sticker.tsx), so a camera read arrives as that whole URL. The same uuid
 * pasted on its own is accepted too, and so is the unit's acCode, which is
 * what the /qr page's "บันทึกงาน" link and a technician typing by hand send.
 * The scanner used to look up acCode only, so the one value a real sticker
 * produces was the one value it could not find.
 */
export function resolveScannedUnit(scanned: string): { qrCode: string } | { acCode: string } {
  const raw = scanned.trim();
  const fromUrl = raw.match(/\/qr\/([0-9a-f-]{36})(?:[/?#]|$)/i)?.[1];
  const uuid = fromUrl ?? (UUID_RE.test(raw) ? raw : null);
  return uuid ? { qrCode: uuid.toLowerCase() } : { acCode: raw };
}

// What the scanner shows after reading a unit's QR code.
export async function scanQrCodeAction(scanned: string) {
  await verifyTechnician();

  try {
    const ac = await prisma.airConditioner.findFirst({
      where: resolveScannedUnit(scanned),
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

    // `as const` makes success a discriminant the modal can narrow on, so it
    // never has to cast the result to its found-the-unit shape.
    return {
      success: true as const,
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

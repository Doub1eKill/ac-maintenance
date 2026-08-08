import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const allowedRoles = ["org_admin", "technician"];
    if (!session || !allowedRoles.includes(session.user.role) || !session.user.universityId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    // Optional window on nextDueDate so a calendar showing one month can ask
    // for just that month instead of pulling every schedule in the tenant.
    // Omitting both params keeps the previous behaviour (return everything),
    // so existing callers are unaffected. Unparseable dates are ignored
    // rather than erroring, to avoid breaking a caller over a bad param.
    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;
    const validStart = startDate && !Number.isNaN(startDate.getTime()) ? startDate : null;
    const validEnd = endDate && !Number.isNaN(endDate.getTime()) ? endDate : null;

    const dueDateFilter =
      validStart || validEnd
        ? {
            nextDueDate: {
              ...(validStart ? { gte: validStart } : {}),
              ...(validEnd ? { lte: validEnd } : {}),
            },
          }
        : {};

    const schedules = await prisma.maintenanceSchedule.findMany({
      where: {
        isActive: true,
        ...dueDateFilter,
        airConditioner: {
          room: {
            building: {
              universityId: session.user.universityId
            }
          }
        }
      },
      include: {
        airConditioner: {
          include: {
            room: {
              include: {
                building: true
              }
            },
            acBrand: { select: { name: true } },
            maintenanceLogs: {
              orderBy: { performedAt: 'desc' },
              take: 1,
              select: {
                performedAt: true,
                technician: { select: { name: true } },
              },
            },
          }
        }
      },
      orderBy: {
        nextDueDate: 'asc'
      }
    });

    // Transform bigints for JSON serialization
    const serialized = schedules.map(s => {
      const lastLog = s.airConditioner.maintenanceLogs[0];
      return {
        id: s.id.toString(),
        airConditionerId: s.airConditionerId.toString(),
        frequencyValue: s.frequencyValue,
        frequencyUnit: s.frequencyUnit,
        lastPerformedAt: s.lastPerformedAt,
        nextDueDate: s.nextDueDate,
        isActive: s.isActive,
        acCode: s.airConditioner.acCode,
        brand: s.airConditioner.acBrand?.name ?? s.airConditioner.brand ?? "ไม่ระบุ",
        location: `${s.airConditioner.room.building.name} - ${s.airConditioner.room.name}`,
        lastPerformedByName: lastLog?.technician.name ?? null,
      };
    });

    return NextResponse.json(serialized);
  } catch (error: any) {
    console.error("[MAINTENANCE_SCHEDULES_GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch schedules" }, { status: 500 });
  }
}

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

    // Build the query to fetch maintenance schedules
    // If start and end are provided, we can filter, but for now we'll fetch all active schedules
    // within the university.
    
    const schedules = await prisma.maintenanceSchedule.findMany({
      where: {
        isActive: true,
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

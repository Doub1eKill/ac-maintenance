import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "org_admin" || !session.user.universityId) {
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
            }
          }
        }
      },
      orderBy: {
        nextDueDate: 'asc'
      }
    });

    // Transform bigints for JSON serialization
    const serialized = schedules.map(s => ({
      id: s.id.toString(),
      airConditionerId: s.airConditionerId.toString(),
      frequencyMonths: s.frequencyMonths,
      lastPerformedAt: s.lastPerformedAt,
      nextDueDate: s.nextDueDate,
      isActive: s.isActive,
      acCode: s.airConditioner.acCode,
      brand: s.airConditioner.brand,
      location: `${s.airConditioner.room.building.name} - ${s.airConditioner.room.name}`,
    }));

    return NextResponse.json(serialized);
  } catch (error: any) {
    console.error("[MAINTENANCE_SCHEDULES_GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch schedules" }, { status: 500 });
  }
}

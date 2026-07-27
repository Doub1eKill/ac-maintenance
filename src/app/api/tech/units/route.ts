import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncOverdueMaintenanceWorkOrders } from "@/lib/maintenance";

async function verifyTechnician() {
  const session = await auth();
  if (!session?.user || session.user.role !== "technician" || !session.user.universityId) {
    return null;
  }
  return session.user;
}

// Full asset list for the technician dashboard (backlog: all units with last-
// cleaned date, stalest first, overdue units pinned to the top regardless of
// date, plus a job-type summary). Deliberately a separate endpoint from
// /api/tech/work-orders so the existing claim-pool UI keeps working unchanged.
export async function GET() {
  const tech = await verifyTechnician();
  if (!tech) return new NextResponse("Unauthorized", { status: 401 });

  const universityId = BigInt(tech.universityId!);

  try {
    await syncOverdueMaintenanceWorkOrders(universityId);

    const units = await prisma.airConditioner.findMany({
      where: { deletedAt: null, room: { building: { universityId } } },
      select: {
        id: true,
        acCode: true,
        brand: true,
        model: true,
        btu: true,
        status: true,
        acBrand: { select: { name: true } },
        acModel: { select: { name: true, defaultBtu: true } },
        room: {
          select: { name: true, floor: true, building: { select: { name: true } } },
        },
        maintenanceLogs: {
          orderBy: { performedAt: "desc" },
          take: 1,
          select: { performedAt: true },
        },
        workOrders: {
          where: { status: "pending" },
          take: 1,
          select: { id: true, createdAt: true, priority: true, issueDescription: true },
        },
      },
    });

    const shaped = units.map((u) => {
      const lastCleanedAt = u.maintenanceLogs[0]?.performedAt ?? null;
      const pendingWorkOrder = u.workOrders[0] ?? null;
      return {
        id: u.id.toString(),
        acCode: u.acCode,
        brand: u.acBrand?.name ?? u.brand,
        model: u.acModel?.name ?? u.model,
        btu: u.btu ?? u.acModel?.defaultBtu ?? null,
        status: u.status,
        location: `${u.room.building.name} - ห้อง ${u.room.name}`,
        lastCleanedAt,
        isOverdue: !!pendingWorkOrder,
        pendingWorkOrder: pendingWorkOrder
          ? {
              id: pendingWorkOrder.id.toString(),
              priority: pendingWorkOrder.priority,
              issueDescription: pendingWorkOrder.issueDescription,
              createdAt: pendingWorkOrder.createdAt,
            }
          : null,
      };
    });

    // Overdue units always float to the top regardless of staleness date;
    // the rest sort stalest first (never-cleaned units sort as oldest).
    shaped.sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
      const aTime = a.lastCleanedAt ? new Date(a.lastCleanedAt).getTime() : 0;
      const bTime = b.lastCleanedAt ? new Date(b.lastCleanedAt).getTime() : 0;
      return aTime - bTime;
    });

    const summary = {
      total: shaped.length,
      cleaningJobs: shaped.filter((u) => u.pendingWorkOrder && u.status === "needs_cleaning").length,
      repairJobs: shaped.filter((u) => u.pendingWorkOrder && u.status === "broken").length,
    };

    return NextResponse.json({ units: shaped, summary });
  } catch (error) {
    console.error("GET tech units error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

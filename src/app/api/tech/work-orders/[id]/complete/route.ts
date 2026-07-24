import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

async function verifyTechnician() {
  const session = await auth();
  if (!session?.user || session.user.role !== "technician" || !session.user.universityId) {
    return null;
  }
  return session.user;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tech = await verifyTechnician();
  if (!tech) return new NextResponse("Unauthorized", { status: 401 });

  const universityId = BigInt(tech.universityId!);
  const techId = BigInt(tech.id!);

  try {
    const { id } = await params;
    const workOrderId = BigInt(id);
    const body = await request.json();

    const {
      action,
      notes,
      beforePhotoUrl,
      afterPhotoUrl,
      customerSignatureUrl,
      estimatedCost,
    } = body;

    // Verify it belongs to tech
    const order = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
    });

    if (!order || order.universityId !== universityId) {
      return new NextResponse("Not Found", { status: 404 });
    }
    if (order.claimedBy !== techId || order.status !== "claimed") {
      return new NextResponse("Work order is not claimed by you", { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.workOrder.update({
        where: { id: workOrderId },
        data: {
          status: "completed",
          completedAt: new Date(),
          estimatedCost: estimatedCost ? Number(estimatedCost) : null,
        },
      });

      const log = await tx.maintenanceLog.create({
        data: {
          airConditionerId: order.airConditionerId,
          workOrderId,
          action: action || "COMPLETED",
          notes,
          userId: techId,
          beforePhotoUrl,
          afterPhotoUrl,
          customerSignatureUrl,
          performedAt: new Date(),
        },
      });

      return { updatedOrder, log };
    });

    await logAudit({
      universityId: universityId,
      userId: techId,
      action: "COMPLETE_WORKORDER",
      entityType: "workOrder",
      entityId: workOrderId,
      newValues: {
        status: "completed",
        action,
        estimatedCost,
        hasEvidence: !!(beforePhotoUrl || afterPhotoUrl || customerSignatureUrl),
      },
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
    });

    const serializeData = (data: any) => JSON.parse(
      JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value)
    );

    return NextResponse.json(serializeData(result));
  } catch (error) {
    console.error("POST complete work order error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

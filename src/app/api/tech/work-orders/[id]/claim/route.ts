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

export async function PATCH(
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

    // Verify it belongs to the tenant and is pending
    const order = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
    });

    if (!order || order.universityId !== universityId) {
      return new NextResponse("Not Found", { status: 404 });
    }
    if (order.status !== "pending") {
      return new NextResponse("Work order is not pending", { status: 400 });
    }

    const updatedOrder = await prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        status: "claimed",
        claimedBy: techId,
      },
    });

    await logAudit({
      universityId: universityId,
      userId: techId,
      action: "CLAIM_WORKORDER",
      entityType: "workOrder",
      entityId: workOrderId,
      newValues: { status: "claimed", claimedBy: tech.id },
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
    });

    const serializeData = (data: any) => JSON.parse(
      JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value)
    );

    return NextResponse.json(serializeData(updatedOrder));
  } catch (error) {
    console.error("PATCH claim work order error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

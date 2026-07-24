import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

async function verifyOrgAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "org_admin" || !session.user.universityId) {
    return null;
  }
  return session.user;
}

export async function GET(request: Request) {
  const admin = await verifyOrgAdmin();
  if (!admin) return new NextResponse("Unauthorized", { status: 401 });

  const universityId = BigInt(admin.universityId!);
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  try {
    const workOrders = await prisma.workOrder.findMany({
      where: {
        universityId,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        airConditioner: {
          include: {
            acBrand: true,
            room: { include: { building: true } },
          },
        },
        claimedByUser: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const serializeData = (data: any) => JSON.parse(
      JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value)
    );

    return NextResponse.json(serializeData(workOrders));
  } catch (error) {
    console.error("GET admin work orders error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await verifyOrgAdmin();
  if (!admin) return new NextResponse("Unauthorized", { status: 401 });

  const universityId = BigInt(admin.universityId!);
  const adminId = BigInt(admin.id!);

  try {
    const body = await request.json();
    const { airConditionerId } = body;

    if (!airConditionerId) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const acId = BigInt(airConditionerId);

    // Verify AC belongs to tenant
    const ac = await prisma.airConditioner.findUnique({
      where: { id: acId },
      include: { room: { include: { building: true } } },
    });

    if (!ac || ac.room.building.universityId !== universityId) {
      return new NextResponse("Air conditioner not found or unauthorized", { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.workOrder.create({
        data: {
          universityId,
          airConditionerId: acId,
          status: "pending",
        },
      });

      return order;
    });

    await logAudit({
      universityId,
      userId: adminId,
      action: "CREATE_WORKORDER",
      entityType: "workOrder",
      entityId: result.id,
      newValues: { airConditionerId: acId.toString() },
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
    });

    const serializeData = (data: any) => JSON.parse(
      JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value)
    );

    return NextResponse.json(serializeData(result), { status: 201 });
  } catch (error) {
    console.error("POST admin work order error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

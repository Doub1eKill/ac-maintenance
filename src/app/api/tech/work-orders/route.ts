import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function verifyTechnician() {
  const session = await auth();
  if (!session?.user || session.user.role !== "technician" || !session.user.universityId) {
    return null;
  }
  return session.user;
}

export async function GET() {
  const tech = await verifyTechnician();
  if (!tech) return new NextResponse("Unauthorized", { status: 401 });

  const universityId = BigInt(tech.universityId!);
  const techId = BigInt(tech.id!);

  try {
    const [pendingOrders, myJobs] = await Promise.all([
      prisma.workOrder.findMany({
        where: { universityId, status: "pending" },
        include: {
          airConditioner: {
            include: {
              acBrand: true,
              room: {
                include: { building: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.workOrder.findMany({
        where: { universityId, claimedBy: techId, status: "claimed" },
        include: {
          airConditioner: {
            include: {
              acBrand: true,
              room: {
                include: { building: true },
              },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    // Convert bigints for JSON serialization
    const serializeData = (data: any) => JSON.parse(
      JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value)
    );

    return NextResponse.json({
      pending: serializeData(pendingOrders),
      claimed: serializeData(myJobs),
    });
  } catch (error) {
    console.error("GET tech work orders error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

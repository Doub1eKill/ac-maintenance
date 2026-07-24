import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";

// Helper to verify Super Admin
async function checkSuperAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return null;
  }
  return session.user;
}

export async function GET() {
  const admin = await checkSuperAdmin();
  if (!admin) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const universities = await prisma.university.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { users: true, workOrders: true, buildings: true },
        },
      },
    });
    return NextResponse.json(universities);
  } catch (error) {
    console.error("GET universities error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await checkSuperAdmin();
  if (!admin) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const body = await request.json();
    const { name, shortName, contactName, contactEmail, contactPhone, adminEmail, adminPassword } = body;

    if (!name || !shortName || !adminEmail || !adminPassword) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Transaction to create university and default admin
    const result = await prisma.$transaction(async (tx) => {
      const university = await tx.university.create({
        data: {
          name,
          abbreviation: shortName,
          phone: contactPhone,
        },
      });

      const user = await tx.user.create({
        data: {
          universityId: university.id,
          name: contactName || "Org Admin",
          email: adminEmail,
          password: hashedPassword,
          role: "org_admin",
          status: "active",
        },
      });

      return { university, user };
    });

    // Write to SystemAuditLog
    await logAudit({
      universityId: result.university.id,
      userId: BigInt(admin.id),
      action: "CREATE_TENANT",
      entityType: "university",
      entityId: result.university.id,
      newValues: {
        name,
        shortName,
        adminEmail,
      },
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
    });

    // Convert bigints for JSON serialization
    const responseData = {
      ...result.university,
      id: result.university.id.toString(),
      adminId: result.user.id.toString(),
    };

    return NextResponse.json(responseData, { status: 201 });
  } catch (error) {
    console.error("POST university error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

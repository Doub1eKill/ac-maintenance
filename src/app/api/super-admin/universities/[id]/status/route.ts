import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

async function checkSuperAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return null;
  }
  return session.user;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await checkSuperAdmin();
  if (!admin) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const body = await request.json();
    const { status } = body;
    const { id } = await params;

    if (status !== "active" && status !== "suspended") {
      return new NextResponse("Invalid status", { status: 400 });
    }

    const universityId = BigInt(id);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update university
      const university = await tx.university.update({
        where: { id: universityId },
        data: {
          // You'd typically have a status field on University as well,
          // but if it's missing, we just suspend its users. Let's suspend users.
        },
      });

      // 2. Suspend/activate all users under this tenant
      await tx.user.updateMany({
        where: { universityId },
        data: { status },
      });

      return university;
    });

    await logAudit({
      universityId: universityId,
      userId: BigInt(admin.id),
      action: status === "suspended" ? "SUSPEND_TENANT" : "ACTIVATE_TENANT",
      entityType: "university",
      entityId: universityId,
      newValues: { status },
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
    });

    return NextResponse.json({ success: true, id, status });
  } catch (error) {
    console.error("PATCH university status error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

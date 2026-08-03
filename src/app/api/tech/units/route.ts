import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncOverdueMaintenanceWorkOrders, getTechnicianAssetList } from "@/lib/maintenance";

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
    const { units, summary } = await getTechnicianAssetList(universityId);

    return NextResponse.json({ units, summary });
  } catch (error) {
    console.error("GET tech units error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

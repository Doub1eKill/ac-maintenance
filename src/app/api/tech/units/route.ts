import { NextResponse } from "next/server";
import { sessionWithRole } from "@/lib/auth-guards";
import { syncOverdueMaintenanceWorkOrders, getTechnicianAssetList } from "@/lib/maintenance";

// Full asset list for the technician dashboard (backlog: all units with last-
// cleaned date, stalest first, overdue units pinned to the top regardless of
// date, plus a job-type summary). Deliberately a separate endpoint from
// /api/tech/work-orders so the existing claim-pool UI keeps working unchanged.
export async function GET() {
  if (!(await sessionWithRole("technician"))) return new NextResponse("Unauthorized", { status: 401 });

  try {
    await syncOverdueMaintenanceWorkOrders();
    const { units, summary } = await getTechnicianAssetList();

    return NextResponse.json({ units, summary });
  } catch (error) {
    console.error("GET tech units error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { runScheduledOverdueSync } from "@/lib/maintenance";

// Called once a day by Vercel Cron (vercel.json: 18:00 UTC = 01:00 in
// Bangkok), which sends "Authorization: Bearer <CRON_SECRET>" when that
// variable is set on the project. Raises the cleaning orders that came due
// and records the run, after which dashboards stop doing it on page loads
// (see syncOverdueMaintenanceWorkOrders).
//
// Refuses everything until CRON_SECRET is set: an open endpoint would let
// anyone make the app write. Without it the dashboards keep raising the
// orders themselves, as before.
function authorised(header: string | null, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header ?? "");
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron] overdue-maintenance called but CRON_SECRET is not set");
    return new NextResponse("CRON_SECRET is not configured", { status: 503 });
  }
  if (!authorised(request.headers.get("authorization"), secret)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const created = await runScheduledOverdueSync();
    revalidatePath("/admin", "layout");
    revalidatePath("/tech", "layout");
    return NextResponse.json({ created, at: new Date().toISOString() });
  } catch (error) {
    console.error("[cron] overdue-maintenance failed:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

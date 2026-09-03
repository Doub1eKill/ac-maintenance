"use server";

// The only file the technician UI imports from. Every action below is a thin
// pass-through to a plain module in src/lib/tech/.
//
// This mirrors what src/app/admin/actions.ts has done since 25 Aug, and for the
// same reason: Next refuses to let a "use server" file re-export anything
// (`export { x } from "./y"` fails the build with "Only async functions are
// allowed to be exported in a 'use server' file" while tsc stays quiet), so the
// implementations cannot simply be moved out and re-exported. Wrapping each one
// is the way to keep this file as the single public surface.
//
// Adding an action means writing it in src/lib/tech/ AND adding a wrapper here.
// Skipping the second step leaves it uncallable from the UI.

import * as dashboard from "@/lib/tech/dashboard";
import * as jobs from "@/lib/tech/jobs";
import * as maintenanceLog from "@/lib/tech/maintenance-log";
import * as qr from "@/lib/tech/qr";

// --- dashboard ---

export async function getTechnicianData(
  ...args: Parameters<typeof dashboard.getTechnicianData>
) {
  return dashboard.getTechnicianData(...args);
}

// --- claiming work ---

export async function claimWorkOrderAction(
  ...args: Parameters<typeof jobs.claimWorkOrderAction>
) {
  return jobs.claimWorkOrderAction(...args);
}

export async function bulkClaimWorkOrdersAction(
  ...args: Parameters<typeof jobs.bulkClaimWorkOrdersAction>
) {
  return jobs.bulkClaimWorkOrdersAction(...args);
}

// --- recording a visit ---

export async function logMaintenanceAction(
  ...args: Parameters<typeof maintenanceLog.logMaintenanceAction>
) {
  return maintenanceLog.logMaintenanceAction(...args);
}

// --- QR scanning ---

export async function scanQrCodeAction(...args: Parameters<typeof qr.scanQrCodeAction>) {
  return qr.scanQrCodeAction(...args);
}

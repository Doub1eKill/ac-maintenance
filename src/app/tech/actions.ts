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
// The asset catalogue is not duplicated under src/lib/tech: these are the same
// modules the admin pages call, now behind verifyAssetEditor instead of
// verifyOrgAdmin. Their rules — retired models filtered out, the first-due-date
// cutoff, the two mutually exclusive brand paths, the schedule opened inside
// the unit's transaction — are the reason there is one copy and not two.
import * as masterData from "@/lib/admin/master-data";
import * as airConditioners from "@/lib/admin/air-conditioners";
import * as schedules from "@/lib/admin/schedules";

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

// --- the AC catalogue ---
//
// Adding only. Deleting, restoring and purging stay off this surface on
// purpose: they are guarded by verifyOrgAdmin and would throw even if a
// wrapper existed, and leaving them out means the technician bundle never
// carries a reference to them at all.

export async function getAcMasterDataAction(
  ...args: Parameters<typeof masterData.getAcMasterData>
) {
  return masterData.getAcMasterData(...args);
}

export async function createAcBrandAction(
  ...args: Parameters<typeof masterData.createAcBrandAction>
) {
  return masterData.createAcBrandAction(...args);
}

export async function createAcModelAction(
  ...args: Parameters<typeof masterData.createAcModelAction>
) {
  return masterData.createAcModelAction(...args);
}

// --- units ---

export async function createAirConditionerAction(
  ...args: Parameters<typeof airConditioners.createAirConditionerAction>
) {
  return airConditioners.createAirConditionerAction(...args);
}

export async function updateAirConditionerAction(
  ...args: Parameters<typeof airConditioners.updateAirConditionerAction>
) {
  return airConditioners.updateAirConditionerAction(...args);
}

export async function saveMaintenanceScheduleAction(
  ...args: Parameters<typeof schedules.saveMaintenanceScheduleAction>
) {
  return schedules.saveMaintenanceScheduleAction(...args);
}

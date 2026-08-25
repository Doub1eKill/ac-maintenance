"use server";

// The org admin server action surface — the one module the UI imports from.
//
// The implementations live in src/lib/admin/*, split by area: the dashboard
// query, work orders, system settings, and assets. This file exists to expose
// them, and to be the only place where that exposure is declared.
//
// Two constraints shape it. A "use server" file may only export async
// functions, so it cannot re-export from those modules directly — hence the
// wrappers. And the UI imports every one of these from "@/app/admin/actions",
// in files owned by the other developer, so the path and the names have to stay
// exactly as they were.
//
// Each wrapper borrows its parameters from the implementation with
// Parameters<typeof ...>, so a signature only ever changes in one place.

import * as dashboard from "@/lib/admin/dashboard";
import * as workOrders from "@/lib/admin/work-orders";
import * as settings from "@/lib/admin/settings";
import * as assets from "@/lib/admin/assets";

// --- dashboard ---

export async function getOrgAdminData() {
  return dashboard.getOrgAdminData();
}

// --- work orders ---

export async function getWorkOrdersPage(
  ...args: Parameters<typeof workOrders.getWorkOrdersPage>
) {
  return workOrders.getWorkOrdersPage(...args);
}

export async function createWorkOrderAction(
  ...args: Parameters<typeof workOrders.createWorkOrderAction>
) {
  return workOrders.createWorkOrderAction(...args);
}

export async function assignWorkOrderAction(
  ...args: Parameters<typeof workOrders.assignWorkOrderAction>
) {
  return workOrders.assignWorkOrderAction(...args);
}

export async function cancelWorkOrderAction(
  ...args: Parameters<typeof workOrders.cancelWorkOrderAction>
) {
  return workOrders.cancelWorkOrderAction(...args);
}

// --- users, profile, system settings ---

export async function updateUserStatusByOrgAdminAction(
  ...args: Parameters<typeof settings.updateUserStatusByOrgAdminAction>
) {
  return settings.updateUserStatusByOrgAdminAction(...args);
}

export async function updateProfileAction(
  ...args: Parameters<typeof settings.updateProfileAction>
) {
  return settings.updateProfileAction(...args);
}

export async function updateDefaultFrequencyAction(
  ...args: Parameters<typeof settings.updateDefaultFrequencyAction>
) {
  return settings.updateDefaultFrequencyAction(...args);
}

export async function updateOrganisationInfoAction(
  ...args: Parameters<typeof settings.updateOrganisationInfoAction>
) {
  return settings.updateOrganisationInfoAction(...args);
}

export async function adminResetUserPasswordAction(
  ...args: Parameters<typeof settings.adminResetUserPasswordAction>
) {
  return settings.adminResetUserPasswordAction(...args);
}

export async function getAuditLogs(
  ...args: Parameters<typeof settings.getAuditLogs>
) {
  return settings.getAuditLogs(...args);
}

// --- buildings, rooms, units, service history ---

export async function createBuildingAction(
  ...args: Parameters<typeof assets.createBuildingAction>
) {
  return assets.createBuildingAction(...args);
}

export async function createRoomAction(
  ...args: Parameters<typeof assets.createRoomAction>
) {
  return assets.createRoomAction(...args);
}

export async function createAirConditionerAction(
  ...args: Parameters<typeof assets.createAirConditionerAction>
) {
  return assets.createAirConditionerAction(...args);
}

export async function updateAirConditionerAction(
  ...args: Parameters<typeof assets.updateAirConditionerAction>
) {
  return assets.updateAirConditionerAction(...args);
}

export async function getAirConditionerHistory(
  ...args: Parameters<typeof assets.getAirConditionerHistory>
) {
  return assets.getAirConditionerHistory(...args);
}

export async function updateMaintenanceLogAction(
  ...args: Parameters<typeof assets.updateMaintenanceLogAction>
) {
  return assets.updateMaintenanceLogAction(...args);
}

export async function saveMaintenanceScheduleAction(
  ...args: Parameters<typeof assets.saveMaintenanceScheduleAction>
) {
  return assets.saveMaintenanceScheduleAction(...args);
}

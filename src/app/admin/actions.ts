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

import * as workOrders from "@/lib/admin/work-orders";
import * as pages from "@/lib/admin/pages";
import * as users from "@/lib/admin/users";
import * as profile from "@/lib/admin/profile";
import * as organisationSettings from "@/lib/admin/organisation-settings";
import * as auditLog from "@/lib/admin/audit-log";
import * as buildings from "@/lib/admin/buildings";
import * as rooms from "@/lib/admin/rooms";
import * as airConditioners from "@/lib/admin/air-conditioners";
import * as maintenanceLogs from "@/lib/admin/maintenance-logs";
import * as schedules from "@/lib/admin/schedules";

// --- work orders ---

// --- the header search box ---

export async function getAdminSearchIndexAction(
  ...args: Parameters<typeof pages.getAdminSearchIndex>
) {
  return pages.getAdminSearchIndex(...args);
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

export async function bulkAssignWorkOrdersAction(
  ...args: Parameters<typeof workOrders.bulkAssignWorkOrdersAction>
) {
  return workOrders.bulkAssignWorkOrdersAction(...args);
}

export async function cancelWorkOrderAction(
  ...args: Parameters<typeof workOrders.cancelWorkOrderAction>
) {
  return workOrders.cancelWorkOrderAction(...args);
}

// --- users, profile, system settings ---

export async function updateUserStatusByOrgAdminAction(
  ...args: Parameters<typeof users.updateUserStatusByOrgAdminAction>
) {
  return users.updateUserStatusByOrgAdminAction(...args);
}

export async function getHeldWorkOrders(
  ...args: Parameters<typeof users.getHeldWorkOrders>
) {
  return users.getHeldWorkOrders(...args);
}

export async function deleteUserByOrgAdminAction(
  ...args: Parameters<typeof users.deleteUserByOrgAdminAction>
) {
  return users.deleteUserByOrgAdminAction(...args);
}

export async function updateProfileAction(
  ...args: Parameters<typeof profile.updateProfileAction>
) {
  return profile.updateProfileAction(...args);
}

export async function updateDefaultFrequencyAction(
  ...args: Parameters<typeof organisationSettings.updateDefaultFrequencyAction>
) {
  return organisationSettings.updateDefaultFrequencyAction(...args);
}

export async function updateOrganisationInfoAction(
  ...args: Parameters<typeof organisationSettings.updateOrganisationInfoAction>
) {
  return organisationSettings.updateOrganisationInfoAction(...args);
}

export async function getTechnicianDetail(
  ...args: Parameters<typeof users.getTechnicianDetail>
) {
  return users.getTechnicianDetail(...args);
}

export async function adminResetUserPasswordAction(
  ...args: Parameters<typeof users.adminResetUserPasswordAction>
) {
  return users.adminResetUserPasswordAction(...args);
}

export async function getAuditLogs(
  ...args: Parameters<typeof auditLog.getAuditLogs>
) {
  return auditLog.getAuditLogs(...args);
}

// --- buildings, rooms, units, service history ---

export async function createBuildingAction(
  ...args: Parameters<typeof buildings.createBuildingAction>
) {
  return buildings.createBuildingAction(...args);
}

export async function createRoomAction(
  ...args: Parameters<typeof rooms.createRoomAction>
) {
  return rooms.createRoomAction(...args);
}

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

export async function getAirConditionerHistory(
  ...args: Parameters<typeof maintenanceLogs.getAirConditionerHistory>
) {
  return maintenanceLogs.getAirConditionerHistory(...args);
}

export async function updateMaintenanceLogAction(
  ...args: Parameters<typeof maintenanceLogs.updateMaintenanceLogAction>
) {
  return maintenanceLogs.updateMaintenanceLogAction(...args);
}

export async function saveMaintenanceScheduleAction(
  ...args: Parameters<typeof schedules.saveMaintenanceScheduleAction>
) {
  return schedules.saveMaintenanceScheduleAction(...args);
}

// --- per-page loaders ---

export async function getCreateWorkOrderFormData(
  ...args: Parameters<typeof pages.getCreateWorkOrderFormData>
) {
  return pages.getCreateWorkOrderFormData(...args);
}

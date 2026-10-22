"use server";

// The catalogue actions the settings panel and the trash modal import from.
// Thin pass-throughs to src/lib/admin/master-data.ts, for the same reason
// app/admin/actions.ts and app/tech/actions.ts are: a "use server" file may
// export only async functions, so the implementation cannot be re-exported from
// here and each action has to be wrapped instead.
//
// Adding an action means writing it in src/lib/admin/master-data.ts AND adding
// a wrapper here. Skipping the second step leaves it uncallable from the UI.

import * as masterData from "@/lib/admin/master-data";

// --- reading the catalogue ---

export async function getAcMasterData(
  ...args: Parameters<typeof masterData.getAcMasterData>
) {
  return masterData.getAcMasterData(...args);
}

export async function getAcTrashData(
  ...args: Parameters<typeof masterData.getAcTrashData>
) {
  return masterData.getAcTrashData(...args);
}

// --- creating ---

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

// --- moving typed-in brands and models into the catalogue ---

export async function getCustomUnitGroups(
  ...args: Parameters<typeof masterData.getCustomUnitGroups>
) {
  return masterData.getCustomUnitGroups(...args);
}

export async function addCustomBrandModelToCatalogueAction(
  ...args: Parameters<typeof masterData.addCustomBrandModelToCatalogueAction>
) {
  return masterData.addCustomBrandModelToCatalogueAction(...args);
}

export async function linkCustomUnitsToCatalogueAction(
  ...args: Parameters<typeof masterData.linkCustomUnitsToCatalogueAction>
) {
  return masterData.linkCustomUnitsToCatalogueAction(...args);
}

// --- renaming ---

export async function updateAcBrandAction(
  ...args: Parameters<typeof masterData.updateAcBrandAction>
) {
  return masterData.updateAcBrandAction(...args);
}

export async function updateAcModelAction(
  ...args: Parameters<typeof masterData.updateAcModelAction>
) {
  return masterData.updateAcModelAction(...args);
}

// --- retiring, restoring and purging brands ---

export async function deleteAcBrandAction(
  ...args: Parameters<typeof masterData.deleteAcBrandAction>
) {
  return masterData.deleteAcBrandAction(...args);
}

export async function restoreAcBrandAction(
  ...args: Parameters<typeof masterData.restoreAcBrandAction>
) {
  return masterData.restoreAcBrandAction(...args);
}

export async function permanentlyDeleteAcBrandAction(
  ...args: Parameters<typeof masterData.permanentlyDeleteAcBrandAction>
) {
  return masterData.permanentlyDeleteAcBrandAction(...args);
}

// --- retiring, restoring and purging models ---

export async function deleteAcModelAction(
  ...args: Parameters<typeof masterData.deleteAcModelAction>
) {
  return masterData.deleteAcModelAction(...args);
}

export async function restoreAcModelAction(
  ...args: Parameters<typeof masterData.restoreAcModelAction>
) {
  return masterData.restoreAcModelAction(...args);
}

export async function permanentlyDeleteAcModelAction(
  ...args: Parameters<typeof masterData.permanentlyDeleteAcModelAction>
) {
  return masterData.permanentlyDeleteAcModelAction(...args);
}

import { prisma } from "@/lib/prisma";

/**
 * The institution this deployment serves.
 *
 * Originally a row in `universities`, then a hardcoded constant once F1
 * removed that table, and now an editable field in SystemSettings. The
 * fallback below is what the constant used to hold: settings start with the
 * name unset, and an installation that never fills it in should still show
 * something sensible rather than an empty header.
 */
export const DEFAULT_ORGANISATION_NAME = "มหาวิทยาลัยราชภัฏภูเก็ต";

export interface OrganisationInfo {
  name: string;
  address: string | null;
  phone: string | null;
}

export async function getOrganisationInfo(): Promise<OrganisationInfo> {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: 1 },
      select: { organisationName: true, organisationAddress: true, organisationPhone: true },
    });

    return {
      name: settings?.organisationName?.trim() || DEFAULT_ORGANISATION_NAME,
      address: settings?.organisationAddress ?? null,
      phone: settings?.organisationPhone ?? null,
    };
  } catch (error) {
    // Every caller is rendering a page header. A settings lookup failing is
    // not a reason for the whole dashboard to fail with it, so fall back to
    // the built-in name and let the caller's own error handling deal with
    // whatever else the outage breaks.
    console.error("[organisation] settings lookup failed:", error);
    return { name: DEFAULT_ORGANISATION_NAME, address: null, phone: null };
  }
}

export async function getOrganisationName(): Promise<string> {
  return (await getOrganisationInfo()).name;
}

/**
 * The maintenance cycle given to newly registered units. Existing units keep
 * whatever cycle they already have — changing this never rewrites them.
 */
export async function getDefaultMaintenanceFrequency(): Promise<{
  value: number;
  unit: string;
}> {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: 1 },
      select: { defaultFrequencyValue: true, defaultFrequencyUnit: true },
    });
    return {
      value: settings?.defaultFrequencyValue ?? 6,
      unit: settings?.defaultFrequencyUnit ?? "months",
    };
  } catch (error) {
    console.error("[organisation] default frequency lookup failed:", error);
    return { value: 6, unit: "months" };
  }
}

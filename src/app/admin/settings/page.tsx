import { getSettingsPageData } from "@/lib/admin/pages";
import { SettingsPanel } from "@/components/admin/settings-panel";

export const metadata = { title: "ตั้งค่าระบบ | AC Maintenance System" };

export default async function AdminSettingsPage() {
  const { masterDataBrands, organisationInfo, defaultFrequency } = await getSettingsPageData();

  return (
    <SettingsPanel
      brands={masterDataBrands}
      organisationInfo={organisationInfo}
      defaultFrequency={defaultFrequency}
    />
  );
}

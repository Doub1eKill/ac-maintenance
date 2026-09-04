import { getAdminShellData } from "@/lib/admin/pages";
import { ProfilePanel } from "@/components/shared/profile-panel";

export const metadata = { title: "จัดการโปรไฟล์ | AC Maintenance System" };

export default async function AdminProfilePage() {
  const { profile, universityName } = await getAdminShellData();
  return <ProfilePanel profile={profile} universityName={universityName} />;
}

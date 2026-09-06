import { getTechShellData } from "@/lib/tech/pages";
import { ProfilePanel } from "@/components/shared/profile-panel";

export const metadata = { title: "โปรไฟล์ของฉัน | AC Maintenance System" };

export default async function TechProfilePage() {
  const { profile, universityName } = await getTechShellData();
  return <ProfilePanel profile={profile} universityName={universityName} />;
}

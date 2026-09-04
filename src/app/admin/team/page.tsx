import { getTeamPageData, getAdminShellData } from "@/lib/admin/pages";
import { TeamClient } from "./team-client";

export const metadata = { title: "เจ้าหน้าที่ & ช่าง | AC Maintenance System" };

export default async function TeamPage() {
  const [{ allUsers }, { user }] = await Promise.all([getTeamPageData(), getAdminShellData()]);

  return <TeamClient allUsers={allUsers} currentUserId={user.id} />;
}

import { getApprovalsPageData, getAdminShellData } from "@/lib/admin/pages";
import { ApprovalsClient } from "./approvals-client";

export const metadata = { title: "อนุมัติผู้ใช้งาน | AC Maintenance System" };

export default async function ApprovalsPage() {
  const [{ pendingUsers }, { universityName }] = await Promise.all([
    getApprovalsPageData(),
    getAdminShellData(),
  ]);

  return <ApprovalsClient pendingUsers={pendingUsers} universityName={universityName} />;
}

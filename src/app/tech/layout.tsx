import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTechShellData } from "@/lib/tech/pages";
import { TechShell } from "@/components/tech/tech-shell";
import { BrowserSessionGuard } from "@/components/auth/browser-session-guard";
import { PresenceHeartbeat } from "@/components/auth/presence-heartbeat";

export const metadata = {
  title: "Technician Workspace | AC Maintenance System",
  description: "พื้นที่ปฏิบัติงานช่างเทคนิคสำหรับรับงาน สแกน QR Code และบันทึกประวัติการซ่อมบำรุง",
};

export default async function TechLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "technician") {
    redirect("/");
  }

  const { user, universityName, buildings, badges } = await getTechShellData();

  return (
    <TechShell user={user} universityName={universityName} buildings={buildings} badges={badges}>
      <BrowserSessionGuard />
      <PresenceHeartbeat />
      {children}
    </TechShell>
  );
}

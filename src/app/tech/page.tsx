import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { NavHeader } from "@/components/layout/nav-header";
import { getTechnicianData } from "./actions";
import { TechMobileView } from "@/components/tech/tech-mobile-view";

export const metadata = {
  title: "Technician Workspace | AC Maintenance System",
  description: "พื้นที่ปฏิบัติงานช่างเทคนิคสำหรับรับงาน สแกน QR Code และบันทึกประวัติการซ่อมบำรุง",
};

export default async function TechHomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "technician") {
    redirect("/");
  }

  const { universityName, jobPool, myJobs } = await getTechnicianData();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-white">
      <NavHeader
        user={{
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
          universityName,
        }}
      />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <TechMobileView
          universityName={universityName}
          jobPool={jobPool}
          myJobs={myJobs}
        />
      </main>
    </div>
  );
}

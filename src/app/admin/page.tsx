import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { NavHeader } from "@/components/layout/nav-header";
import { getOrgAdminData } from "./actions";
import { AdminDashboardView } from "@/components/admin/admin-dashboard-view";

export const metadata = {
  title: "Org Admin Dashboard | AC Maintenance System",
  description: "ระบบบริหารจัดการเครื่องปรับอากาศและออกใบงานซ่อมบำรุงมหาวิทยาลัย",
};

export default async function AdminHomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "org_admin") {
    redirect("/");
  }

  const { universityName, metrics, workOrders, buildings, allAcUnits } =
    await getOrgAdminData();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-sky-500 selection:text-white">
      <NavHeader
        user={{
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
          universityName,
        }}
      />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <AdminDashboardView
          universityName={universityName}
          metrics={metrics}
          workOrders={workOrders}
          buildings={buildings}
          allAcUnits={allAcUnits}
        />
      </main>
    </div>
  );
}

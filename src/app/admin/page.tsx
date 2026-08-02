import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
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

  const {
    dbError,
    universityName,
    metrics,
    workOrders,
    buildings,
    allAcUnits,
    pendingUsers,
    allUsers,
    brands,
    weeklyActivity,
    urgentUnits,
  } = await getOrgAdminData();

  return (
    <AdminDashboardView
      user={{
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      }}
      dbError={dbError}
      universityName={universityName}
      metrics={metrics}
      workOrders={workOrders}
      buildings={buildings}
      allAcUnits={allAcUnits}
      pendingUsers={pendingUsers}
      allUsers={allUsers}
      brands={brands || []}
      weeklyActivity={weeklyActivity}
      urgentUnits={urgentUnits}
    />
  );
}

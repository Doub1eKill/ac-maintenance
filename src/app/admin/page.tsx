import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOrgAdminData } from "./actions";
import { getAcMasterData } from "./master-data/actions";
import { getOrganisationInfo, getDefaultMaintenanceFrequency } from "@/lib/organisation";
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
    profile,
    metrics,
    workOrders,
    workOrderPage,
    buildings,
    allAcUnits,
    pendingUsers,
    allUsers,
    brands,
    weeklyActivity,
    urgentUnits,
  } = await getOrgAdminData();
  const { brands: masterDataBrands } = await getAcMasterData();
  const [organisationInfo, defaultFrequency] = await Promise.all([
    getOrganisationInfo(),
    getDefaultMaintenanceFrequency(),
  ]);

  return (
    <AdminDashboardView
      user={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      }}
      dbError={dbError}
      universityName={universityName}
      profile={profile}
      metrics={metrics}
      workOrders={workOrders}
      workOrderPage={workOrderPage}
      buildings={buildings}
      allAcUnits={allAcUnits}
      pendingUsers={pendingUsers}
      allUsers={allUsers}
      brands={brands || []}
      masterDataBrands={masterDataBrands}
      weeklyActivity={weeklyActivity}
      urgentUnits={urgentUnits}
      organisationInfo={organisationInfo}
      defaultFrequency={defaultFrequency}
    />
  );
}

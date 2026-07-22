import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSuperAdminData } from "./actions";
import { SuperAdminView } from "@/components/super-admin/super-admin-view";

export const metadata = {
  title: "Super Admin Dashboard | AC Maintenance System",
  description: "แดชบอร์ดบริหารจัดการแพลตฟอร์มส่วนกลางระดับ Multi-tenant",
};

export default async function SuperAdminPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "super_admin") {
    redirect("/");
  }

  const { dbError, metrics, pendingUsers, universities } = await getSuperAdminData();

  return (
    <SuperAdminView
      user={{
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      }}
      dbError={dbError}
      metrics={metrics}
      pendingUsers={pendingUsers}
      universities={universities}
    />
  );
}

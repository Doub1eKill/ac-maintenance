import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { NavHeader } from "@/components/layout/nav-header";
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

  const { metrics, pendingUsers, universities } = await getSuperAdminData();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-purple-500 selection:text-white">
      <NavHeader
        user={{
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
          universityName: "Platform Central System",
        }}
      />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <SuperAdminView
          metrics={metrics}
          pendingUsers={pendingUsers}
          universities={universities}
        />
      </main>
    </div>
  );
}

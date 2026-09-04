import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAdminShellData } from "@/lib/admin/pages";
import { AdminShell } from "@/components/admin/admin-shell";
import { CreateWorkOrderProvider } from "@/components/admin/create-work-order-provider";

export const metadata = {
  title: "Org Admin Dashboard | AC Maintenance System",
  description: "ระบบบริหารจัดการเครื่องปรับอากาศและออกใบงานซ่อมบำรุงมหาวิทยาลัย",
};

/**
 * The admin area's shell: the guard, the sidebar and the header, rendered once
 * for all nine pages. Each page under it loads only its own data.
 *
 * The role check lives here rather than being repeated in every page — it used
 * to be the first thing app/admin/page.tsx did when that was the only route.
 * src/proxy.ts already blocks anonymous requests to /admin/*; this is the
 * second check, and the one that knows about roles.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "org_admin") {
    redirect("/");
  }

  const { user, universityName, badges } = await getAdminShellData();

  return (
    <CreateWorkOrderProvider>
      <AdminShell user={user} universityName={universityName} badges={badges}>
        {children}
      </AdminShell>
    </CreateWorkOrderProvider>
  );
}

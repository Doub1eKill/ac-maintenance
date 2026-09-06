"use client";

import { usePathname } from "next/navigation";
import {
  Building2,
  Snowflake,
  ClipboardList,
  Calendar,
  Users,
  Clock,
  QrCode,
  User,
  Settings,
} from "lucide-react";
import { DashboardLayout, NavItem } from "@/components/layout/dashboard-layout";
import {
  DashboardSearchProvider,
  useDashboardSearchControl,
} from "@/components/layout/dashboard-search";
import { useCreateWorkOrder } from "@/components/admin/create-work-order-provider";

/**
 * The chrome every admin page sits inside: sidebar, header, search box and the
 * "สร้างใบงานซ่อมบำรุง" button.
 *
 * Rendered once by app/admin/layout.tsx, so navigating between pages replaces
 * only the content. Which item is lit comes from the URL rather than from a
 * useState that used to live in admin-dashboard-view.tsx alongside seventeen
 * props and eight pieces of state.
 */
export interface AdminShellProps {
  user: {
    id?: string | null;
    name?: string | null;
    email?: string | null;
    role?: string | null;
    avatarUrl?: string | null;
  };
  universityName: string;
  badges: { pendingWorkOrders: number; pendingUsers: number };
  children: React.ReactNode;
}

// Which pages have a search box, and what it says. A page missing from this map
// gets no box at all — the header used to decide that with a list of tab ids
// spelled out inline in a ternary.
const SEARCH_PLACEHOLDERS: Record<string, string> = {
  "/admin/work-orders": "ค้นหารหัสแอร์, สถานที่, หรือแบรนด์...",
  "/admin/team": "ค้นหาชื่อ หรืออีเมล...",
  "/admin/assets": "ค้นหาชื่ออาคาร, เลขห้อง...",
  "/admin/qr-codes": "ค้นหารหัสแอร์, ยี่ห้อ, สถานที่...",
};

function AdminShellInner({ user, universityName, badges, children }: AdminShellProps) {
  const pathname = usePathname();
  const { search, setSearch } = useDashboardSearchControl();
  const createWorkOrder = useCreateWorkOrder();

  const navItems: NavItem[] = [
    { id: "overview", label: "ภาพรวมระบบ", icon: Snowflake, group: "หน้าหลัก", href: "/admin" },
    {
      id: "kanban",
      label: "กระดานใบงาน",
      icon: ClipboardList,
      badge: badges.pendingWorkOrders,
      group: "การซ่อมบำรุง",
      href: "/admin/work-orders",
    },
    { id: "calendar", label: "ปฏิทินซ่อมบำรุง", icon: Calendar, group: "การซ่อมบำรุง", href: "/admin/calendar" },
    {
      id: "approvals",
      label: "อนุมัติผู้ใช้งาน",
      icon: Clock,
      badge: badges.pendingUsers,
      group: "ผู้ใช้งานและบุคลากร",
      href: "/admin/approvals",
    },
    { id: "team", label: "เจ้าหน้าที่ & ช่าง", icon: Users, group: "ผู้ใช้งานและบุคลากร", href: "/admin/team" },
    { id: "assets", label: "ระบบสินทรัพย์", icon: Building2, group: "ระบบทรัพย์สิน", href: "/admin/assets" },
    { id: "qr_codes", label: "จัดการ QR Code", icon: QrCode, group: "ระบบทรัพย์สิน", href: "/admin/qr-codes" },
    { id: "profile", label: "จัดการโปรไฟล์", icon: User, group: "บัญชีและการตั้งค่า", href: "/admin/profile" },
    { id: "settings", label: "ตั้งค่าระบบ", icon: Settings, group: "บัญชีและการตั้งค่า", href: "/admin/settings" },
  ];

  const placeholder = SEARCH_PLACEHOLDERS[pathname];

  return (
    <DashboardLayout
      user={{ name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl, universityName }}
      navItems={navItems}
      searchValue={search}
      onSearchChange={placeholder ? setSearch : undefined}
      searchPlaceholder={placeholder}
      onCreateAction={createWorkOrder.openBlank}
      createActionLabel="+ สร้างใบงานซ่อมบำรุง"
    >
      {children}
    </DashboardLayout>
  );
}

export function AdminShell(props: AdminShellProps) {
  return (
    <DashboardSearchProvider>
      <AdminShellInner {...props} />
    </DashboardSearchProvider>
  );
}

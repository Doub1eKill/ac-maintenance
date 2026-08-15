"use client";

import { useState, useTransition } from "react";
import { createWorkOrderAction, updateUserStatusByOrgAdminAction, assignWorkOrderAction } from "@/app/admin/actions";
import {
  Building2,
  Snowflake,
  AlertTriangle,
  ClipboardList,
  CheckCircle2,
  Clock,
  X,
  Calendar,
  Users,
  QrCode,
  User,
  Settings,
  Database,
} from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import {
  Alert,
  AlertTitle,
  AlertDescription,
  AlertAction,
} from "@/components/ui/alert";
import dynamic from "next/dynamic";
import { DashboardLayout, NavItem } from "@/components/layout/dashboard-layout";
import { AssetManager } from "@/components/admin/asset-manager";
import { ProfilePanel } from "@/components/admin/profile-panel";
import { QrCodeManager } from "@/components/admin/qr-code-manager";
import { OverviewPanel } from "@/components/admin/overview-panel";
import { WorkOrderBoard } from "@/components/admin/work-order-board";
import { UserApprovalsPanel } from "@/components/admin/user-approvals-panel";
import { TeamPanel } from "@/components/admin/team-panel";
import { CreateWorkOrderModal } from "@/components/admin/create-work-order-modal";
import { AssignWorkOrderModal } from "@/components/admin/assign-work-order-modal";
import { WorkOrderDetailDialog } from "@/components/admin/work-order-detail-dialog";
import type { WorkOrderItem, BuildingItem, PendingUser } from "@/components/admin/types";
import type { UrgentMaintenanceAC } from "@/components/admin/upcoming-maintenance-table";

// Both pull in a chunk of their own weight (recharts, date-fns) that only
// the tab actually showing them needs to pay for — code-split instead of
// bundling them into every load of this file.
const MaintenanceCalendar = dynamic(
  () => import("@/components/shared/maintenance-calendar").then((m) => m.MaintenanceCalendar),
  { ssr: false, loading: () => <ChunkLoadingFallback /> }
);

function ChunkLoadingFallback() {
  return (
    <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-white">
      <AnimatedIcon icon={Clock} size={24} animation="spin" className="text-primary" />
    </div>
  );
}

interface AdminDashboardViewProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
  dbError?: string | null;
  universityName: string;
  profile: {
    name: string;
    email: string;
    role?: string | null;
    phone: string | null;
  };
  metrics: {
    totalUnits: number;
    brokenOrCleaningUnits: number;
    repairUnits: number;
    cleaningUnits: number;
    pendingWorkOrders: number;
    activeTechsCount: number;
    pendingUsersCount?: number;
  };
  weeklyActivity: Array<{ day: string; repairs: number }>;
  urgentUnits: UrgentMaintenanceAC[];
  workOrders: WorkOrderItem[];
  buildings: BuildingItem[];
  allAcUnits: Array<{ id: string; label: string }>;
  pendingUsers?: PendingUser[];
  allUsers?: PendingUser[];
  brands: any[];
}

export function AdminDashboardView({
  user,
  dbError,
  universityName,
  profile,
  metrics,
  weeklyActivity = [],
  workOrders,
  buildings,
  pendingUsers = [],
  allUsers = [],
  brands = [],
  urgentUnits = [],
}: AdminDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isPending, startTransition] = useTransition();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAcForWorkOrder, setSelectedAcForWorkOrder] = useState<string | null>(null);
  const [selectedOrderToAssign, setSelectedOrderToAssign] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selectedWorkOrderDetails, setSelectedWorkOrderDetails] = useState<WorkOrderItem | null>(null);

  const activeTechnicians = allUsers.filter((u) => u.role === "technician" && u.status === "active");

  async function handleCreateOrderSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setToastMessage(null);
    const formData = new FormData(e.currentTarget);
    const acId = formData.get("airConditionerId") as string;

    if (!acId) {
      setToastMessage({ type: "error", text: "กรุณาเลือกเครื่องปรับอากาศที่ต้องการแจ้งซ่อม" });
      return;
    }

    startTransition(async () => {
      const res = await createWorkOrderAction(formData);
      if (res.error) {
        setToastMessage({ type: "error", text: res.error });
      } else {
        setToastMessage({ type: "success", text: "ออกใบงานซ่อมบำรุงด่วนเรียบร้อยแล้ว" });
        setShowCreateModal(false);
      }
    });
  }

  async function handleAssignSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedOrderToAssign) return;
    setToastMessage(null);
    const formData = new FormData(e.currentTarget);
    const assignToUserId = formData.get("assignToUserId") as string;

    if (!assignToUserId) {
      setToastMessage({ type: "error", text: "กรุณาเลือกช่างเทคนิค" });
      return;
    }

    startTransition(async () => {
      const res = await assignWorkOrderAction(selectedOrderToAssign, assignToUserId);
      if (res.error) {
        setToastMessage({ type: "error", text: res.error });
      } else {
        setToastMessage({ type: "success", text: "มอบหมายงานเรียบร้อยแล้ว" });
        setShowAssignModal(false);
        setSelectedOrderToAssign(null);
      }
    });
  }

  function handleOpenCalendarWorkOrder(acId: string) {
    setSelectedAcForWorkOrder(acId);
    setShowCreateModal(true);
  }

  function handleUserStatus(userId: string, newStatus: "active" | "suspended") {
    setToastMessage(null);
    startTransition(async () => {
      const res = await updateUserStatusByOrgAdminAction(userId, newStatus);
      if (res.error) {
        setToastMessage({ type: "error", text: res.error });
      } else {
        setToastMessage({
          type: "success",
          text: newStatus === "active" ? "อนุมัติสิทธิ์เข้าใช้งานสำเร็จ" : "ระงับสิทธิ์เข้าใช้งานสำเร็จ",
        });
      }
    });
  }

  const adminNavItems: NavItem[] = [
    {
      id: "overview",
      label: "ภาพรวมระบบ",
      icon: Snowflake,
      group: "หน้าหลัก",
    },
    {
      id: "kanban",
      label: "กระดานใบงาน",
      icon: ClipboardList,
      badge: metrics.pendingWorkOrders,
      group: "การซ่อมบำรุง",
    },
    {
      id: "calendar",
      label: "ปฏิทินซ่อมบำรุง",
      icon: Calendar,
      group: "การซ่อมบำรุง",
    },
    {
      id: "approvals",
      label: "อนุมัติผู้ใช้งาน",
      icon: Clock,
      badge: pendingUsers.length,
      group: "ผู้ใช้งานและบุคลากร",
    },
    {
      id: "team",
      label: "เจ้าหน้าที่ & ช่าง",
      icon: Users,
      group: "ผู้ใช้งานและบุคลากร",
    },
    {
      id: "assets",
      label: "ระบบสินทรัพย์",
      icon: Building2,
      group: "ระบบทรัพย์สิน",
    },
    {
      id: "qr_codes",
      label: "จัดการ QR Code",
      icon: QrCode,
      group: "ระบบทรัพย์สิน",
    },
    {
      id: "master_data",
      label: "จัดการยี่ห้อ/รุ่นแอร์",
      icon: Database,
      group: "ระบบทรัพย์สิน",
      href: "/admin/master-data",
    },
    {
      id: "profile",
      label: "จัดการโปรไฟล์",
      icon: User,
      group: "บัญชีและการตั้งค่า",
    },
    {
      id: "settings",
      label: "ตั้งค่าระบบ",
      icon: Settings,
      group: "บัญชีและการตั้งค่า",
    },
  ];

  return (
    <DashboardLayout
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
        universityName,
      }}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      navItems={adminNavItems}
      searchValue={globalSearch}
      onSearchChange={["overview", "approvals", "calendar", "profile"].includes(activeTab) ? undefined : setGlobalSearch}
      searchPlaceholder={
        activeTab === "team" ? "ค้นหาชื่อ หรืออีเมล..." :
        activeTab === "assets" ? "ค้นหาชื่ออาคาร, เลขห้อง..." :
        activeTab === "qr_codes" ? "ค้นหารหัสแอร์, ยี่ห้อ, สถานที่..." :
        "ค้นหารหัสแอร์, สถานที่, หรือแบรนด์..."
      }
      onCreateAction={() => {
        setSelectedAcForWorkOrder(null);
        setShowCreateModal(true);
      }}
      createActionLabel="+ สร้างใบงานซ่อมบำรุง"
    >
      {/* Database Connection Alert */}
      {dbError && (
        <Alert className="border-warning/40 bg-warning/10 text-warning-foreground">
          <AnimatedIcon icon={AlertTriangle} size={16} animation="wiggle" className="text-warning" />
          <AlertTitle className="font-bold text-warning-foreground">การแจ้งเตือนการเชื่อมต่อฐานข้อมูล</AlertTitle>
          <AlertDescription className="text-warning-foreground/90 font-normal">{dbError}</AlertDescription>
        </Alert>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <Alert
          className={toastMessage.type === "success"
            ? "border-success/30 bg-success/10 text-success-foreground"
            : "border-red-200 bg-red-50 text-destructive"
          }
        >
          {toastMessage.type === "success" ? (
            <AnimatedIcon icon={CheckCircle2} size={16} animation="bounce" className="text-success" />
          ) : (
            <AnimatedIcon icon={AlertTriangle} size={16} animation="wiggle" className="text-destructive" />
          )}
          <AlertDescription
            className={toastMessage.type === "success"
              ? "text-success-foreground font-semibold"
              : "text-destructive font-semibold"
            }
          >
            {toastMessage.text}
          </AlertDescription>
          <AlertAction>
            <button
              onClick={() => setToastMessage(null)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </AlertAction>
        </Alert>
      )}

      {/* Overview Analytics Dashboard */}
      {activeTab === "overview" && (
        <OverviewPanel
          metrics={metrics}
          weeklyActivity={weeklyActivity}
          urgentUnits={urgentUnits}
          buildings={buildings}
          workOrders={workOrders}
          onViewDetails={(acCode) => {
            setActiveTab("assets");
            setGlobalSearch(acCode);
          }}
          onCreateWorkOrder={handleOpenCalendarWorkOrder}
          onAssignWorkOrder={(workOrderId) => {
            setSelectedOrderToAssign(workOrderId);
            setShowAssignModal(true);
          }}
        />
      )}

      {/* Work Order Board */}
      {activeTab === "kanban" && (
        <WorkOrderBoard
          workOrders={workOrders}
          globalSearch={globalSearch}
          onOpenDetails={setSelectedWorkOrderDetails}
          onAssign={(workOrderId) => {
            setSelectedOrderToAssign(workOrderId);
            setShowAssignModal(true);
          }}
        />
      )}

      {/* User Approvals Tab */}
      {activeTab === "approvals" && (
        <UserApprovalsPanel
          pendingUsers={pendingUsers}
          globalSearch={globalSearch}
          universityName={universityName}
          isPending={isPending}
          onUserStatus={handleUserStatus}
        />
      )}

      {/* Staff & Technicians Tab */}
      {activeTab === "team" && (
        <TeamPanel
          allUsers={allUsers}
          globalSearch={globalSearch}
          isPending={isPending}
          onUserStatus={handleUserStatus}
        />
      )}

      {/* Asset Hierarchy View */}
      {activeTab === "assets" && (
        <AssetManager buildings={buildings} brands={brands} globalSearch={globalSearch} />
      )}

      {/* Maintenance Calendar View */}
      {activeTab === "calendar" && (
        <MaintenanceCalendar onCreateWorkOrder={handleOpenCalendarWorkOrder} />
      )}

      {/* Profile View */}
      {activeTab === "profile" && (
        <ProfilePanel profile={profile} universityName={universityName} />
      )}

      {/* QR Code Manager */}
      {activeTab === "qr_codes" && (
        <QrCodeManager buildings={buildings} globalSearch={globalSearch} />
      )}

      {/* Modal: Create Work Order */}
      <CreateWorkOrderModal
        open={showCreateModal}
        defaultAcId={selectedAcForWorkOrder}
        buildings={buildings}
        activeTechnicians={activeTechnicians}
        isPending={isPending}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateOrderSubmit}
      />

      {/* Modal: Assign Work Order */}
      <AssignWorkOrderModal
        open={showAssignModal}
        activeTechnicians={activeTechnicians}
        isPending={isPending}
        onClose={() => setShowAssignModal(false)}
        onSubmit={handleAssignSubmit}
      />

      {/* Work Order Detail Dialog (Audit Trail) */}
      <WorkOrderDetailDialog
        workOrder={selectedWorkOrderDetails}
        onClose={() => setSelectedWorkOrderDetails(null)}
      />
    </DashboardLayout>
  );
}

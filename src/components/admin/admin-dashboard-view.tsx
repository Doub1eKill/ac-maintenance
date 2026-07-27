"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { createWorkOrderAction, updateUserStatusByOrgAdminAction, assignWorkOrderAction } from "@/app/admin/actions";
import {
  Building2,
  Snowflake,
  AlertTriangle,
  ClipboardList,
  Wrench,
  CheckCircle2,
  Clock,
  Plus,
  ChevronDown,
  ChevronUp,
  X,
  DoorClosed,
  Search,
  MoreVertical,
  Calendar,
  MessageSquare,
  TrendingUp,
  UserCheck,
  UserX,
  Users,
  QrCode,
  User,
  Settings,
  Activity,
} from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DashboardLayout, NavItem } from "@/components/layout/dashboard-layout";
import { AssetManager } from "@/components/admin/asset-manager";
import { MaintenanceCalendar } from "@/components/admin/maintenance-calendar";
import { QrCodeManager } from "@/components/admin/qr-code-manager";
import { ChartAreaInteractive } from "@/components/admin/chart-area-interactive";
import { UpcomingMaintenanceTable } from "@/components/admin/upcoming-maintenance-table";

interface WorkOrderItem {
  id: string;
  acCode: string;
  brand: string;
  location: string;
  status: string;
  priority: string | null;
  issueDescription: string | null;
  resolutionNotes: string | null;
  images: any | null;
  reportedByName: string | null;
  assignedToName: string | null;
  assignedAt: string | null;
  claimedByName: string | null;
  claimedAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
  airConditionerId: string;
}

interface ACUnit {
  id: string;
  acCode: string;
  brand: string;
  model: string | null;
  btu: number | null;
  status: string;
  qrCode: string;
  maintenanceSchedule: {
    frequencyValue: number;
    frequencyUnit: string;
    nextDueDate: string;
  } | null;
}

interface RoomItem {
  id: string;
  name: string;
  floor: number | null;
  acUnits: ACUnit[];
}

interface BuildingItem {
  id: string;
  name: string;
  abbreviation: string;
  unitsCount: number;
  rooms: RoomItem[];
}

interface PendingUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string | null;
}

interface AdminDashboardViewProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
  dbError?: string | null;
  universityName: string;
  metrics: {
    totalUnits: number;
    brokenOrCleaningUnits: number;
    pendingWorkOrders: number;
    activeTechsCount: number;
    pendingUsersCount?: number;
  };
  weeklyActivity: Array<{ day: string; repairs: number }>;
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
  metrics,
  weeklyActivity = [],
  workOrders,
  buildings,
  allAcUnits,
  pendingUsers = [],
  allUsers = [],
  brands = [],
}: AdminDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isPending, startTransition] = useTransition();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAcForWorkOrder, setSelectedAcForWorkOrder] = useState<string | null>(null);
  const [selectedOrderToAssign, setSelectedOrderToAssign] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [expandedBuilding, setExpandedBuilding] = useState<string | null>(buildings[0]?.id || null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [approvalsPage, setApprovalsPage] = useState(1);
  const [teamPage, setTeamPage] = useState(1);
  const [workOrdersPage, setWorkOrdersPage] = useState(1);
  const [selectedWorkOrderDetails, setSelectedWorkOrderDetails] = useState<WorkOrderItem | null>(null);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setApprovalsPage(1);
    setTeamPage(1);
    setWorkOrdersPage(1);
  }, [globalSearch]);

  const upcomingMaintenanceAcs = useMemo(() => {
    const acs: any[] = [];
    buildings.forEach(b => {
      b.rooms.forEach(r => {
        r.acUnits.forEach(ac => {
          if (ac.maintenanceSchedule?.nextDueDate) {
            acs.push({
              id: ac.id,
              acCode: ac.acCode,
              brand: ac.brand || "ไม่ระบุยี่ห้อ",
              location: `${b.abbreviation} - ${r.name}`,
              nextDueDate: ac.maintenanceSchedule.nextDueDate
            });
          }
        });
      });
    });
    return acs.sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());
  }, [buildings]);

  const pendingOrders = workOrders.filter(
    (wo) => wo.status === "pending" && matchesSearch(wo, globalSearch)
  );

  const claimedOrders = workOrders.filter(
    (wo) => wo.status === "claimed" && matchesSearch(wo, globalSearch)
  );

  const completedOrders = workOrders.filter(
    (wo) => wo.status === "completed" && matchesSearch(wo, globalSearch)
  );

  const filteredWorkOrders = workOrders.filter((wo) => matchesSearch(wo, globalSearch));
  const totalWorkOrdersPages = Math.ceil(filteredWorkOrders.length / ITEMS_PER_PAGE);
  const paginatedWorkOrders = filteredWorkOrders.slice((workOrdersPage - 1) * ITEMS_PER_PAGE, workOrdersPage * ITEMS_PER_PAGE);

  const filteredPendingUsers = pendingUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(globalSearch.toLowerCase())
  );

  const filteredAllUsers = allUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(globalSearch.toLowerCase())
  );

  const totalApprovalsPages = Math.ceil(filteredPendingUsers.length / ITEMS_PER_PAGE);
  const paginatedApprovals = filteredPendingUsers.slice((approvalsPage - 1) * ITEMS_PER_PAGE, approvalsPage * ITEMS_PER_PAGE);

  const totalTeamPages = Math.ceil(filteredAllUsers.length / ITEMS_PER_PAGE);
  const paginatedTeam = filteredAllUsers.slice((teamPage - 1) * ITEMS_PER_PAGE, teamPage * ITEMS_PER_PAGE);

  const activeTechnicians = allUsers.filter(u => u.role === "technician" && u.status === "active");

  function matchesSearch(wo: WorkOrderItem, search: string) {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      wo.acCode.toLowerCase().includes(s) ||
      wo.brand.toLowerCase().includes(s) ||
      wo.location.toLowerCase().includes(s) ||
      (wo.claimedByName && wo.claimedByName.toLowerCase().includes(s))
    );
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

  const filteredBuildings = buildings.map((b) => {
    if (!globalSearch.trim()) return b;
    const s = globalSearch.toLowerCase();
    const matchesBuilding = b.name.toLowerCase().includes(s) || b.abbreviation.toLowerCase().includes(s);

    const matchingRooms = b.rooms.filter((r) => {
      const matchesRoom = r.name.toLowerCase().includes(s);
      const matchesAC = r.acUnits.some(
        (ac) => ac.acCode.toLowerCase().includes(s) || ac.brand.toLowerCase().includes(s)
      );
      return matchesRoom || matchesAC;
    });

    if (matchesBuilding || matchingRooms.length > 0) {
      return {
        ...b,
        rooms: matchingRooms.length > 0 ? matchingRooms : b.rooms,
      };
    }
    return null;
  }).filter(Boolean) as BuildingItem[];

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
      onSearchChange={["overview", "approvals", "calendar"].includes(activeTab) ? undefined : setGlobalSearch}
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
        <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-xs font-semibold text-warning-foreground flex items-start gap-3 shadow-2xs">
          <AnimatedIcon icon={AlertTriangle} size={18} animation="wiggle" className="text-warning shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-warning-foreground">การแจ้งเตือนการเชื่อมต่อฐานข้อมูล</div>
            <p className="text-warning-foreground font-normal leading-relaxed mt-0.5">{dbError}</p>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`rounded-2xl border p-4 text-xs font-semibold flex items-center justify-between shadow-2xs ${
            toastMessage.type === "success"
              ? "border-success/30 bg-success/10 text-success-foreground"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toastMessage.type === "success" ? (
              <AnimatedIcon icon={CheckCircle2} size={18} animation="bounce" className="text-success" />
            ) : (
              <AnimatedIcon icon={AlertTriangle} size={18} animation="wiggle" className="text-red-600" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}


      {/* Overview Analytics Dashboard */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="w-full">
            <ChartAreaInteractive 
              title="ภาพรวมสถิติการซ่อมบำรุง (Maintenance Analytics)" 
              description="สถิติการแจ้งซ่อมและงานที่เสร็จสิ้น เปรียบเทียบย้อนหลัง" 
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 w-full">
              <UpcomingMaintenanceTable 
                data={upcomingMaintenanceAcs} 
                onViewDetails={(acCode) => {
                  setActiveTab("assets");
                  setGlobalSearch(acCode);
                }}
                onCreateWorkOrder={handleOpenCalendarWorkOrder}
              />
            </div>

            <div className="biz-card p-6 h-fit w-full">
              <h3 className="text-base font-bold mb-6 flex items-center gap-2 text-foreground">
                <Activity className="h-5 w-5 text-primary" />
                สรุปสถานะระบบ
              </h3>
              
              <div className="grid grid-cols-2 gap-y-8 gap-x-4">
                {/* Item 1 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Snowflake className="h-4 w-4 text-primary" />
                    </div>
                    ทั้งหมด
                  </div>
                  <div className="text-3xl font-bold">{metrics.totalUnits} <span className="text-sm font-medium text-muted-foreground">เครื่อง</span></div>
                </div>
                
                {/* Item 2 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                    <div className="p-2 bg-red-500/10 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    </div>
                    เสีย/รอซ่อม
                  </div>
                  <div className="text-3xl font-bold">{metrics.brokenOrCleaningUnits} <span className="text-sm font-medium text-muted-foreground">เครื่อง</span></div>
                </div>

                {/* Item 3 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <ClipboardList className="h-4 w-4 text-warning" />
                    </div>
                    รอดำเนินการ
                  </div>
                  <div className="text-3xl font-bold">{metrics.pendingWorkOrders} <span className="text-sm font-medium text-muted-foreground">ใบงาน</span></div>
                </div>

                {/* Item 4 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <Wrench className="h-4 w-4 text-success" />
                    </div>
                    ช่างดูแล
                  </div>
                  <div className="text-3xl font-bold">{metrics.activeTechsCount} <span className="text-sm font-medium text-muted-foreground">คน</span></div>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-border">
                <div className="flex justify-between text-xs mb-2">
                  <span className="font-bold text-muted-foreground">สถานะความพร้อมของเครื่อง</span>
                  <span className="font-bold text-success">
                    {metrics.totalUnits > 0 ? Math.round(((metrics.totalUnits - metrics.brokenOrCleaningUnits) / metrics.totalUnits) * 100) : 100}%
                  </span>
                </div>
                <div className="pt-2 pb-1">
                  <Slider
                    defaultValue={[metrics.totalUnits > 0 ? Math.round(((metrics.totalUnits - metrics.brokenOrCleaningUnits) / metrics.totalUnits) * 100) : 100]}
                    max={100}
                    step={1}
                    disabled
                    className="[&_[data-slot=slider-track]]:bg-red-500 [&_[data-slot=slider-range]]:bg-success [&_[data-slot=slider-thumb]]:hidden opacity-100"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formal Data Table for Work Orders */}
      {activeTab === "kanban" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" /> ระบบจัดการงานซ่อมบำรุง
            </h2>
            <div className="text-sm text-muted-foreground font-medium">
              พบใบงานทั้งหมด <span className="font-bold text-foreground">{filteredWorkOrders.length}</span> รายการ
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap">รหัสแอร์</th>
                    <th className="px-6 py-4 whitespace-nowrap">สถานที่ตั้ง / ยี่ห้อ</th>
                    <th className="px-6 py-4 whitespace-nowrap">วันที่แจ้ง</th>
                    <th className="px-6 py-4 whitespace-nowrap">ผู้รับผิดชอบ</th>
                    <th className="px-6 py-4 whitespace-nowrap text-center">สถานะ</th>
                    <th className="px-6 py-4 whitespace-nowrap text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedWorkOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                        ไม่พบข้อมูลใบงาน
                      </td>
                    </tr>
                  ) : (
                    paginatedWorkOrders.map((wo) => (
                      <tr 
                        key={wo.id} 
                        className="hover:bg-muted transition-colors cursor-pointer"
                        onClick={() => setSelectedWorkOrderDetails(wo)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-foreground">
                          {wo.acCode}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-foreground">{wo.location}</div>
                          <div className="text-xs text-muted-foreground">{wo.brand}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                          {wo.createdAt ? new Date(wo.createdAt).toLocaleDateString("th-TH") : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {wo.claimedByName ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                                {wo.claimedByName.charAt(0)}
                              </div>
                              <span className="font-medium text-foreground">{wo.claimedByName}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {wo.status === "pending" && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-warning/20 text-warning-foreground border border-warning/30">
                              รอดำเนินการ
                            </span>
                          )}
                          {wo.status === "claimed" && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/20 text-primary border border-primary/30">
                              กำลังดำเนินการ
                            </span>
                          )}
                          {wo.status === "completed" && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-success/20 text-success-foreground border border-success/30">
                              เสร็จสิ้น
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {wo.status === "pending" ? (
                            <button
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setSelectedOrderToAssign(wo.id); 
                                setShowAssignModal(true); 
                              }}
                              className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-bold text-primary bg-primary/10 border border-primary/30 rounded-lg hover:bg-primary/20 transition-colors"
                            >
                              จ่ายงาน
                            </button>
                          ) : (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setSelectedWorkOrderDetails(wo); }}
                              className="inline-flex items-center justify-center p-1.5 text-muted-foreground hover:text-muted-foreground rounded-lg hover:bg-secondary transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {totalWorkOrdersPages > 1 && (
              <div className="px-6 py-4 border-t border-border bg-muted flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  หน้า {workOrdersPage} จาก {totalWorkOrdersPages}
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setWorkOrdersPage(p => Math.max(1, p - 1))}
                        className={workOrdersPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {[...Array(totalWorkOrdersPages)].map((_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink 
                          onClick={() => setWorkOrdersPage(i + 1)}
                          isActive={workOrdersPage === i + 1}
                          className="cursor-pointer"
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setWorkOrdersPage(p => Math.min(totalWorkOrdersPages, p + 1))}
                        className={workOrdersPage === totalWorkOrdersPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Approvals Tab */}
      {activeTab === "approvals" && (
        <div className="biz-card p-6 space-y-5 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              <span>คำขออนุมัติผู้ใช้งานใหม่สำหรับ {universityName} ({pendingUsers.length})</span>
            </h2>
          </div>

          {filteredPendingUsers.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
              ยังไม่มีคำขอลงทะเบียนผู้ใช้งานสำหรับองค์กรนี้
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-foreground">
                <thead className="border-b border-border bg-muted text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 rounded-l-xl">ชื่อผู้ใช้</th>
                    <th className="py-3 px-4">อีเมล</th>
                    <th className="py-3 px-4">บทบาท</th>
                    <th className="py-3 px-4">วันที่ขอ</th>
                    <th className="py-3 px-4 text-right rounded-r-xl">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedApprovals.map((u) => (
                    <tr key={u.id} className="hover:bg-muted transition-colors">
                      <td className="py-3.5 px-4 font-bold text-foreground">{u.name}</td>
                      <td className="py-3.5 px-4 font-mono">{u.email}</td>
                      <td className="py-3.5 px-4 font-bold text-foreground uppercase">{u.role}</td>
                      <td className="py-3.5 px-4 font-mono">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}</td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleUserStatus(u.id, "active")}
                          disabled={isPending}
                          className="rounded-lg bg-success px-3 py-1.5 font-bold text-white hover:bg-success/90 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          อนุมัติ
                        </button>
                        <button
                          onClick={() => handleUserStatus(u.id, "suspended")}
                          disabled={isPending}
                          className="rounded-lg bg-red-600 px-3 py-1.5 font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          <UserX className="h-3.5 w-3.5" />
                          ปฏิเสธ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalApprovalsPages > 1 && (
                <div className="py-4 border-t border-border">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          href="#" 
                          onClick={(e) => { e.preventDefault(); setApprovalsPage(p => Math.max(1, p - 1)); }} 
                          className={approvalsPage === 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                      <PaginationItem>
                        <span className="text-xs font-medium text-muted-foreground px-4">
                          หน้า {approvalsPage} จาก {totalApprovalsPages}
                        </span>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext 
                          href="#" 
                          onClick={(e) => { e.preventDefault(); setApprovalsPage(p => Math.min(totalApprovalsPages, p + 1)); }}
                          className={approvalsPage === totalApprovalsPages ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Staff & Technicians Tab */}
      {activeTab === "team" && (
        <div className="biz-card p-6 space-y-5 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-foreground" />
              <span>ทำเนียบเจ้าหน้าที่และช่างซ่อมบำรุง ({allUsers.length})</span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="border-b border-border bg-muted text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">ชื่อผู้ใช้</th>
                  <th className="py-3 px-4">อีเมล</th>
                  <th className="py-3 px-4">บทบาท</th>
                  <th className="py-3 px-4">สถานะ</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedTeam.map((u) => (
                  <tr key={u.id} className="hover:bg-muted transition-colors">
                    <td className="py-3.5 px-4 font-bold text-foreground">{u.name}</td>
                    <td className="py-3.5 px-4 font-mono">{u.email}</td>
                    <td className="py-3.5 px-4 font-bold text-foreground uppercase">{u.role}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                          u.status === "active"
                            ? "bg-success/20 text-success-foreground border border-success/30"
                            : u.status === "pending"
                            ? "bg-warning/20 text-warning-foreground border border-warning/30"
                            : "bg-red-100 text-red-800 border border-red-200"
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {u.status === "active" ? (
                        <button
                          onClick={() => handleUserStatus(u.id, "suspended")}
                          disabled={isPending || u.role === "super_admin"}
                          className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-40"
                        >
                          ระงับสิทธิ์
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUserStatus(u.id, "active")}
                          disabled={isPending || u.role === "super_admin"}
                          className="rounded-lg border border-success/30 bg-success/10 px-2.5 py-1 text-[11px] font-bold text-success-foreground hover:bg-success/20 transition-colors disabled:opacity-40"
                        >
                          เปิดใช้งาน
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalTeamPages > 1 && (
              <div className="py-4 border-t border-border">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        href="#" 
                        onClick={(e) => { e.preventDefault(); setTeamPage(p => Math.max(1, p - 1)); }} 
                        className={teamPage === 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <span className="text-xs font-medium text-muted-foreground px-4">
                        หน้า {teamPage} จาก {totalTeamPages}
                      </span>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext 
                        href="#" 
                        onClick={(e) => { e.preventDefault(); setTeamPage(p => Math.min(totalTeamPages, p + 1)); }}
                        className={teamPage === totalTeamPages ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Asset Hierarchy View */}
      {/* Asset Hierarchy View */}
      {activeTab === "assets" && (
        <AssetManager buildings={buildings} brands={brands} globalSearch={globalSearch} />
      )}

      {/* Maintenance Calendar View */}
      {activeTab === "calendar" && (
        <MaintenanceCalendar onCreateWorkOrder={handleOpenCalendarWorkOrder} />
      )}

      {/* Modal: Create Work Order */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-white p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">สร้างใบงานซ่อมบำรุง</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrderSubmit} className="space-y-4 text-xs">
              <div>
                <label className="mb-1.5 block font-bold text-foreground">เลือกเครื่องปรับอากาศ</label>
                <NativeSelect name="airConditionerId" defaultValue={selectedAcForWorkOrder ?? ""} className="w-full h-auto py-3 px-3.5 rounded-xl border-border bg-muted text-xs text-foreground">
                  <NativeSelectOption value="" disabled>-- เลือกเครื่องปรับอากาศ --</NativeSelectOption>
                  {allAcUnits.map((unit) => (
                    <NativeSelectOption key={unit.id} value={unit.id}>
                      {unit.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>

              <div>
                <label className="mb-1.5 block font-bold text-foreground">มอบหมายช่างเทคนิค (ไม่บังคับ)</label>
                <NativeSelect name="assignToUserId" required defaultValue="" className="w-full h-auto py-3 px-3.5 rounded-xl border-border bg-muted text-xs text-foreground">
                  <NativeSelectOption value="" disabled>-- เลือกช่างเทคนิค --</NativeSelectOption>
                  {activeTechnicians.length === 0 ? (
                    <NativeSelectOption value="none" disabled>ไม่มีช่างเทคนิคที่พร้อมรับงาน</NativeSelectOption>
                  ) : (
                    activeTechnicians.map((tech) => (
                      <NativeSelectOption key={tech.id} value={tech.id}>
                        {tech.name} (ช่างซ่อมบำรุง)
                      </NativeSelectOption>
                    ))
                  )}
                </NativeSelect>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/2 rounded-xl border border-border py-2.5 font-bold text-foreground hover:bg-secondary"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-1/2 rounded-xl bg-foreground py-2.5 font-bold text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {isPending ? "กำลังสร้าง..." : "ยืนยันการสร้างใบงาน"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Manager */}
      {activeTab === "qr_codes" && (
        <QrCodeManager buildings={buildings} globalSearch={globalSearch} />
      )}

      {/* Modal: Assign Work Order */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">มอบหมายงานให้ช่างเทคนิค</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
              <div>
                <label className="mb-1.5 block font-bold text-foreground">เลือกช่างเทคนิคที่ต้องการมอบหมายงาน</label>
                <NativeSelect name="assignToUserId" required defaultValue="" className="w-full h-auto py-3 px-3.5 rounded-xl border-border bg-muted text-xs text-foreground">
                  <NativeSelectOption value="" disabled>-- เลือกช่างเทคนิค --</NativeSelectOption>
                  {activeTechnicians.length === 0 ? (
                    <NativeSelectOption value="none" disabled>ไม่มีช่างเทคนิคที่พร้อมรับงาน</NativeSelectOption>
                  ) : (
                    activeTechnicians.map((tech) => (
                      <NativeSelectOption key={tech.id} value={tech.id}>
                        {tech.name}
                      </NativeSelectOption>
                    ))
                  )}
                </NativeSelect>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="w-1/2 rounded-xl border border-border py-2.5 font-bold text-foreground hover:bg-secondary"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-1/2 rounded-xl bg-foreground py-2.5 font-bold text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {isPending ? "กำลังบันทึก..." : "ยืนยันการมอบหมาย"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Enterprise Detail Dialog (Audit Trail) */}
      <Dialog open={!!selectedWorkOrderDetails} onOpenChange={(open) => { if (!open) setSelectedWorkOrderDetails(null) }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto p-0 border-0 rounded-2xl overflow-hidden">
          {selectedWorkOrderDetails && (
            <div className="flex flex-col h-full bg-muted">
              {/* Header */}
              <div className="bg-white px-6 py-5 border-b border-border sticky top-0 z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                      <ClipboardList className="h-6 w-6 text-primary" />
                      ใบงานซ่อมบำรุง {selectedWorkOrderDetails.acCode}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">
                      รายละเอียดการแจ้งซ่อมและประวัติการทำงาน (Audit Trail)
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedWorkOrderDetails.priority === 'critical' && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                        ด่วนที่สุด (Critical)
                      </span>
                    )}
                    {selectedWorkOrderDetails.priority === 'high' && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
                        ด่วน (High)
                      </span>
                    )}
                    {selectedWorkOrderDetails.status === "pending" && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-warning/20 text-warning-foreground border border-warning/30">
                        รอดำเนินการ
                      </span>
                    )}
                    {selectedWorkOrderDetails.status === "claimed" && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-primary/20 text-primary border border-primary/30">
                        กำลังดำเนินการ
                      </span>
                    )}
                    {selectedWorkOrderDetails.status === "completed" && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-success/20 text-success-foreground border border-success/30">
                        เสร็จสิ้น
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Left Column: Asset & Issue Details */}
                <div className="md:col-span-2 space-y-6">
                  {/* Issue Section */}
                  <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      รายละเอียดปัญหา (Issue Description)
                    </h3>
                    <div className="bg-muted p-4 rounded-lg border border-border text-sm text-foreground leading-relaxed min-h-[80px]">
                      {selectedWorkOrderDetails.issueDescription || "ไม่มีการระบุรายละเอียด"}
                    </div>
                  </div>

                  {/* Resolution Section (If completed) */}
                  {selectedWorkOrderDetails.status === "completed" && (
                    <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        บันทึกการซ่อม (Resolution Notes)
                      </h3>
                      <div className="bg-success/10 p-4 rounded-lg border border-success/20 text-sm text-success-foreground leading-relaxed min-h-[80px]">
                        {selectedWorkOrderDetails.resolutionNotes || "ไม่มีการระบุบันทึกการซ่อม"}
                      </div>
                    </div>
                  )}

                  {/* Media / Images Section */}
                  <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      รูปภาพประกอบ (Media/Evidence)
                    </h3>
                    {selectedWorkOrderDetails.images ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {Array.isArray(selectedWorkOrderDetails.images) 
                          ? selectedWorkOrderDetails.images.map((img: string, idx: number) => (
                              <div key={idx} className="aspect-square rounded-lg border border-border overflow-hidden bg-secondary relative group cursor-pointer">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={img} alt="Work Order Evidence" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                              </div>
                            ))
                          : (
                            <div className="col-span-full py-8 text-center text-sm text-muted-foreground bg-muted rounded-lg border border-dashed border-border">
                              รูปแบบรูปภาพไม่ถูกต้อง
                            </div>
                          )
                        }
                      </div>
                    ) : (
                      <div className="py-8 text-center text-sm text-muted-foreground bg-muted rounded-lg border border-dashed border-border">
                        ไม่มีรูปภาพประกอบ
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Audit Trail */}
                <div className="space-y-6">
                  
                  {/* Asset Info */}
                  <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4 pb-3 border-b border-border">
                      <Snowflake className="h-4 w-4 text-primary" />
                      ข้อมูลเครื่องปรับอากาศ
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">รหัสครุภัณฑ์:</span>
                        <span className="font-mono font-bold text-foreground">{selectedWorkOrderDetails.acCode}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">ยี่ห้อ:</span>
                        <span className="font-medium text-foreground">{selectedWorkOrderDetails.brand}</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-muted-foreground">สถานที่:</span>
                        <span className="font-medium text-foreground text-right max-w-[150px]">{selectedWorkOrderDetails.location}</span>
                      </div>
                    </div>
                  </div>

                  {/* Audit Trail Timeline */}
                  <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-5 pb-3 border-b border-border">
                      <Clock className="h-4 w-4 text-primary" />
                      ประวัติการดำเนินการ (Audit Trail)
                    </h3>
                    
                    <div className="relative pl-6 space-y-6 before:absolute before:inset-y-2 before:left-[11px] before:w-[2px] before:bg-border">
                      
                      {/* Created */}
                      <div className="relative">
                        <div className="absolute -left-[30px] p-1 bg-white rounded-full">
                          <div className="w-2.5 h-2.5 bg-muted-foreground rounded-full ring-4 ring-slate-50" />
                        </div>
                        <div className="text-xs font-bold text-foreground">แจ้งเรื่อง</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {selectedWorkOrderDetails.createdAt ? new Date(selectedWorkOrderDetails.createdAt).toLocaleString("th-TH") : "-"}
                        </div>
                        {selectedWorkOrderDetails.reportedByName && (
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                            <UserCheck className="w-3 h-3 text-muted-foreground" /> {selectedWorkOrderDetails.reportedByName}
                          </div>
                        )}
                      </div>

                      {/* Assigned */}
                      {selectedWorkOrderDetails.assignedToName && (
                        <div className="relative">
                          <div className="absolute -left-[30px] p-1 bg-white rounded-full">
                            <div className="w-2.5 h-2.5 bg-primary rounded-full ring-4 ring-primary/10" />
                          </div>
                          <div className="text-xs font-bold text-foreground">มอบหมายงาน</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {selectedWorkOrderDetails.assignedAt ? new Date(selectedWorkOrderDetails.assignedAt).toLocaleString("th-TH") : "-"}
                          </div>
                          <div className="text-xs text-primary bg-primary/10 px-2 py-1 rounded inline-flex items-center gap-1.5 mt-1.5">
                            <Wrench className="w-3 h-3" /> ให้ช่าง {selectedWorkOrderDetails.assignedToName}
                          </div>
                        </div>
                      )}

                      {/* Claimed/Started */}
                      {selectedWorkOrderDetails.claimedAt && (
                        <div className="relative">
                          <div className="absolute -left-[30px] p-1 bg-white rounded-full">
                            <div className="w-2.5 h-2.5 bg-primary rounded-full ring-4 ring-sky-50" />
                          </div>
                          <div className="text-xs font-bold text-foreground">เริ่มดำเนินการซ่อม</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(selectedWorkOrderDetails.claimedAt).toLocaleString("th-TH")}
                          </div>
                          <div className="text-xs text-primary bg-primary/10 px-2 py-1 rounded inline-flex items-center gap-1.5 mt-1.5">
                            <Wrench className="w-3 h-3" /> ดำเนินการโดย {selectedWorkOrderDetails.claimedByName || selectedWorkOrderDetails.assignedToName}
                          </div>
                        </div>
                      )}

                      {/* Completed */}
                      {selectedWorkOrderDetails.completedAt && (
                        <div className="relative">
                          <div className="absolute -left-[30px] p-1 bg-white rounded-full">
                            <div className="w-2.5 h-2.5 bg-success rounded-full ring-4 ring-success/10" />
                          </div>
                          <div className="text-xs font-bold text-success-foreground">เสร็จสิ้นสมบูรณ์</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(selectedWorkOrderDetails.completedAt).toLocaleString("th-TH")}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

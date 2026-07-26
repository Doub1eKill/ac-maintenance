"use client";

import { useState, useTransition, useEffect } from "react";
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
} from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { DashboardLayout, NavItem } from "@/components/layout/dashboard-layout";
import { AssetManager } from "@/components/admin/asset-manager";
import { MaintenanceCalendar } from "@/components/admin/maintenance-calendar";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";

interface WorkOrderItem {
  id: string;
  acCode: string;
  brand: string;
  location: string;
  status: string;
  claimedByName: string | null;
  claimedAt: string | null;
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
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setApprovalsPage(1);
    setTeamPage(1);
  }, [globalSearch]);

  const pendingOrders = workOrders.filter(
    (wo) => wo.status === "pending" && matchesSearch(wo, globalSearch)
  );

  const claimedOrders = workOrders.filter(
    (wo) => wo.status === "claimed" && matchesSearch(wo, globalSearch)
  );

  const completedOrders = workOrders.filter(
    (wo) => wo.status === "completed" && matchesSearch(wo, globalSearch)
  );

  const filteredPendingUsers = pendingUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(globalSearch.toLowerCase()) ||
      u.role.toLowerCase().includes(globalSearch.toLowerCase())
  );

  const filteredAllUsers = allUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(globalSearch.toLowerCase()) ||
      u.role.toLowerCase().includes(globalSearch.toLowerCase())
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
    },
    {
      id: "kanban",
      label: "กระดานใบงาน",
      icon: ClipboardList,
      badge: metrics.pendingWorkOrders,
    },
    {
      id: "approvals",
      label: "อนุมัติผู้ใช้งาน",
      icon: Clock,
      badge: pendingUsers.length,
    },
    {
      id: "team",
      label: "เจ้าหน้าที่ & ช่าง",
      icon: Users,
    },
    {
      id: "assets",
      label: "ระบบสินทรัพย์",
      icon: Building2,
    },
    {
      id: "calendar",
      label: "ปฏิทินซ่อมบำรุง",
      icon: Calendar,
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
      onSearchChange={setGlobalSearch}
      searchPlaceholder="ค้นหารหัสแอร์, ชื่อผู้ใช้, อาคาร, ช่าง..."
      onCreateAction={() => {
        setSelectedAcForWorkOrder(null);
        setShowCreateModal(true);
      }}
      createActionLabel="+ สร้างใบงานซ่อมบำรุง"
    >
      {/* Database Connection Alert */}
      {dbError && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs font-semibold text-amber-900 flex items-start gap-3 shadow-2xs">
          <AnimatedIcon icon={AlertTriangle} size={18} animation="wiggle" className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-amber-950">การแจ้งเตือนการเชื่อมต่อฐานข้อมูล</div>
            <p className="text-amber-800 font-normal leading-relaxed mt-0.5">{dbError}</p>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`rounded-2xl border p-4 text-xs font-semibold flex items-center justify-between shadow-2xs ${
            toastMessage.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toastMessage.type === "success" ? (
              <AnimatedIcon icon={CheckCircle2} size={18} animation="bounce" className="text-emerald-600" />
            ) : (
              <AnimatedIcon icon={AlertTriangle} size={18} animation="wiggle" className="text-red-600" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}


      {/* Overview Analytics Dashboard */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="biz-card p-5 space-y-3">
              <div className="text-slate-500 font-bold text-xs flex items-center justify-between">
                รวมเครื่องปรับอากาศ
                <Snowflake className="h-4 w-4 text-sky-500" />
              </div>
              <div className="text-3xl font-bold text-slate-950">{metrics.totalUnits} <span className="text-sm font-medium text-slate-500">เครื่อง</span></div>
            </div>
            <div className="biz-card p-5 space-y-3">
              <div className="text-slate-500 font-bold text-xs flex items-center justify-between">
                แอร์ที่เสีย / รอซ่อม
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
              <div className="text-3xl font-bold text-slate-950">{metrics.brokenOrCleaningUnits} <span className="text-sm font-medium text-slate-500">เครื่อง</span></div>
            </div>
            <div className="biz-card p-5 space-y-3">
              <div className="text-slate-500 font-bold text-xs flex items-center justify-between">
                ใบงานรอดำเนินการ
                <ClipboardList className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-3xl font-bold text-slate-950">{metrics.pendingWorkOrders} <span className="text-sm font-medium text-slate-500">ใบงาน</span></div>
            </div>
            <div className="biz-card p-5 space-y-3">
              <div className="text-slate-500 font-bold text-xs flex items-center justify-between">
                ช่างผู้รับผิดชอบ
                <Wrench className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-3xl font-bold text-slate-950">{metrics.activeTechsCount} <span className="text-sm font-medium text-slate-500">คน</span></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 biz-card p-6 space-y-6">
              <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-sky-600" /> สถิติการซ่อมบำรุงในรอบสัปดาห์
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="repairs" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={40} name="จำนวนงานซ่อม" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="biz-card p-6 space-y-6">
              <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" /> รอซ่อมด่วน (Pending)
              </h3>
              <div className="space-y-3">
                {pendingOrders.slice(0, 4).map(wo => (
                  <div key={wo.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-sm text-slate-900">{wo.acCode}</span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">รอดำเนินการ</span>
                    </div>
                    <span className="text-xs text-slate-500">{wo.location}</span>
                  </div>
                ))}
                {pendingOrders.length === 0 && (
                  <div className="text-center text-slate-400 text-xs py-4">ไม่มีใบงานด่วน</div>
                )}
                {pendingOrders.length > 4 && (
                  <button onClick={() => setActiveTab('kanban')} className="w-full text-center text-xs font-bold text-sky-600 py-2 hover:bg-sky-50 rounded-lg transition-colors">
                    ดูทั้งหมด ({pendingOrders.length})
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Kanban Grid Layout (BizLink Style Columns) */}
      {activeTab === "kanban" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-950">กระดานสถานะใบงานซ่อมบำรุง</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1: Pending Orders */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-bold text-slate-950">รอช่างรับงาน</span>
                <span className="rounded-lg bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 text-xs font-bold font-mono">
                  {pendingOrders.length}
                </span>
              </div>

              <div className="space-y-3">
                {pendingOrders.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                    ไม่มีงานค้าง
                  </div>
                ) : (
                  pendingOrders.map((wo) => (
                    <div key={wo.id} className="biz-card p-4 space-y-3 hover:border-slate-400 transition-all">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sm text-slate-950">{wo.acCode}</span>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => { setSelectedOrderToAssign(wo.id); setShowAssignModal(true); }}
                            className="text-[10px] font-bold text-sky-600 bg-sky-50 border border-sky-100 px-2 py-1 rounded hover:bg-sky-100 transition-colors"
                          >
                            จ่ายงาน
                          </button>
                          <MoreVertical className="h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                      <div className="text-xs font-medium text-slate-600 leading-relaxed">
                        {wo.location} ({wo.brand})
                      </div>
                      <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                          <Clock className="h-3 w-3" /> รอช่าง
                        </span>
                        <span className="font-mono">{wo.createdAt ? new Date(wo.createdAt).toLocaleDateString() : ""}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 2: In-Progress / Claimed (Contains Dark Highlight Card) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-bold text-slate-950">กำลังดำเนินการ</span>
                <span className="rounded-lg bg-sky-100 text-sky-800 border border-sky-200 px-2 py-0.5 text-xs font-bold font-mono">
                  {claimedOrders.length}
                </span>
              </div>

              <div className="space-y-3">
                {claimedOrders.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                    ไม่มีงานที่กำลังดำเนินการ
                  </div>
                ) : (
                  claimedOrders.map((wo, idx) => (
                    <div
                      key={wo.id}
                      className={
                        idx === 0
                          ? "biz-card-dark p-4 space-y-3 shadow-md"
                          : "biz-card p-4 space-y-3 hover:border-slate-400 transition-all"
                      }
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-mono font-bold text-sm ${idx === 0 ? "text-white" : "text-slate-950"}`}>
                          {wo.acCode}
                        </span>
                        <MoreVertical className={`h-4 w-4 ${idx === 0 ? "text-slate-400" : "text-slate-400"}`} />
                      </div>
                      <div className={`text-xs font-medium leading-relaxed ${idx === 0 ? "text-slate-300" : "text-slate-600"}`}>
                        {wo.location} ({wo.brand})
                      </div>
                      <div
                        className={`pt-2 flex items-center justify-between text-[11px] border-t ${
                          idx === 0 ? "text-slate-300 border-slate-800" : "text-slate-400 border-slate-100"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1 font-bold">
                          <Wrench className="h-3 w-3 text-sky-400" /> {wo.claimedByName || "มอบหมายช่างแล้ว"}
                        </span>
                        <span className="font-mono">{wo.claimedAt ? new Date(wo.claimedAt).toLocaleTimeString() : ""}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 3: Completed Orders */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-bold text-slate-950">เสร็จสมบูรณ์</span>
                <span className="rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-xs font-bold font-mono">
                  {completedOrders.length}
                </span>
              </div>

              <div className="space-y-3">
                {completedOrders.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                    ไม่มีงานที่เสร็จสิ้น
                  </div>
                ) : (
                  completedOrders.map((wo) => (
                    <div key={wo.id} className="biz-card p-4 space-y-3 hover:border-slate-400 transition-all opacity-90">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sm text-slate-950">{wo.acCode}</span>
                        <MoreVertical className="h-4 w-4 text-slate-400" />
                      </div>
                      <div className="text-xs font-medium text-slate-600 leading-relaxed">
                        {wo.location}
                      </div>
                      <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> เสร็จเรียบร้อย
                        </span>
                        <span className="font-mono">{wo.claimedByName || "-"}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Approvals Tab */}
      {activeTab === "approvals" && (
        <div className="biz-card p-6 space-y-5 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-950 flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <span>คำขออนุมัติผู้ใช้งานใหม่สำหรับ {universityName} ({pendingUsers.length})</span>
            </h2>
          </div>

          {filteredPendingUsers.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-2xl">
              ยังไม่มีคำขอลงทะเบียนผู้ใช้งานสำหรับองค์กรนี้
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
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
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-950">{u.name}</td>
                      <td className="py-3.5 px-4 font-mono">{u.email}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800 uppercase">{u.role}</td>
                      <td className="py-3.5 px-4 font-mono">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}</td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleUserStatus(u.id, "active")}
                          disabled={isPending}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
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
                <div className="py-4 border-t border-slate-100">
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
                        <span className="text-xs font-medium text-slate-500 px-4">
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
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-950 flex items-center gap-2">
              <Users className="h-5 w-5 text-slate-700" />
              <span>ทำเนียบเจ้าหน้าที่และช่างซ่อมบำรุง ({allUsers.length})</span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
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
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-950">{u.name}</td>
                    <td className="py-3.5 px-4 font-mono">{u.email}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800 uppercase">{u.role}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                          u.status === "active"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : u.status === "pending"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
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
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-40"
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
              <div className="py-4 border-t border-slate-100">
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
                      <span className="text-xs font-medium text-slate-500 px-4">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-950">สร้างใบงานซ่อมบำรุง</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-950">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrderSubmit} className="space-y-4 text-xs">
              <div>
                <label className="mb-1.5 block font-bold text-slate-700">เลือกเครื่องปรับอากาศ</label>
                <Select name="airConditionerId" required defaultValue={selectedAcForWorkOrder ?? undefined}>
                  <SelectTrigger className="w-full rounded-xl border-slate-200 bg-slate-50 px-3.5 py-5 text-xs text-slate-900 focus:ring-slate-400">
                    <SelectValue placeholder="-- เลือกเครื่องปรับอากาศ --" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-lg animate-in fade-in zoom-in-95">
                    {allAcUnits.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id} className="text-xs rounded-lg focus:bg-slate-50 cursor-pointer">
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block font-bold text-slate-700">มอบหมายช่างเทคนิค (ไม่บังคับ)</label>
                <Select name="assignToUserId">
                  <SelectTrigger className="w-full rounded-xl border-slate-200 bg-slate-50 px-3.5 py-5 text-xs text-slate-900 focus:ring-slate-400">
                    <SelectValue placeholder="-- เลือกลงคิวงาน หรือเว้นว่างให้ช่างกดรับเอง --" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-lg animate-in fade-in zoom-in-95">
                    {activeTechnicians.length === 0 ? (
                      <SelectItem value="none" disabled className="text-xs text-slate-500">ไม่มีช่างเทคนิคที่พร้อมรับงาน</SelectItem>
                    ) : (
                      activeTechnicians.map((tech) => (
                        <SelectItem key={tech.id} value={tech.id} className="text-xs rounded-lg focus:bg-slate-50 cursor-pointer">
                          {tech.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/2 rounded-xl border border-slate-200 py-2.5 font-bold text-slate-700 hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-1/2 rounded-xl bg-slate-950 py-2.5 font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {isPending ? "กำลังสร้าง..." : "ยืนยันการสร้างใบงาน"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Work Order */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-950">มอบหมายงานให้ช่างเทคนิค</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-950">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
              <div>
                <label className="mb-1.5 block font-bold text-slate-700">เลือกช่างเทคนิคที่ต้องการมอบหมายงาน</label>
                <Select name="assignToUserId" required>
                  <SelectTrigger className="w-full rounded-xl border-slate-200 bg-slate-50 px-3.5 py-5 text-xs text-slate-900 focus:ring-slate-400">
                    <SelectValue placeholder="-- เลือกช่างเทคนิค --" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-lg animate-in fade-in zoom-in-95">
                    {activeTechnicians.length === 0 ? (
                      <SelectItem value="none" disabled className="text-xs text-slate-500">ไม่มีช่างเทคนิคที่พร้อมรับงาน</SelectItem>
                    ) : (
                      activeTechnicians.map((tech) => (
                        <SelectItem key={tech.id} value={tech.id} className="text-xs rounded-lg focus:bg-slate-50 cursor-pointer">
                          {tech.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="w-1/2 rounded-xl border border-slate-200 py-2.5 font-bold text-slate-700 hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-1/2 rounded-xl bg-slate-950 py-2.5 font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {isPending ? "กำลังบันทึก..." : "ยืนยันการมอบหมาย"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

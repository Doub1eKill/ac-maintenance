"use client";

import { useState, useTransition } from "react";
import { createWorkOrderAction, updateUserStatusByOrgAdminAction } from "@/app/admin/actions";
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
import { DashboardLayout, NavItem } from "@/components/layout/dashboard-layout";
import { AssetManager } from "@/components/admin/asset-manager";

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
  const [globalSearch, setGlobalSearch] = useState("");
  const [expandedBuilding, setExpandedBuilding] = useState<string | null>(buildings[0]?.id || null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  const adminNavItems: NavItem[] = [
    {
      id: "overview",
      label: "Dashboard",
      icon: Snowflake,
    },
    {
      id: "kanban",
      label: "Work Order Kanban",
      icon: ClipboardList,
      badge: metrics.pendingWorkOrders,
    },
    {
      id: "approvals",
      label: "User Approvals",
      icon: Clock,
      badge: pendingUsers.length,
    },
    {
      id: "team",
      label: "Staff & Techs",
      icon: Users,
    },
    {
      id: "assets",
      label: "Asset Tree",
      icon: Building2,
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
      searchPlaceholder="Search AC code, user name, building, technician..."
      onCreateAction={() => setShowCreateModal(true)}
      createActionLabel="+ Create Work Order"
    >
      {/* Database Connection Alert */}
      {dbError && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs font-semibold text-amber-900 flex items-start gap-3 shadow-2xs">
          <AnimatedIcon icon={AlertTriangle} size={18} animation="wiggle" className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-amber-950">Database Connection Notice</div>
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

      {/* BizLink Top Analytic Banner (Bar Chart & Gauge Stats Widget) */}
      <div className="biz-banner p-6 sm:p-8 flex flex-col lg:flex-row items-center justify-between gap-6 shadow-2xs">
        {/* Left: Bar Chart Widget */}
        <div className="space-y-3 w-full lg:w-auto">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Weekly Repair Activity
          </div>
          <div className="flex items-end gap-3 h-24 pt-2">
            <div className="flex flex-col items-center gap-1">
              <div className="w-6 bg-slate-900 rounded-t-md h-16" />
              <span className="text-[10px] font-bold text-slate-400">Mon</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-6 bg-slate-400 rounded-t-md h-10" />
              <span className="text-[10px] font-bold text-slate-400">Tue</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-6 bg-slate-900 rounded-t-md h-24" />
              <span className="text-[10px] font-bold text-slate-400">Wed</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-6 bg-slate-300 rounded-t-md h-12" />
              <span className="text-[10px] font-bold text-slate-400">Thu</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-6 bg-slate-900 rounded-t-md h-20" />
              <span className="text-[10px] font-bold text-slate-400">Fri</span>
            </div>
          </div>
        </div>

        {/* Middle: Gauge Progress Indicator */}
        <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="relative h-16 w-16 flex items-center justify-center rounded-full border-4 border-slate-950 border-t-slate-200">
            <span className="text-base font-black text-slate-950">
              {metrics.totalUnits > 0
                ? `${Math.round(((metrics.totalUnits - metrics.brokenOrCleaningUnits) / metrics.totalUnits) * 100)}%`
                : "100%"}
            </span>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-950">Fleet Health Rate</div>
            <div className="text-[11px] text-slate-500">Normal units running ok</div>
          </div>
        </div>

        {/* Right: Big Numeric Metrics */}
        <div className="flex items-center gap-8 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 border-slate-200 pt-4 lg:pt-0">
          <div>
            <div className="text-3xl font-black text-slate-950">{metrics.totalUnits}</div>
            <div className="text-xs font-semibold text-slate-500">AC Units Installed</div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-950">{metrics.pendingWorkOrders}</div>
            <div className="text-xs font-semibold text-amber-600 font-bold">Pending Jobs</div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-950">{pendingUsers.length}</div>
            <div className="text-xs font-semibold text-indigo-600 font-bold">Pending Users</div>
          </div>
        </div>
      </div>

      {/* Main Kanban Grid Layout (BizLink Style Columns) */}
      {(activeTab === "overview" || activeTab === "kanban") && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-950">Work Order Kanban Columns</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1: Pending Orders */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-bold text-slate-950">Pending Claims</span>
                <span className="rounded-lg bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 text-xs font-bold font-mono">
                  {pendingOrders.length}
                </span>
              </div>

              <div className="space-y-3">
                {pendingOrders.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                    No pending orders
                  </div>
                ) : (
                  pendingOrders.map((wo) => (
                    <div key={wo.id} className="biz-card p-4 space-y-3 hover:border-slate-400 transition-all">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sm text-slate-950">{wo.acCode}</span>
                        <MoreVertical className="h-4 w-4 text-slate-400" />
                      </div>
                      <div className="text-xs font-medium text-slate-600 leading-relaxed">
                        {wo.location} ({wo.brand})
                      </div>
                      <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                          <Clock className="h-3 w-3" /> Waiting Tech
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
                <span className="text-sm font-bold text-slate-950">In Progress</span>
                <span className="rounded-lg bg-sky-100 text-sky-800 border border-sky-200 px-2 py-0.5 text-xs font-bold font-mono">
                  {claimedOrders.length}
                </span>
              </div>

              <div className="space-y-3">
                {claimedOrders.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                    No claimed active orders
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
                          <Wrench className="h-3 w-3 text-sky-400" /> {wo.claimedByName || "Tech Assigned"}
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
                <span className="text-sm font-bold text-slate-950">Completed</span>
                <span className="rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-xs font-bold font-mono">
                  {completedOrders.length}
                </span>
              </div>

              <div className="space-y-3">
                {completedOrders.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                    No completed orders
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
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Finished
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
              <span>Pending User Approvals for {universityName} ({pendingUsers.length})</span>
            </h2>
          </div>

          {filteredPendingUsers.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-2xl">
              No pending user registration requests for this university at this time.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 rounded-l-xl">User Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Requested Date</th>
                    <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPendingUsers.map((u) => (
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
                          Approve
                        </button>
                        <button
                          onClick={() => handleUserStatus(u.id, "suspended")}
                          disabled={isPending}
                          className="rounded-lg bg-red-600 px-3 py-1.5 font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          <UserX className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
              <span>Campus Staff & Technician Directory ({allUsers.length})</span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">User Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAllUsers.map((u) => (
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
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUserStatus(u.id, "active")}
                          disabled={isPending || u.role === "super_admin"}
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-40"
                        >
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Asset Hierarchy View */}
      {activeTab === "assets" && (
        <AssetManager buildings={buildings} brands={brands} globalSearch={globalSearch} />
      )}

      {/* Modal: Create Work Order */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-950">Create Work Order</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-950">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrderSubmit} className="space-y-4 text-xs">
              <div>
                <label className="mb-1.5 block font-bold text-slate-700">Select Air Conditioner</label>
                <select
                  name="airConditionerId"
                  required
                  defaultValue=""
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 focus:border-slate-950 focus:outline-none"
                >
                  <option value="" disabled>-- Select AC Unit --</option>
                  {allAcUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/2 rounded-xl border border-slate-200 py-2.5 font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-1/2 rounded-xl bg-slate-950 py-2.5 font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {isPending ? "Creating..." : "Confirm Work Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

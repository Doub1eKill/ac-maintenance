"use client";

import { useState, useTransition } from "react";
import { updateUserStatusAction, createUniversityAction } from "@/app/super-admin/actions";
import {
  ShieldCheck,
  Building2,
  Clock,
  Wrench,
  ClipboardList,
  CheckCircle2,
  Plus,
  AlertTriangle,
  X,
  UserCheck,
  UserX,
  Search,
  MoreVertical,
  Calendar,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { DashboardLayout, NavItem } from "@/components/layout/dashboard-layout";

interface PendingUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string | null;
  universityName: string;
  universityAbbr: string;
}

interface UniversityItem {
  id: string;
  name: string;
  abbreviation: string;
  address: string | null;
  phone: string | null;
  buildingsCount: number;
  usersCount: number;
  workOrdersCount: number;
  createdAt: string | null;
}

interface SuperAdminViewProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
  dbError?: string | null;
  metrics: {
    totalUniversities: number;
    pendingUsersCount: number;
    totalTechsCount: number;
    totalWorkOrdersCount: number;
  };
  pendingUsers: PendingUser[];
  universities: UniversityItem[];
}

export function SuperAdminView({
  user,
  dbError,
  metrics,
  pendingUsers,
  universities,
}: SuperAdminViewProps) {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isPending, startTransition] = useTransition();
  const [showAddUniModal, setShowAddUniModal] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const filteredPendingUsers = pendingUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(globalSearch.toLowerCase()) ||
      u.universityName.toLowerCase().includes(globalSearch.toLowerCase())
  );

  const filteredUniversities = universities.filter(
    (u) =>
      u.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
      u.abbreviation.toLowerCase().includes(globalSearch.toLowerCase())
  );

  function handleUserStatus(userId: string, newStatus: "active" | "suspended") {
    setActionMessage(null);
    startTransition(async () => {
      const res = await updateUserStatusAction(userId, newStatus);
      if (res.error) {
        setActionMessage({ type: "error", text: res.error });
      } else {
        setActionMessage({
          type: "success",
          text: newStatus === "active" ? "อนุมัติสิทธิ์เข้าใช้งานสำเร็จ" : "ระงับสิทธิ์เข้าใช้งานสำเร็จ",
        });
      }
    });
  }

  async function handleCreateUniSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setActionMessage(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createUniversityAction(formData);
      if (res.error) {
        setActionMessage({ type: "error", text: res.error });
      } else {
        setActionMessage({ type: "success", text: "เพิ่มมหาวิทยาลัยใหม่ลงระบบเรียบร้อยแล้ว" });
        setShowAddUniModal(false);
      }
    });
  }

  const superAdminNavItems: NavItem[] = [
    {
      id: "overview",
      label: "Dashboard",
      icon: ShieldCheck,
    },
    {
      id: "approvals",
      label: "User Approvals",
      icon: Clock,
      badge: pendingUsers.length,
    },
    {
      id: "universities",
      label: "Universities",
      icon: Building2,
    },
  ];

  return (
    <DashboardLayout
      user={user}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      navItems={superAdminNavItems}
      searchValue={globalSearch}
      onSearchChange={setGlobalSearch}
      searchPlaceholder="Search university, user, email..."
      onCreateAction={() => setShowAddUniModal(true)}
      createActionLabel="+ Add University"
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
      {actionMessage && (
        <div
          className={`rounded-2xl border p-4 text-xs font-semibold flex items-center justify-between shadow-2xs ${
            actionMessage.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionMessage.type === "success" ? (
              <AnimatedIcon icon={CheckCircle2} size={18} animation="bounce" className="text-emerald-600" />
            ) : (
              <AnimatedIcon icon={AlertTriangle} size={18} animation="wiggle" className="text-red-600" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* BizLink Top Analytic Banner (Bar Chart & Gauge Stats Widget) */}
      <div className="biz-banner p-6 sm:p-8 flex flex-col lg:flex-row items-center justify-between gap-6 shadow-2xs">
        {/* Left: Bar Chart Widget */}
        <div className="space-y-3 w-full lg:w-auto">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            System Registration Activity
          </div>
          <div className="flex items-end gap-3 h-24 pt-2">
            <div className="flex flex-col items-center gap-1">
              <div className="w-6 bg-slate-900 rounded-t-md h-12" />
              <span className="text-[10px] font-bold text-slate-400">Mon</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-6 bg-slate-400 rounded-t-md h-16" />
              <span className="text-[10px] font-bold text-slate-400">Tue</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-6 bg-slate-900 rounded-t-md h-20" />
              <span className="text-[10px] font-bold text-slate-400">Wed</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-6 bg-slate-300 rounded-t-md h-10" />
              <span className="text-[10px] font-bold text-slate-400">Thu</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-6 bg-slate-900 rounded-t-md h-22" />
              <span className="text-[10px] font-bold text-slate-400">Fri</span>
            </div>
          </div>
        </div>

        {/* Middle: Gauge Progress Indicator */}
        <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="relative h-16 w-16 flex items-center justify-center rounded-full border-4 border-slate-950 border-t-slate-200">
            <span className="text-base font-black text-slate-950">92%</span>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-950">Platform Health</div>
            <div className="text-[11px] text-slate-500">Multi-tenant uptime ok</div>
          </div>
        </div>

        {/* Right: Big Numeric Metrics */}
        <div className="flex items-center gap-8 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 border-slate-200 pt-4 lg:pt-0">
          <div>
            <div className="text-3xl font-black text-slate-950">{metrics.totalUniversities}</div>
            <div className="text-xs font-semibold text-slate-500">Campuses Active</div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-950">{metrics.pendingUsersCount}</div>
            <div className="text-xs font-semibold text-amber-600 font-bold">Pending Approvals</div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-950">{metrics.totalWorkOrdersCount}</div>
            <div className="text-xs font-semibold text-slate-500">Work Orders Total</div>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-950">System Overview & Recent Activity</h2>
          </div>

          {/* Kanban-style Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Highlighted Card (BizLink Dark Style) */}
            <div className="biz-card-dark p-5 space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Platform Control</span>
                <MoreVertical className="h-4 w-4 text-slate-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Central System Status</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Multi-tenant database active. Managing {metrics.totalUniversities} universities and {metrics.totalTechsCount} technicians.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-between text-xs text-slate-300 border-t border-slate-800">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" /> Real-time
                </span>
                <span className="font-bold text-emerald-400">Operational</span>
              </div>
            </div>

            {/* Standard White Cards */}
            {universities.slice(0, 5).map((uni) => (
              <div key={uni.id} className="biz-card p-5 space-y-4 hover:border-slate-400 transition-all">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-xs text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {uni.abbreviation}
                  </span>
                  <MoreVertical className="h-4 w-4 text-slate-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-950">{uni.name}</h3>
                  <p className="text-xs text-slate-500">
                    {uni.buildingsCount} Buildings • {uni.usersCount} Accounts Registered
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <ClipboardList className="h-3.5 w-3.5 text-slate-400" /> {uni.workOrdersCount} Work Orders
                  </span>
                  <span className="font-mono">{uni.phone || "-"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "approvals" && (
        <div className="biz-card p-6 space-y-5 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-950 flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <span>Pending User Approvals ({pendingUsers.length})</span>
            </h2>
          </div>

          {filteredPendingUsers.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-2xl">
              No pending approval requests at this time.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 rounded-l-xl">User Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">University</th>
                    <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPendingUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-950">{u.name}</td>
                      <td className="py-3.5 px-4 font-mono">{u.email}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{u.role}</td>
                      <td className="py-3.5 px-4">{u.universityName}</td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleUserStatus(u.id, "active")}
                          disabled={isPending}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white hover:bg-emerald-700 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleUserStatus(u.id, "suspended")}
                          disabled={isPending}
                          className="rounded-lg bg-red-600 px-3 py-1.5 font-bold text-white hover:bg-red-700 transition-colors"
                        >
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

      {activeTab === "universities" && (
        <div className="biz-card p-6 space-y-5 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-950 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-slate-700" />
              <span>Universities Directory ({universities.length})</span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">Name</th>
                  <th className="py-3 px-4">Abbr</th>
                  <th className="py-3 px-4">Buildings</th>
                  <th className="py-3 px-4">Users</th>
                  <th className="py-3 px-4">Work Orders</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUniversities.map((uni) => (
                  <tr key={uni.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-950">{uni.name}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{uni.abbreviation}</td>
                    <td className="py-3.5 px-4">{uni.buildingsCount}</td>
                    <td className="py-3.5 px-4">{uni.usersCount}</td>
                    <td className="py-3.5 px-4">{uni.workOrdersCount}</td>
                    <td className="py-3.5 px-4 text-right font-mono">{uni.phone || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add University */}
      {showAddUniModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-950">Add New University</h3>
              <button onClick={() => setShowAddUniModal(false)} className="text-slate-400 hover:text-slate-950">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUniSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="mb-1 block font-bold text-slate-700">University Name</label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. Phuket Rajabhat University"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-900 focus:border-slate-950 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">Abbreviation (Abbr)</label>
                <input
                  name="abbreviation"
                  type="text"
                  required
                  maxLength={10}
                  placeholder="e.g. PKRU"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-900 uppercase font-mono font-bold focus:border-slate-950 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">Address</label>
                <textarea
                  name="address"
                  rows={2}
                  placeholder="Address..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-900 focus:border-slate-950 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">Phone</label>
                <input
                  name="phone"
                  type="text"
                  placeholder="076-211-959"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-900 font-mono focus:border-slate-950 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUniModal(false)}
                  className="w-1/2 rounded-xl border border-slate-200 py-2.5 font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-1/2 rounded-xl bg-slate-950 py-2.5 font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Save University"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

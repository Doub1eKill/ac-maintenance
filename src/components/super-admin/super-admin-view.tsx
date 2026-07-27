"use client";

import { useState, useTransition } from "react";
import { updateUserStatusAction } from "@/app/super-admin/actions";
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
  User,
  Settings,
} from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { DashboardLayout, NavItem } from "@/components/layout/dashboard-layout";
import { MasterDataClient } from "@/app/super-admin/master-data/master-data-client";
import { Database } from "lucide-react";
import { ChartAreaInteractive } from "@/components/admin/chart-area-interactive";
import {
  Alert,
  AlertTitle,
  AlertDescription,
  AlertAction,
} from "@/components/ui/alert";

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
  brands: any[]; // Or add proper BrandType interface
  registrationActivity?: Array<{ day: string; users: number }>;
}

export function SuperAdminView({
  user,
  dbError,
  metrics,
  pendingUsers,
  universities,
  brands,
  registrationActivity = [],
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
    const data = Object.fromEntries(formData.entries());

    startTransition(async () => {
      try {
        const res = await fetch("/api/super-admin/universities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.name,
            shortName: data.abbreviation,
            contactName: data.contactName,
            contactEmail: data.adminEmail, // using adminEmail as contact email too
            contactPhone: data.phone,
            adminEmail: data.adminEmail,
            adminPassword: data.adminPassword,
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          setActionMessage({ type: "error", text: errorText || "Failed to create university" });
        } else {
          setActionMessage({ type: "success", text: "เพิ่มมหาวิทยาลัยใหม่ลงระบบเรียบร้อยแล้ว" });
          setShowAddUniModal(false);
          // In a real app, we'd router.refresh() here
        }
      } catch (err: any) {
        setActionMessage({ type: "error", text: err.message });
      }
    });
  }

  const superAdminNavItems: NavItem[] = [
    {
      id: "overview",
      label: "แดชบอร์ด",
      icon: ShieldCheck,
      group: "หน้าหลัก",
    },
    {
      id: "approvals",
      label: "อนุมัติผู้ใช้",
      icon: Clock,
      badge: pendingUsers.length,
      group: "ผู้ใช้งานและคำขอ",
    },
    {
      id: "universities",
      label: "มหาวิทยาลัย",
      icon: Building2,
      group: "ข้อมูลองค์กร",
    },
    {
      id: "master-data",
      label: "ข้อมูลหลัก",
      icon: Database,
      group: "ข้อมูลองค์กร",
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
      user={user}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      navItems={superAdminNavItems}
      searchValue={globalSearch}
      onSearchChange={setGlobalSearch}
      searchPlaceholder="ค้นหามหาวิทยาลัย, ผู้ใช้, อีเมล..."
      onCreateAction={() => setShowAddUniModal(true)}
      createActionLabel="+ เพิ่มมหาวิทยาลัย"
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
      {actionMessage && (
        <Alert
          className={actionMessage.type === "success"
            ? "border-success/30 bg-success/10 text-success-foreground"
            : "border-red-200 bg-red-50 text-destructive"
          }
        >
          {actionMessage.type === "success" ? (
            <AnimatedIcon icon={CheckCircle2} size={16} animation="bounce" className="text-success" />
          ) : (
            <AnimatedIcon icon={AlertTriangle} size={16} animation="wiggle" className="text-destructive" />
          )}
          <AlertDescription
            className={actionMessage.type === "success"
              ? "text-success-foreground font-semibold"
              : "text-destructive font-semibold"
            }
          >
            {actionMessage.text}
          </AlertDescription>
          <AlertAction>
            <button
              onClick={() => setActionMessage(null)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </AlertAction>
        </Alert>
      )}

      {/* BizLink Top Analytic Banner (Bar Chart & Gauge Stats Widget) */}
      <div className="biz-banner p-6 sm:p-8 flex flex-col lg:flex-row items-center justify-between gap-6 shadow-2xs">
        {/* Left: Interactive Area Chart Widget */}
        <div className="w-full lg:w-1/2">
          <ChartAreaInteractive 
            title="กิจกรรมและการลงทะเบียนเข้าระบบ" 
            description="แสดงสถิติการใช้งานและการลงทะเบียนเปรียบเทียบย้อนหลัง" 
          />
        </div>

        {/* Middle: Gauge Progress Indicator */}
        <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="relative h-16 w-16 flex items-center justify-center rounded-full border-4 border-slate-950 border-t-slate-200">
            <span className="text-base font-black text-slate-950">92%</span>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-950">สถานะระบบส่วนกลาง</div>
            <div className="text-[11px] text-slate-500">ระบบทำงานปกติ</div>
          </div>
        </div>

        {/* Right: Big Numeric Metrics */}
        <div className="flex items-center gap-8 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 border-slate-200 pt-4 lg:pt-0">
          <div>
            <div className="text-3xl font-black text-slate-950">{metrics.totalUniversities}</div>
            <div className="text-xs font-semibold text-slate-500">องค์กรที่เปิดใช้งาน</div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-950">{metrics.pendingUsersCount}</div>
            <div className="text-xs font-semibold text-amber-600 font-bold">รออนุมัติ</div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-950">{metrics.totalWorkOrdersCount}</div>
            <div className="text-xs font-semibold text-slate-500">ใบงานทั้งหมด</div>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-950">ภาพรวมระบบและกิจกรรมล่าสุด</h2>
          </div>

          {/* Kanban-style Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Highlighted Card (BizLink Dark Style) */}
            <div className="biz-card-dark p-5 space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">การจัดการระบบส่วนกลาง</span>
                <MoreVertical className="h-4 w-4 text-slate-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">สถานะระบบส่วนกลาง</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  ฐานข้อมูลระบบทำงานปกติ บริหารจัดการ {metrics.totalUniversities} องค์กร และช่างเทคนิค {metrics.totalTechsCount} คน
                </p>
              </div>
              <div className="pt-2 flex items-center justify-between text-xs text-slate-300 border-t border-slate-800">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" /> เรียลไทม์
                </span>
                <span className="font-bold text-emerald-400">ใช้งานได้ปกติ</span>
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
                    {uni.buildingsCount} อาคาร • ลงทะเบียน {uni.usersCount} บัญชี
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <ClipboardList className="h-3.5 w-3.5 text-slate-400" /> ใบงาน {uni.workOrdersCount} ใบ
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
              <span>คำขออนุมัติผู้ใช้งาน ({pendingUsers.length})</span>
            </h2>
          </div>

          {filteredPendingUsers.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-2xl">
              ไม่มีคำขออนุมัติในขณะนี้
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 rounded-l-xl">ชื่อผู้ใช้</th>
                    <th className="py-3 px-4">อีเมล</th>
                    <th className="py-3 px-4">บทบาท</th>
                    <th className="py-3 px-4">มหาวิทยาลัย</th>
                    <th className="py-3 px-4 text-right rounded-r-xl">จัดการ</th>
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
                          อนุมัติ
                        </button>
                        <button
                          onClick={() => handleUserStatus(u.id, "suspended")}
                          disabled={isPending}
                          className="rounded-lg bg-red-600 px-3 py-1.5 font-bold text-white hover:bg-red-700 transition-colors"
                        >
                          ปฏิเสธ
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
              <span>ทำเนียบองค์กร ({universities.length})</span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">ชื่อ</th>
                  <th className="py-3 px-4">ตัวย่อ</th>
                  <th className="py-3 px-4">อาคาร</th>
                  <th className="py-3 px-4">ผู้ใช้</th>
                  <th className="py-3 px-4">ใบงาน</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">เบอร์โทรศัพท์</th>
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

      {activeTab === "master-data" && (
        <div className="animate-in fade-in">
          <MasterDataClient initialBrands={brands} />
        </div>
      )}

      {/* Modal: Add University */}
      {showAddUniModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-950">เพิ่มองค์กรใหม่</h3>
              <button onClick={() => setShowAddUniModal(false)} className="text-slate-400 hover:text-slate-950">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUniSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="mb-1 block font-bold text-slate-700">ชื่อองค์กร (มหาวิทยาลัย)</label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="เช่น มหาวิทยาลัยราชภัฏภูเก็ต"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-900 focus:border-slate-950 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">ตัวย่อ</label>
                <input
                  name="abbreviation"
                  type="text"
                  required
                  maxLength={10}
                  placeholder="เช่น PKRU"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-900 uppercase font-mono font-bold focus:border-slate-950 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">ที่อยู่</label>
                <textarea
                  name="address"
                  rows={2}
                  placeholder="ที่อยู่..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-900 focus:border-slate-950 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">เบอร์โทรศัพท์</label>
                <input
                  name="phone"
                  type="text"
                  placeholder="076-211-959"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-900 font-mono focus:border-slate-950 focus:outline-none"
                />
              </div>

              <div className="border-t border-slate-100 pt-3">
                <h4 className="font-bold text-slate-950 mb-2">บัญชีผู้ดูแลระบบองค์กร (เริ่มต้น)</h4>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">ชื่อผู้ดูแลระบบ</label>
                    <input
                      name="contactName"
                      type="text"
                      required
                      placeholder="Admin Name"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-900 focus:border-slate-950 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">อีเมลผู้ดูแลระบบ</label>
                    <input
                      name="adminEmail"
                      type="email"
                      required
                      placeholder="admin@uni.edu"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-900 focus:border-slate-950 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">รหัสผ่าน</label>
                    <input
                      name="adminPassword"
                      type="password"
                      required
                      placeholder="อย่างน้อย 8 ตัวอักษร"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-900 focus:border-slate-950 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUniModal(false)}
                  className="w-1/2 rounded-xl border border-slate-200 py-2.5 font-bold text-slate-700 hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-1/2 rounded-xl bg-slate-950 py-2.5 font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {isPending ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

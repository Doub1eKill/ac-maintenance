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
} from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";

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
  metrics: {
    totalUniversities: number;
    pendingUsersCount: number;
    totalTechsCount: number;
    totalWorkOrdersCount: number;
  };
  pendingUsers: PendingUser[];
  universities: UniversityItem[];
}

export function SuperAdminView({ metrics, pendingUsers, universities }: SuperAdminViewProps) {
  const [isPending, startTransition] = useTransition();
  const [showAddUniModal, setShowAddUniModal] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  return (
    <div className="space-y-8 pb-12">
      {/* Action Notification Toast */}
      {actionMessage && (
        <div
          className={`rounded-xl border p-4 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-lg ${
            actionMessage.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === "success" ? (
              <AnimatedIcon icon={CheckCircle2} size={16} animation="bounce" className="text-emerald-400" />
            ) : (
              <AnimatedIcon icon={AlertTriangle} size={16} animation="wiggle" className="text-red-400" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top Welcome Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300 mb-2">
            <AnimatedIcon icon={ShieldCheck} size={14} animation="bounce" />
            Platform Super Admin Control Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            แดชบอร์ดบริหารจัดการแพลตฟอร์มส่วนกลาง
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            ควบคุมสิทธิ์บัญชีผู้ใช้ อนุมัติการลงทะเบียน และบริหารจัดการรายชื่อมหาวิทยาลัยในระบบ Multi-Tenant
          </p>
        </div>

        <button
          onClick={() => setShowAddUniModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 px-4 py-2.5 text-xs font-bold text-slate-950 hover:from-sky-400 hover:to-cyan-300 transition-all shadow-lg shadow-sky-500/20 group"
        >
          <AnimatedIcon icon={Plus} size={16} animation="spin" className="stroke-[3]" />
          เพิ่มมหาวิทยาลัยใหม่
        </button>
      </div>

      {/* Top Metric Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-xl space-y-2 group hover:border-sky-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">มหาวิทยาลัยในระบบ</span>
            <AnimatedIcon icon={Building2} size={18} animation="lift" className="text-sky-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-white">{metrics.totalUniversities}</span>
            <span className="text-xs font-semibold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md">Institutions</span>
          </div>
          <div className="text-[11px] text-slate-500">Multi-tenant campuses</div>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 backdrop-blur-xl space-y-2 group hover:border-amber-500/60 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              รอการอนุมัติสิทธิ์ (Pending)
            </span>
            <AnimatedIcon icon={Clock} size={18} animation="pulse" className="text-amber-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-amber-300">{metrics.pendingUsersCount}</span>
            <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">Requires Action</span>
          </div>
          <div className="text-[11px] text-slate-400">ผู้สมัครใหม่รอ Admin ยืนยัน</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-xl space-y-2 group hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">ช่างเทคนิคซ่อมบำรุงรวม</span>
            <AnimatedIcon icon={Wrench} size={18} animation="wiggle" className="text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-emerald-400">{metrics.totalTechsCount}</span>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">Technicians</span>
          </div>
          <div className="text-[11px] text-slate-500">Active Field Workers</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-xl space-y-2 group hover:border-cyan-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">ใบงานซ่อมบำรุงในระบบ</span>
            <AnimatedIcon icon={ClipboardList} size={18} animation="bounce" className="text-cyan-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-cyan-400">{metrics.totalWorkOrdersCount}</span>
            <span className="text-xs font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md">Work Orders</span>
          </div>
          <div className="text-[11px] text-slate-500">System-wide logs</div>
        </div>
      </div>

      {/* Section 1: Pending User Approvals */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <AnimatedIcon icon={Clock} size={20} animation="pulse" className="text-amber-400" />
              <span>คำขออนุมัติบัญชีผู้ใช้ใหม่ (Pending Approvals)</span>
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                {pendingUsers.length}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              ตรวจสอบข้อมูลและอนุมัติสิทธิ์เข้าใช้งานสำหรับช่างเทคนิคและแอดมินมหาวิทยาลัยที่ลงทะเบียนเข้ามาใหม่
            </p>
          </div>
        </div>

        {pendingUsers.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl flex flex-col items-center gap-2">
            <AnimatedIcon icon={CheckCircle2} size={32} animation="bounce" className="text-slate-600" />
            <p>ไม่มีคำขอที่รอการอนุมัติในขณะนี้ ทุกบัญชีได้รับการยืนยันแล้ว</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">ผู้ใช้งาน</th>
                  <th className="py-3 px-4">อีเมล</th>
                  <th className="py-3 px-4">บทบาทที่ขอ (Role)</th>
                  <th className="py-3 px-4">มหาวิทยาลัยสังกัด</th>
                  <th className="py-3 px-4">วันที่สมัคร</th>
                  <th className="py-3 px-4 text-right">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {pendingUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">{u.name}</td>
                    <td className="py-3.5 px-4 text-slate-400">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold text-sky-300">
                        {u.role === "org_admin" ? "Org Admin" : "Technician"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-300">
                      {u.universityName} <span className="text-slate-500">({u.universityAbbr})</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString("th-TH") : "-"}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleUserStatus(u.id, "active")}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition-all group"
                      >
                        <AnimatedIcon icon={UserCheck} size={14} animation="bounce" />
                        อนุมัติ (Approve)
                      </button>
                      <button
                        onClick={() => handleUserStatus(u.id, "suspended")}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-all group"
                      >
                        <AnimatedIcon icon={UserX} size={14} animation="wiggle" />
                        ปฏิเสธ (Reject)
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 2: Universities Management Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <AnimatedIcon icon={Building2} size={20} animation="lift" className="text-sky-400" />
              <span>รายชื่อมหาวิทยาลัยในระบบ (Universities Management)</span>
            </h2>
            <p className="text-xs text-slate-400">สถาบันการศึกษาที่เปิดใช้งานระบบ Multi-tenant พร้อมสถิติอาคาร ช่าง และใบงาน</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">ชื่อมหาวิทยาลัย</th>
                <th className="py-3 px-4">ตัวย่อ (Abbr)</th>
                <th className="py-3 px-4">จำนวนอาคาร</th>
                <th className="py-3 px-4">ผู้ใช้งานในระบบ</th>
                <th className="py-3 px-4">ใบงานซ่อมบำรุง</th>
                <th className="py-3 px-4">เบอร์โทรศัพท์</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {universities.map((uni) => (
                <tr key={uni.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">{uni.name}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-sky-400">{uni.abbreviation}</td>
                  <td className="py-3.5 px-4 text-slate-300">{uni.buildingsCount} อาคาร</td>
                  <td className="py-3.5 px-4 text-slate-300">{uni.usersCount} บัญชี</td>
                  <td className="py-3.5 px-4 text-slate-300">{uni.workOrdersCount} รายการ</td>
                  <td className="py-3.5 px-4 text-slate-500">{uni.phone || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add University */}
      {showAddUniModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AnimatedIcon icon={Building2} size={20} animation="lift" className="text-sky-400" />
                <span>เพิ่มมหาวิทยาลัยใหม่ในระบบ</span>
              </h3>
              <button onClick={() => setShowAddUniModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUniSubmit} className="space-y-4 text-xs">
              <div>
                <label className="mb-1 block font-medium text-slate-300">ชื่อมหาวิทยาลัย (ภาษาไทย)</label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="เช่น มหาวิทยาลัยราชภัฏภูเก็ต"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-slate-300">ตัวย่อสถาบัน (Abbreviation - สำหรับรหัสแอร์)</label>
                <input
                  name="abbreviation"
                  type="text"
                  required
                  maxLength={10}
                  placeholder="เช่น PKRU"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-white uppercase placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-slate-300">ที่อยู่สถาบัน (ถ้ามี)</label>
                <textarea
                  name="address"
                  rows={2}
                  placeholder="ที่อยู่สถาบัน..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-slate-300">เบอร์โทรศัพท์ติดต่อ (ถ้ามี)</label>
                <input
                  name="phone"
                  type="text"
                  placeholder="076-211-959"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUniModal(false)}
                  className="w-1/2 rounded-xl border border-slate-700 py-2.5 font-semibold text-slate-300 hover:bg-slate-800"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-1/2 rounded-xl bg-sky-500 py-2.5 font-bold text-slate-950 hover:bg-sky-400 disabled:opacity-50"
                >
                  {isPending ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

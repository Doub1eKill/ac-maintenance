"use client";

import { useState, useTransition } from "react";
import { createWorkOrderAction } from "@/app/admin/actions";
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
} from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";

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

interface AdminDashboardViewProps {
  universityName: string;
  metrics: {
    totalUnits: number;
    brokenOrCleaningUnits: number;
    pendingWorkOrders: number;
    activeTechsCount: number;
  };
  workOrders: WorkOrderItem[];
  buildings: BuildingItem[];
  allAcUnits: Array<{ id: string; label: string }>;
}

export function AdminDashboardView({
  universityName,
  metrics,
  workOrders,
  buildings,
  allAcUnits,
}: AdminDashboardViewProps) {
  const [isPending, startTransition] = useTransition();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedBuilding, setExpandedBuilding] = useState<string | null>(buildings[0]?.id || null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const filteredOrders =
    statusFilter === "all"
      ? workOrders
      : workOrders.filter((wo) => wo.status === statusFilter);

  async function handleCreateOrderSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setToastMessage(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await createWorkOrderAction(formData);
      if (res.error) {
        setToastMessage({ type: "error", text: res.error });
      } else {
        setToastMessage({ type: "success", text: "ออกใบงานซ่อมบำรุงเรียบร้อยแล้ว" });
        setShowCreateModal(false);
      }
    });
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`rounded-xl border p-4 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-lg ${
            toastMessage.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === "success" ? (
              <AnimatedIcon icon={CheckCircle2} size={16} animation="bounce" className="text-emerald-400" />
            ) : (
              <AnimatedIcon icon={AlertTriangle} size={16} animation="wiggle" className="text-red-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300 mb-2">
            <AnimatedIcon icon={Building2} size={14} animation="lift" />
            {universityName} Workspace
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            ระบบบริหารจัดการ & ออกใบงานซ่อมบำรุง
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            ติดตามสถานะเครื่องปรับอากาศ กระจายใบงานซ่อม และควบคุมสินทรัพย์ภายในมหาวิทยาลัย
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 px-4 py-2.5 text-xs font-bold text-slate-950 hover:from-sky-400 hover:to-cyan-300 transition-all shadow-lg shadow-sky-500/20 group"
        >
          <AnimatedIcon icon={Plus} size={16} animation="spin" className="stroke-[3]" />
          ออกใบงานซ่อมด่วน (Create Order)
        </button>
      </div>

      {/* 4 Core Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-xl space-y-2 group hover:border-sky-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">จำนวนแอร์ทั้งหมด</span>
            <AnimatedIcon icon={Snowflake} size={18} animation="spin" className="text-sky-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-white">{metrics.totalUnits}</span>
            <span className="text-xs font-semibold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md">Units</span>
          </div>
          <div className="text-[11px] text-slate-500">ในระบบมหาวิทยาลัย</div>
        </div>

        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 backdrop-blur-xl space-y-2 group hover:border-red-500/60 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-red-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
              แอร์ที่ชำรุด / ต้องล้าง
            </span>
            <AnimatedIcon icon={AlertTriangle} size={18} animation="wiggle" className="text-red-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-red-300">{metrics.brokenOrCleaningUnits}</span>
            <span className="text-xs font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md">Attention</span>
          </div>
          <div className="text-[11px] text-slate-400">ต้องดำเนินการซ่อมบำรุง</div>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 backdrop-blur-xl space-y-2 group hover:border-amber-500/60 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">ใบงานที่รอช่างรับงาน</span>
            <AnimatedIcon icon={Clock} size={18} animation="pulse" className="text-amber-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-amber-300">{metrics.pendingWorkOrders}</span>
            <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">Pending Pool</span>
          </div>
          <div className="text-[11px] text-slate-400">รอช่างเทคนิคกดรับงาน</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-xl space-y-2 group hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">ช่างเทคนิคปฏิบัติงาน</span>
            <AnimatedIcon icon={Wrench} size={18} animation="bounce" className="text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-emerald-400">{metrics.activeTechsCount}</span>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">Active Techs</span>
          </div>
          <div className="text-[11px] text-slate-500">พร้อมรับงานซ่อมบำรุง</div>
        </div>
      </div>

      {/* Work Order Dispatch Center */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <AnimatedIcon icon={ClipboardList} size={20} animation="lift" className="text-sky-400" />
              <span>ศูนย์จ่ายและติดตามงานซ่อม (Work Order Dispatch Center)</span>
              <span className="rounded-full bg-sky-500/20 px-2.5 py-0.5 text-xs font-bold text-sky-300">
                {workOrders.length}
              </span>
            </h2>
            <p className="text-xs text-slate-400">ติดตามสถานะงานซ่อมแบบ Real-time และตรวจสอบช่างผู้รับงาน</p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setStatusFilter("all")}
              className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                statusFilter === "all" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                statusFilter === "pending" ? "bg-amber-500/20 text-amber-300" : "text-slate-400 hover:text-white"
              }`}
            >
              รอช่างรับ (Pending)
            </button>
            <button
              onClick={() => setStatusFilter("claimed")}
              className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                statusFilter === "claimed" ? "bg-sky-500/20 text-sky-300" : "text-slate-400 hover:text-white"
              }`}
            >
              กำลังซ่อม (Claimed)
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                statusFilter === "completed" ? "bg-emerald-500/20 text-emerald-300" : "text-slate-400 hover:text-white"
              }`}
            >
              เสร็จสิ้น (Completed)
            </button>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
            ไม่พบใบงานซ่อมตามเงื่อนไขที่เลือก
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">รหัสแอร์ (acCode)</th>
                  <th className="py-3 px-4">ยี่ห้อ</th>
                  <th className="py-3 px-4">สถานที่ / อาคาร / ห้อง</th>
                  <th className="py-3 px-4">สถานะงาน</th>
                  <th className="py-3 px-4">ช่างผู้รับงาน</th>
                  <th className="py-3 px-4">เวลาที่เปิดงาน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredOrders.map((wo) => (
                  <tr key={wo.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-sky-400">{wo.acCode}</td>
                    <td className="py-3.5 px-4 text-slate-300">{wo.brand}</td>
                    <td className="py-3.5 px-4 font-medium text-white">{wo.location}</td>
                    <td className="py-3.5 px-4">
                      {wo.status === "pending" && (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                          รอช่างรับงาน (Pending)
                        </span>
                      )}
                      {wo.status === "claimed" && (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-bold text-sky-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                          กำลังดำเนินการ (Claimed)
                        </span>
                      )}
                      {wo.status === "completed" && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
                          <AnimatedIcon icon={CheckCircle2} size={14} animation="bounce" />
                          เสร็จสิ้น (Completed)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {wo.claimedByName ? (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-200">
                          <AnimatedIcon icon={Wrench} size={14} animation="wiggle" className="text-sky-400" />
                          {wo.claimedByName}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">ยังไม่มีผู้รับ</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {wo.createdAt ? new Date(wo.createdAt).toLocaleString("th-TH") : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Asset Hierarchy View */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <AnimatedIcon icon={Building2} size={20} animation="lift" className="text-sky-400" />
            <span>โครงสร้างอาคารและสินทรัพย์ (Asset Hierarchy Tree)</span>
          </h2>
          <p className="text-xs text-slate-400">แสดงลำดับขั้น อาคาร ➔ ห้อง ➔ เครื่องปรับอากาศ พร้อมสถานะรายเครื่อง</p>
        </div>

        <div className="space-y-3">
          {buildings.map((b) => (
            <div key={b.id} className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
              <button
                onClick={() => setExpandedBuilding(expandedBuilding === b.id ? null : b.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-900 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 font-bold text-xs border border-sky-500/20">
                    {b.abbreviation}
                  </span>
                  <div>
                    <h3 className="font-bold text-white text-sm">{b.name}</h3>
                    <p className="text-xs text-slate-400">{b.rooms.length} ห้อง • {b.unitsCount} เครื่องปรับอากาศ</p>
                  </div>
                </div>
                <span className="text-slate-400 text-sm font-bold">
                  {expandedBuilding === b.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </span>
              </button>

              {expandedBuilding === b.id && (
                <div className="border-t border-slate-800/80 bg-slate-900/40 p-4 space-y-4">
                  {b.rooms.map((r) => (
                    <div key={r.id} className="rounded-lg border border-slate-800 bg-slate-900 p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                        <span className="font-bold text-slate-200 flex items-center gap-1.5">
                          <AnimatedIcon icon={DoorClosed} size={14} animation="bounce" className="text-sky-400" />
                          ห้อง {r.name} (ชั้น {r.floor || 1})
                        </span>
                        <span className="text-slate-400">{r.acUnits.length} เครื่อง</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {r.acUnits.map((ac) => (
                          <div
                            key={ac.id}
                            className="rounded-md border border-slate-800 bg-slate-950 p-2.5 text-xs flex items-center justify-between"
                          >
                            <div>
                              <div className="font-mono font-bold text-sky-400">{ac.acCode}</div>
                              <div className="text-[11px] text-slate-400">{ac.brand} {ac.btu ? `(${ac.btu} BTU)` : ""}</div>
                            </div>
                            <div>
                              {ac.status === "normal" && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                                  <AnimatedIcon icon={CheckCircle2} size={12} animation="bounce" /> ปกติ
                                </span>
                              )}
                              {ac.status === "broken" && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
                                  <AnimatedIcon icon={AlertTriangle} size={12} animation="wiggle" /> ชำรุด
                                </span>
                              )}
                              {ac.status === "needs_cleaning" && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                                  <AnimatedIcon icon={Clock} size={12} animation="pulse" /> ต้องล้าง
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Create Work Order */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AnimatedIcon icon={ClipboardList} size={20} animation="lift" className="text-sky-400" />
                <span>ออกใบงานซ่อมบำรุงด่วน (Create Order)</span>
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOrderSubmit} className="space-y-4 text-xs">
              <div>
                <label className="mb-1.5 block font-medium text-slate-300">เลือกเครื่องปรับอากาศที่ต้องการแจ้งซ่อม</label>
                <select
                  name="airConditionerId"
                  required
                  defaultValue=""
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-white focus:border-sky-500 focus:outline-none"
                >
                  <option value="" disabled className="bg-slate-900 text-slate-500">
                    -- กรุณาเลือกเครื่องปรับอากาศ --
                  </option>
                  {allAcUnits.map((unit) => (
                    <option key={unit.id} value={unit.id} className="bg-slate-900 text-white">
                      {unit.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-300">
                เมื่อออกใบงานซ่อม ใบงานจะปรากฏใน <b>Job Pool</b> ของช่างเทคนิคทันทีเพื่อให้ช่างกดรับงานต่อไป
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/2 rounded-xl border border-slate-700 py-2.5 font-semibold text-slate-300 hover:bg-slate-800"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-1/2 rounded-xl bg-sky-500 py-2.5 font-bold text-slate-950 hover:bg-sky-400 disabled:opacity-50"
                >
                  {isPending ? "กำลังออกใบงาน..." : "ยืนยันออกใบงาน"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

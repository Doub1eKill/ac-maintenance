"use client";

import { useState, useTransition } from "react";
import { claimWorkOrderAction, logMaintenanceAction } from "@/app/tech/actions";
import {
  Wrench,
  QrCode,
  ClipboardList,
  CheckCircle2,
  Droplets,
  Sparkles,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";

interface TechJobItem {
  id: string;
  acCode: string;
  brand: string;
  btu: number | null;
  status: string;
  location: string;
  createdAt?: string | null;
  claimedAt?: string | null;
  airConditionerId?: string;
}

interface TechMobileViewProps {
  universityName: string;
  jobPool: TechJobItem[];
  myJobs: TechJobItem[];
}

export function TechMobileView({ universityName, jobPool, myJobs }: TechMobileViewProps) {
  const [activeTab, setActiveTab] = useState<"pool" | "my_jobs">("pool");
  const [isPending, startTransition] = useTransition();

  // QR Scanner Modal State
  const [showQrModal, setShowQrModal] = useState(false);
  const [scannedAcCode, setScannedAcCode] = useState("");

  // Action Logger Modal State
  const [selectedJobForLog, setSelectedJobForLog] = useState<TechJobItem | null>(null);

  // Notification Toast State
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function handleClaim(workOrderId: string) {
    setToastMessage(null);
    startTransition(async () => {
      const res = await claimWorkOrderAction(workOrderId);
      if (res.error) {
        setToastMessage({ type: "error", text: res.error });
      } else {
        setToastMessage({ type: "success", text: "รับงานเรียบร้อยแล้ว! งานถูกย้ายไปที่แท็บ 'งานของฉัน'" });
        setActiveTab("my_jobs");
      }
    });
  }

  async function handleLogActionSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setToastMessage(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await logMaintenanceAction(formData);
      if (res.error) {
        setToastMessage({ type: "error", text: res.error });
      } else {
        setToastMessage({ type: "success", text: "บันทึกประวัติการซ่อมบำรุงและปิดงานสำเร็จ!" });
        setSelectedJobForLog(null);
      }
    });
  }

  function handleSimulateQrScan() {
    if (!scannedAcCode.trim()) return;
    setShowQrModal(false);
    setToastMessage({
      type: "success",
      text: `สแกน QR Code รหัสเครื่อง ${scannedAcCode.trim()} สำเร็จ!`,
    });
    setScannedAcCode("");
  }

  return (
    <div className="space-y-6 pb-20 max-w-lg mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`rounded-2xl border p-4 text-xs font-semibold flex items-center justify-between shadow-xl ${
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

      {/* Top Mobile Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              <AnimatedIcon icon={Wrench} size={14} animation="wiggle" />
              ช่างเทคนิคซ่อมบำรุง
            </span>
            <h1 className="text-xl font-extrabold text-white mt-1">พื้นที่ปฏิบัติงานช่าง</h1>
            <p className="text-xs text-slate-400">{universityName}</p>
          </div>

          <button
            onClick={() => setShowQrModal(true)}
            className="flex flex-col items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 text-slate-950 font-bold shadow-lg shadow-sky-500/20 active:scale-95 transition-all group"
          >
            <AnimatedIcon icon={QrCode} size={24} animation="spin" className="stroke-[2.5]" />
            <span className="text-[9px] uppercase tracking-wider font-extrabold mt-0.5">QR SCAN</span>
          </button>
        </div>
      </div>

      {/* 2-Tab Mobile Navigation */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-950 p-1.5 border border-slate-800">
        <button
          onClick={() => setActiveTab("pool")}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition-all ${
            activeTab === "pool"
              ? "bg-gradient-to-r from-sky-500 to-cyan-400 text-slate-950 shadow-md"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <AnimatedIcon icon={ClipboardList} size={16} animation="lift" />
          <span>งานในคลัง (Job Pool)</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
            activeTab === "pool" ? "bg-slate-950 text-white" : "bg-slate-800 text-slate-300"
          }`}>
            {jobPool.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("my_jobs")}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition-all ${
            activeTab === "my_jobs"
              ? "bg-gradient-to-r from-sky-500 to-cyan-400 text-slate-950 shadow-md"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <AnimatedIcon icon={Wrench} size={16} animation="bounce" />
          <span>งานของฉัน (My Jobs)</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
            activeTab === "my_jobs" ? "bg-slate-950 text-white" : "bg-slate-800 text-slate-300"
          }`}>
            {myJobs.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Job Pool Cards */}
      {activeTab === "pool" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>รายการงานซ่อมบำรุงที่รอช่างกดรับ</span>
            <span>{jobPool.length} รายการ</span>
          </div>

          {jobPool.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center text-xs text-slate-500 space-y-2 flex flex-col items-center">
              <AnimatedIcon icon={CheckCircle2} size={32} animation="bounce" className="text-slate-600" />
              <p>ไม่มีงานซ่อมใหม่ในคลังในขณะนี้</p>
            </div>
          ) : (
            jobPool.map((job) => (
              <div
                key={job.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg space-y-3.5 backdrop-blur-xl hover:border-sky-500/40 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono font-black text-sky-400 text-base">{job.acCode}</span>
                    <div className="text-xs font-bold text-white mt-0.5">{job.brand} {job.btu ? `(${job.btu} BTU)` : ""}</div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                    รอช่างรับงาน
                  </span>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300 space-y-1">
                  <div className="text-[11px] text-slate-400 font-medium">สถานที่ตั้ง:</div>
                  <div className="font-semibold text-white">{job.location}</div>
                </div>

                <button
                  onClick={() => handleClaim(job.id)}
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 py-3 text-xs font-black text-slate-950 hover:from-sky-400 hover:to-cyan-300 disabled:opacity-50 transition-all shadow-md shadow-sky-500/20 active:scale-[0.98] group"
                >
                  <AnimatedIcon icon={Wrench} size={16} animation="bounce" className="stroke-[2.5]" />
                  <span>{isPending ? "กำลังบันทึก..." : "กดรับงานนี้ (Claim Order)"}</span>
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: My Active Jobs Cards */}
      {activeTab === "my_jobs" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>งานซ่อมบำรุงที่คุณรับมาแล้ว</span>
            <span>{myJobs.length} รายการ</span>
          </div>

          {myJobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center text-xs text-slate-500 space-y-2 flex flex-col items-center">
              <AnimatedIcon icon={ClipboardList} size={32} animation="bounce" className="text-slate-600" />
              <p>คุณยังไม่มีงานซ่อมที่รับไว้ ไปที่แท็บ &quot;งานในคลัง&quot; เพื่อกดรับงานได้เลย</p>
            </div>
          ) : (
            myJobs.map((job) => (
              <div
                key={job.id}
                className="rounded-2xl border border-sky-500/30 bg-slate-900 p-5 shadow-xl space-y-3.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono font-black text-sky-400 text-base">{job.acCode}</span>
                    <div className="text-xs font-bold text-white mt-0.5">{job.brand} {job.btu ? `(${job.btu} BTU)` : ""}</div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-bold text-sky-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
                    กำลังดำเนินการ
                  </span>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300 space-y-1">
                  <div className="text-[11px] text-slate-400 font-medium">สถานที่ตั้ง:</div>
                  <div className="font-semibold text-white">{job.location}</div>
                </div>

                <button
                  onClick={() => setSelectedJobForLog(job)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-3 text-xs font-black text-slate-950 hover:from-emerald-400 hover:to-teal-300 transition-all shadow-md shadow-emerald-500/20 active:scale-[0.98] group"
                >
                  <AnimatedIcon icon={CheckCircle2} size={16} animation="bounce" className="stroke-[2.5]" />
                  <span>บันทึกประวัติซ่อมบำรุง & ปิดงาน</span>
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal: Action Logger Sheet */}
      {selectedJobForLog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <AnimatedIcon icon={CheckCircle2} size={18} animation="bounce" className="text-emerald-400" />
                  <span>บันทึกประวัติซ่อมบำรุง</span>
                </h3>
                <p className="text-xs text-sky-400 font-mono font-bold">{selectedJobForLog.acCode}</p>
              </div>
              <button onClick={() => setSelectedJobForLog(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleLogActionSubmit} className="space-y-4 text-xs">
              <input type="hidden" name="workOrderId" value={selectedJobForLog.id} />
              <input type="hidden" name="airConditionerId" value={selectedJobForLog.airConditionerId || ""} />

              <div>
                <label className="mb-1.5 block font-semibold text-slate-300 uppercase tracking-wider">
                  ประเภทการซ่อมบำรุง (Maintenance Action)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-950 p-3 text-center cursor-pointer hover:border-sky-500 has-[:checked]:border-sky-500 has-[:checked]:bg-sky-500/10 group">
                    <input type="radio" name="action" value="cleaning" defaultChecked className="sr-only" />
                    <AnimatedIcon icon={Sparkles} size={20} animation="sparkle" className="text-sky-400 mb-1" />
                    <span className="font-bold text-white text-[11px]">ล้างแอร์</span>
                  </label>
                  <label className="flex flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-950 p-3 text-center cursor-pointer hover:border-sky-500 has-[:checked]:border-sky-500 has-[:checked]:bg-sky-500/10 group">
                    <input type="radio" name="action" value="repair" className="sr-only" />
                    <AnimatedIcon icon={Wrench} size={20} animation="wiggle" className="text-amber-400 mb-1" />
                    <span className="font-bold text-white text-[11px]">ซ่อมแซม</span>
                  </label>
                  <label className="flex flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-950 p-3 text-center cursor-pointer hover:border-sky-500 has-[:checked]:border-sky-500 has-[:checked]:bg-sky-500/10 group">
                    <input type="radio" name="action" value="refill_refrigerant" className="sr-only" />
                    <AnimatedIcon icon={Droplets} size={20} animation="bounce" className="text-cyan-400 mb-1" />
                    <span className="font-bold text-white text-[11px]">เติมน้ำยา</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block font-medium text-slate-300">รายละเอียดเพิ่มเติม / หมายเหตุ</label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="ระบุอาการ การเปลี่ยนอะไหล่ หรือหมายเหตุการล้างแอร์..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedJobForLog(null)}
                  className="w-1/2 rounded-xl border border-slate-700 py-3 font-semibold text-slate-300 hover:bg-slate-800"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-1/2 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-3 font-bold text-slate-950 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-50"
                >
                  <AnimatedIcon icon={Check} size={16} animation="bounce" className="stroke-[3]" />
                  <span>{isPending ? "กำลังบันทึก..." : "ยืนยันปิดงาน"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: QR Code Scanner Simulator */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 text-center">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AnimatedIcon icon={QrCode} size={16} animation="spin" className="text-sky-400" />
                <span>สแกน QR Code หน้างาน</span>
              </h3>
              <button onClick={() => setShowQrModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-2xl border-2 border-dashed border-sky-400/50 bg-slate-950 relative overflow-hidden">
              <div className="absolute inset-x-0 h-1 bg-sky-400 shadow-lg shadow-sky-400 animate-bounce" />
              <AnimatedIcon icon={QrCode} size={48} animation="pulse" className="text-slate-600" />
            </div>

            <p className="text-xs text-slate-400">
              กล้องมือถือพร้อมสแกนป้าย QR Code ที่ติดอยู่กับตัวเครื่องปรับอากาศ
            </p>

            <div className="space-y-2 text-left">
              <label className="text-[11px] font-semibold text-slate-300">ทดสอบจำลองป้อนรหัสแอร์ (acCode):</label>
              <input
                type="text"
                value={scannedAcCode}
                onChange={(e) => setScannedAcCode(e.target.value)}
                placeholder="เช่น PKRU-B1-301-01"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white uppercase focus:border-sky-500 focus:outline-none"
              />
            </div>

            <button
              onClick={handleSimulateQrScan}
              className="w-full rounded-xl bg-sky-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-sky-400"
            >
              จำลองผลสแกน QR Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

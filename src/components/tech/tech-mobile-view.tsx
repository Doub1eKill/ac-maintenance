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
  Search,
  Building2,
  MoreVertical,
  Calendar,
} from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { DashboardLayout, NavItem } from "@/components/layout/dashboard-layout";

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
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
  dbError?: string | null;
  universityName: string;
  jobPool: TechJobItem[];
  myJobs: TechJobItem[];
}

export function TechMobileView({
  user,
  dbError,
  universityName,
  jobPool,
  myJobs,
}: TechMobileViewProps) {
  const [activeTab, setActiveTab] = useState<string>("pool");
  const [isPending, startTransition] = useTransition();

  // Search Filter State
  const [searchQuery, setSearchQuery] = useState("");

  // QR Scanner Modal State
  const [showQrModal, setShowQrModal] = useState(false);
  const [scannedAcCode, setScannedAcCode] = useState("");

  // Action Logger Modal State
  const [selectedJobForLog, setSelectedJobForLog] = useState<TechJobItem | null>(null);

  // Notification Toast State
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const filteredPool = jobPool.filter(
    (job) =>
      job.acCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMyJobs = myJobs.filter(
    (job) =>
      job.acCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const techNavItems: NavItem[] = [
    {
      id: "pool",
      label: "งานทั้งหมด",
      icon: ClipboardList,
      badge: jobPool.length,
    },
    {
      id: "my_jobs",
      label: "งานของฉัน",
      icon: Wrench,
      badge: myJobs.length,
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
      navItems={techNavItems}
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="ค้นหารหัสแอร์, สถานที่..."
      onCreateAction={() => setShowQrModal(true)}
      createActionLabel="สแกน QR Code"
    >
      {/* Database Connection Alert */}
      {dbError && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs font-semibold text-amber-900 flex items-start gap-2.5 shadow-2xs">
          <AnimatedIcon icon={AlertTriangle} size={18} animation="wiggle" className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-amber-950">การแจ้งเตือนการเชื่อมต่อฐานข้อมูล</div>
            <p className="text-amber-800 font-normal leading-relaxed text-[11px]">{dbError}</p>
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
              <AnimatedIcon icon={CheckCircle2} size={18} animation="bounce" className="text-emerald-600 shrink-0" />
            ) : (
              <AnimatedIcon icon={AlertTriangle} size={18} animation="wiggle" className="text-red-600 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* BizLink Top Banner */}
      <div className="biz-banner p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
        <div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            พื้นที่ปฏิบัติงานช่างเทคนิค
          </div>
          <h1 className="text-xl font-bold text-slate-950 mt-1">
            {activeTab === "pool" ? "งานซ่อมบำรุงที่รอรับ" : "งานซ่อมบำรุงที่ฉันกำลังดำเนินการ"}
          </h1>
        </div>

        <button
          onClick={() => setShowQrModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-all shadow-md shrink-0"
        >
          <QrCode className="h-4 w-4 text-white" />
          <span>สแกน QR Code</span>
        </button>
      </div>

      {/* TAB 1: Job Pool */}
      {activeTab === "pool" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
          {filteredPool.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
              ไม่มีงานซ่อมบำรุงที่รอรับ
            </div>
          ) : (
            filteredPool.map((job) => (
              <div key={job.id} className="biz-card p-5 space-y-4 hover:border-slate-400 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-slate-950">{job.acCode}</span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                      {job.brand} {job.btu ? `(${job.btu} BTU)` : ""}
                    </span>
                  </div>
                  <MoreVertical className="h-4 w-4 text-slate-400" />
                </div>

                <div className="text-xs text-slate-600 font-medium leading-relaxed">
                  {job.location}
                </div>

                <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100">
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    รอรับงาน
                  </span>
                  <button
                    onClick={() => handleClaim(job.id)}
                    disabled={isPending}
                    className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-all shadow-sm active:scale-95"
                  >
                    รับงาน
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: My Jobs */}
      {activeTab === "my_jobs" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
          {filteredMyJobs.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
              คุณไม่มีงานที่กำลังดำเนินการ
            </div>
          ) : (
            filteredMyJobs.map((job, idx) => (
              <div
                key={job.id}
                className={idx === 0 ? "biz-card-dark p-5 space-y-4 shadow-md" : "biz-card p-5 space-y-4 hover:border-slate-400 transition-all"}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-base font-bold ${idx === 0 ? "text-white" : "text-slate-950"}`}>
                      {job.acCode}
                    </span>
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${idx === 0 ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"}`}>
                      {job.brand}
                    </span>
                  </div>
                  <MoreVertical className={`h-4 w-4 ${idx === 0 ? "text-slate-400" : "text-slate-400"}`} />
                </div>

                <div className={`text-xs font-medium leading-relaxed ${idx === 0 ? "text-slate-300" : "text-slate-600"}`}>
                  {job.location}
                </div>

                <div className={`pt-2 flex items-center justify-between text-xs border-t ${idx === 0 ? "border-slate-800 text-slate-300" : "border-slate-100 text-slate-500"}`}>
                  <span className="text-[11px] font-bold text-sky-600">กำลังดำเนินการ</span>
                  <button
                    onClick={() => setSelectedJobForLog(job)}
                    className="rounded-xl bg-slate-950 text-white border border-slate-800 px-4 py-2 text-xs font-bold hover:bg-slate-800 transition-all shadow-sm active:scale-95"
                  >
                    บันทึกและปิดงาน
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal: QR Code Scanner Simulator */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/40 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-slate-200 bg-white p-6 pb-10 sm:pb-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-950 flex items-center gap-2">
                <QrCode className="h-4 w-4 text-slate-950" />
                <span>สแกนรหัส QR เครื่องปรับอากาศ</span>
              </h3>
              <button onClick={() => setShowQrModal(false)} className="text-slate-400 hover:text-slate-950">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative h-40 w-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center overflow-hidden">
              <div className="absolute inset-x-0 h-0.5 bg-slate-900 animate-laser" />
              <QrCode className="h-12 w-12 text-slate-400 animate-pulse" />
              <span className="text-[11px] font-semibold text-slate-500 mt-2">เล็งกล้องไปที่ QR Code</span>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-700">จำลองการสแกน:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={scannedAcCode}
                  onChange={(e) => setScannedAcCode(e.target.value)}
                  placeholder="e.g. PKRU-ENG-101-AC1"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 font-mono focus:border-slate-950 focus:outline-none"
                />
                <button
                  onClick={handleSimulateQrScan}
                  className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 shrink-0"
                >
                  ยืนยัน
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Action Logger Sheet */}
      {selectedJobForLog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/40 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-slate-200 bg-white p-6 pb-10 sm:pb-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-950">บันทึกประวัติการซ่อม ({selectedJobForLog.acCode})</h3>
              <button onClick={() => setSelectedJobForLog(null)} className="text-slate-400 hover:text-slate-950">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleLogActionSubmit} className="space-y-4 text-xs">
              <input type="hidden" name="workOrderId" value={selectedJobForLog.id} />
              <input type="hidden" name="airConditionerId" value={selectedJobForLog.airConditionerId || ""} />

              <div>
                <label className="mb-2 block font-bold text-slate-700">ประเภทการดำเนินการ</label>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-3 text-center cursor-pointer hover:border-slate-950 has-[:checked]:border-slate-950 has-[:checked]:bg-slate-100">
                    <input type="radio" name="action" value="cleaning" defaultChecked className="sr-only" />
                    <Sparkles className="h-4 w-4 text-slate-800 mb-1" />
                    <span className="font-bold text-slate-950">ล้างแอร์</span>
                  </label>

                  <label className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-3 text-center cursor-pointer hover:border-slate-950 has-[:checked]:border-slate-950 has-[:checked]:bg-slate-100">
                    <input type="radio" name="action" value="repair" className="sr-only" />
                    <Wrench className="h-4 w-4 text-slate-800 mb-1" />
                    <span className="font-bold text-slate-950">ซ่อมแอร์</span>
                  </label>

                  <label className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-3 text-center cursor-pointer hover:border-slate-950 has-[:checked]:border-slate-950 has-[:checked]:bg-slate-100">
                    <input type="radio" name="action" value="refill_refrigerant" className="sr-only" />
                    <Droplets className="h-4 w-4 text-slate-800 mb-1" />
                    <span className="font-bold text-slate-950">เติมน้ำยาแอร์</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">บันทึกเพิ่มเติม (ไม่บังคับ)</label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="รายละเอียด..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-900 focus:border-slate-950 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedJobForLog(null)}
                  className="w-1/2 rounded-xl border border-slate-200 py-2.5 font-bold text-slate-700 hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-1/2 rounded-xl bg-slate-950 py-2.5 font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {isPending ? "กำลังบันทึก..." : "บันทึกและเสร็จสิ้น"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

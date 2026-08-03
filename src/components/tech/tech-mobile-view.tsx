"use client";

import { useState, useTransition, useEffect } from "react";
import { claimWorkOrderAction, logMaintenanceAction, scanQrCodeAction } from "@/app/tech/actions";
import type { TechnicianAssetUnit, TechnicianAssetSummary } from "@/lib/maintenance";
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
  History,
  Clock,
  Snowflake
} from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import {
  Alert,
  AlertTitle,
  AlertDescription,
  AlertAction,
} from "@/components/ui/alert";
import { DashboardLayout, NavItem } from "@/components/layout/dashboard-layout";
import { Pattern as FileUpload } from "@/components/examples/c-file-upload-4";
import { format } from "date-fns";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

interface TechJobItem {
  id: string;
  acCode: string;
  brand: string;
  btu: number | null;
  status: string;
  location: string;
  createdAt?: string | null;
  claimedAt?: string | null;
  completedAt?: string | null;
  airConditionerId?: string;
}

interface Building {
  id: string;
  name: string;
  abbr: string;
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
  completedJobs?: TechJobItem[];
  buildings?: Building[];
  assetList?: TechnicianAssetUnit[];
  assetSummary?: TechnicianAssetSummary;
}

export function TechMobileView({
  user,
  dbError,
  universityName,
  jobPool,
  myJobs,
  completedJobs = [],
  buildings = [],
  assetList = [],
  assetSummary = { total: 0, cleaningJobs: 0, repairJobs: 0 },
}: TechMobileViewProps) {
  const [activeTab, setActiveTab] = useState<string>("pool");
  const [isPending, startTransition] = useTransition();

  // Search Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState<string>("all");

  // QR Scanner Modal State
  const [showQrModal, setShowQrModal] = useState(false);
  const [scannedAcCode, setScannedAcCode] = useState("");
  const [qrResult, setQrResult] = useState<any>(null);

  // Action Logger Modal State
  const [selectedJobForLog, setSelectedJobForLog] = useState<TechJobItem | null>(null);
  
  // File states for the logger
  const [beforePhotos, setBeforePhotos] = useState<any[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<any[]>([]);
  
  // Multiple actions state
  const [selectedActions, setSelectedActions] = useState<string[]>([]);

  // Notification Toast State
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [poolPage, setPoolPage] = useState(1);
  const [myJobsPage, setMyJobsPage] = useState(1);
  const [completedJobsPage, setCompletedJobsPage] = useState(1);
  const [assetsPage, setAssetsPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setPoolPage(1);
    setMyJobsPage(1);
    setCompletedJobsPage(1);
    setAssetsPage(1);
  }, [searchQuery, selectedBuilding]);

  function filterJobs<T extends { acCode: string; brand: string; location: string }>(jobs: T[]): T[] {
    return jobs.filter((job) => {
      const matchesSearch =
        job.acCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.location.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesBuilding = selectedBuilding === "all" || job.location.includes(selectedBuilding);

      return matchesSearch && matchesBuilding;
    });
  }

  const filteredPool = filterJobs(jobPool);
  const filteredMyJobs = filterJobs(myJobs);
  const filteredCompletedJobs = filterJobs(completedJobs);
  const filteredAssets = filterJobs(assetList);

  const totalPoolPages = Math.ceil(filteredPool.length / ITEMS_PER_PAGE);
  const paginatedPool = filteredPool.slice((poolPage - 1) * ITEMS_PER_PAGE, poolPage * ITEMS_PER_PAGE);

  const totalMyJobsPages = Math.ceil(filteredMyJobs.length / ITEMS_PER_PAGE);
  const paginatedMyJobs = filteredMyJobs.slice((myJobsPage - 1) * ITEMS_PER_PAGE, myJobsPage * ITEMS_PER_PAGE);

  const totalCompletedJobsPages = Math.ceil(filteredCompletedJobs.length / ITEMS_PER_PAGE);
  const paginatedCompletedJobs = filteredCompletedJobs.slice((completedJobsPage - 1) * ITEMS_PER_PAGE, completedJobsPage * ITEMS_PER_PAGE);

  const totalAssetsPages = Math.ceil(filteredAssets.length / ITEMS_PER_PAGE);
  const paginatedAssets = filteredAssets.slice((assetsPage - 1) * ITEMS_PER_PAGE, assetsPage * ITEMS_PER_PAGE);

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

  async function handleSimulateQrScan() {
    if (!scannedAcCode.trim()) return;
    setToastMessage(null);
    setQrResult(null);
    
    startTransition(async () => {
      const res = await scanQrCodeAction(scannedAcCode.trim());
      if (res.error) {
        setToastMessage({ type: "error", text: res.error });
      } else {
        setQrResult(res);
      }
    });
  }

  function handleClaimFromQr() {
    if (qrResult?.pendingJobId) {
      handleClaim(qrResult.pendingJobId);
      setShowQrModal(false);
      setQrResult(null);
      setScannedAcCode("");
    }
  }

  function toggleAction(action: string) {
    setSelectedActions(prev => 
      prev.includes(action) ? prev.filter(a => a !== action) : [...prev, action]
    );
  }

  async function handleLogActionSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setToastMessage(null);
    
    if (selectedActions.length === 0) {
      setToastMessage({ type: "error", text: "กรุณาเลือกประเภทการดำเนินการอย่างน้อย 1 รายการ" });
      return;
    }
    
    const formData = new FormData(e.currentTarget);
    formData.append("actions", JSON.stringify(selectedActions));
    
    if (beforePhotos.length > 0) {
      formData.append("beforePhoto", beforePhotos[0].file);
    }
    if (afterPhotos.length > 0) {
      formData.append("afterPhoto", afterPhotos[0].file);
    }
    
    // Add parts to notes
    const parts = formData.get("parts") as string;
    let notes = formData.get("notes") as string;
    if (parts) {
      notes = `[อะไหล่/น้ำยา: ${parts}]\n${notes}`;
      formData.set("notes", notes);
    }

    startTransition(async () => {
      const res = await logMaintenanceAction(formData);
      if (res.error) {
        setToastMessage({ type: "error", text: res.error });
      } else {
        setToastMessage({ type: "success", text: "บันทึกประวัติการซ่อมบำรุงและปิดงานสำเร็จ!" });
        setSelectedJobForLog(null);
        setSelectedActions([]);
        setBeforePhotos([]);
        setAfterPhotos([]);
      }
    });
  }

  const techNavItems: NavItem[] = [
    {
      id: "assets",
      label: "แอร์ทั้งหมด",
      icon: Snowflake,
      badge: assetSummary.repairJobs + assetSummary.cleaningJobs,
    },
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
    {
      id: "completed",
      label: "ประวัติ",
      icon: CheckCircle2,
    },
  ];

  const isUrgent = (dateString?: string | null) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays >= 3;
  };

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
      searchPlaceholder="ค้นหารหัสแอร์..."
      onCreateAction={() => setShowQrModal(true)}
      createActionLabel="สแกน QR Code"
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

      {/* Filter Row */}
      <div className="biz-banner p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
        <div>
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            พื้นที่ปฏิบัติงานช่างเทคนิค
          </div>
          <h1 className="text-xl font-bold text-foreground mt-1">
            {activeTab === "assets" ? "เครื่องปรับอากาศทั้งหมด" :
             activeTab === "pool" ? "งานซ่อมบำรุงที่รอรับ" :
             activeTab === "my_jobs" ? "งานที่ฉันกำลังดำเนินการ" :
             "ประวัติการทำงานของฉัน"}
          </h1>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <NativeSelect 
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="w-full h-auto py-2 px-3 sm:w-auto rounded-xl border-border bg-white text-xs font-bold text-foreground shadow-sm"
          >
            <NativeSelectOption value="all">ทุกอาคาร</NativeSelectOption>
            {buildings.map(b => (
              <NativeSelectOption key={b.id} value={b.name}>{b.name}</NativeSelectOption>
            ))}
          </NativeSelect>

          <button
            onClick={() => setShowQrModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-xs font-bold text-white hover:bg-primary/90 transition-all shadow-md shrink-0"
          >
            <QrCode className="h-4 w-4 text-white" />
            <span className="hidden sm:inline">สแกน QR Code</span>
          </button>
        </div>
      </div>

      {/* TAB 0: All Assets */}
      {activeTab === "assets" && (
        <div className="space-y-4 animate-in fade-in">
          <div className="grid grid-cols-3 gap-3">
            <div className="biz-card p-4 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                <Snowflake className="h-3.5 w-3.5 text-primary" /> ทั้งหมด
              </div>
              <div className="text-xl font-bold text-foreground">{assetSummary.total}</div>
            </div>
            <div className="biz-card p-4 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                <Wrench className="h-3.5 w-3.5 text-red-500" /> รอซ่อม
              </div>
              <div className="text-xl font-bold text-foreground">{assetSummary.repairJobs}</div>
            </div>
            <div className="biz-card p-4 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                <Droplets className="h-3.5 w-3.5 text-amber-500" /> รอล้าง
              </div>
              <div className="text-xl font-bold text-foreground">{assetSummary.cleaningJobs}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAssets.length === 0 ? (
              <div className="col-span-full py-12 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
                ไม่มีเครื่องปรับอากาศในระบบ
              </div>
            ) : (
              paginatedAssets.map((unit) => (
                <div key={unit.id} className="biz-card p-5 space-y-4 hover:border-slate-400 transition-all relative overflow-hidden">
                  {unit.isOverdue && (
                    <div
                      className={`absolute top-0 right-0 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-sm ${
                        unit.status === "broken" ? "bg-red-500" : "bg-amber-500"
                      }`}
                    >
                      <Clock className="w-3 h-3" /> {unit.status === "broken" ? "รอซ่อม" : "รอล้าง"}
                    </div>
                  )}
                  <div className="pr-8 space-y-1">
                    <div className="text-sm font-bold text-foreground leading-snug">{unit.location}</div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-muted-foreground">{unit.acCode}</span>
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold text-foreground">
                        {unit.brand} {unit.btu ? `(${unit.btu} BTU)` : ""}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs border-t border-border">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-muted-foreground">ล้างล่าสุด</span>
                      <span className="text-[10px] text-muted-foreground mt-1">
                        {unit.lastCleanedAt ? format(new Date(unit.lastCleanedAt), "dd/MM/yyyy") : "ยังไม่เคยล้าง"}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "assets" && totalAssetsPages > 1 && (
        <div className="py-4 mt-2">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); setAssetsPage(p => Math.max(1, p - 1)); }}
                  className={assetsPage === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="text-xs font-medium text-muted-foreground px-4">
                  หน้า {assetsPage} จาก {totalAssetsPages}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => { e.preventDefault(); setAssetsPage(p => Math.min(totalAssetsPages, p + 1)); }}
                  className={assetsPage === totalAssetsPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* TAB 1: Job Pool */}
      {activeTab === "pool" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
          {filteredPool.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
              ไม่มีงานซ่อมบำรุงที่รอรับ
            </div>
          ) : (
            paginatedPool.map((job) => (
              <div key={job.id} className="biz-card p-5 space-y-4 hover:border-slate-400 transition-all relative overflow-hidden">
                {isUrgent(job.createdAt) && (
                  <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-sm">
                    <Clock className="w-3 h-3" /> ด่วน
                  </div>
                )}
                <div className="pr-8 space-y-1">
                  <div className="text-sm font-bold text-foreground leading-snug">{job.location}</div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-muted-foreground">{job.acCode}</span>
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold text-foreground">
                      {job.brand} {job.btu ? `(${job.btu} BTU)` : ""}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs border-t border-border">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-warning-foreground">รอรับงาน</span>
                    <span className="text-[10px] text-muted-foreground mt-1">
                      {job.createdAt ? `แจ้งเมื่อ: ${format(new Date(job.createdAt), "dd/MM/yyyy")}` : ""}
                    </span>
                  </div>
                  <button
                    onClick={() => handleClaim(job.id)}
                    disabled={isPending}
                    className="rounded-xl bg-foreground px-4 py-2 text-xs font-bold text-white hover:bg-primary/90 transition-all shadow-sm active:scale-95"
                  >
                    รับงาน
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "pool" && totalPoolPages > 1 && (
        <div className="py-4 mt-2">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); setPoolPage(p => Math.max(1, p - 1)); }} 
                  className={poolPage === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="text-xs font-medium text-muted-foreground px-4">
                  หน้า {poolPage} จาก {totalPoolPages}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); setPoolPage(p => Math.min(totalPoolPages, p + 1)); }}
                  className={poolPage === totalPoolPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* TAB 2: My Jobs */}
      {activeTab === "my_jobs" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
          {filteredMyJobs.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
              คุณไม่มีงานที่กำลังดำเนินการ
            </div>
          ) : (
            paginatedMyJobs.map((job, idx) => (
              <div
                key={job.id}
                className={idx === 0 ? "biz-card-dark p-5 space-y-4 shadow-md" : "biz-card p-5 space-y-4 hover:border-slate-400 transition-all"}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className={`text-sm font-bold leading-snug ${idx === 0 ? "text-white" : "text-foreground"}`}>
                      {job.location}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-muted-foreground">
                        {job.acCode}
                      </span>
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${idx === 0 ? "bg-slate-800 text-muted-foreground" : "bg-secondary text-foreground"}`}>
                        {job.brand}
                      </span>
                    </div>
                  </div>
                  <MoreVertical className={`h-4 w-4 ${idx === 0 ? "text-muted-foreground" : "text-muted-foreground"}`} />
                </div>

                <div className={`pt-2 flex items-center justify-between text-xs border-t ${idx === 0 ? "border-slate-800 text-muted-foreground" : "border-border text-muted-foreground"}`}>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-sky-400">กำลังดำเนินการ</span>
                    <span className={`text-[10px] mt-1 ${idx === 0 ? "text-muted-foreground" : "text-muted-foreground"}`}>
                      {job.claimedAt ? `รับงานเมื่อ: ${format(new Date(job.claimedAt), "dd/MM HH:mm")}` : ""}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedJobForLog(job);
                      setSelectedActions([]);
                    }}
                    className={`rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-sm active:scale-95 ${idx === 0 ? "bg-white text-foreground hover:bg-secondary" : "bg-foreground text-white hover:bg-primary/90"}`}
                  >
                    บันทึกและปิดงาน
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "my_jobs" && totalMyJobsPages > 1 && (
        <div className="py-4 mt-2">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); setMyJobsPage(p => Math.max(1, p - 1)); }} 
                  className={myJobsPage === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="text-xs font-medium text-muted-foreground px-4">
                  หน้า {myJobsPage} จาก {totalMyJobsPages}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); setMyJobsPage(p => Math.min(totalMyJobsPages, p + 1)); }}
                  className={myJobsPage === totalMyJobsPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* TAB 3: Completed Jobs */}
      {activeTab === "completed" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
          {filteredCompletedJobs.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
              ไม่มีประวัติการทำงาน
            </div>
          ) : (
            paginatedCompletedJobs.map((job) => (
              <div key={job.id} className="biz-card p-5 space-y-4 hover:border-slate-400 transition-all bg-muted">
                <div className="flex items-center justify-between opacity-80">
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-muted-foreground leading-snug">{job.location}</div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-muted-foreground">{job.acCode}</span>
                      <span className="rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                        {job.brand}
                      </span>
                    </div>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>

                <div className="pt-2 flex items-center justify-between text-xs border-t border-border text-muted-foreground">
                  <span className="text-[11px] font-bold text-success">เสร็จสิ้นแล้ว</span>
                  <span className="text-[10px] font-semibold">
                    {job.completedAt ? `เมื่อ: ${format(new Date(job.completedAt), "dd/MM/yyyy HH:mm")}` : ""}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "completed" && totalCompletedJobsPages > 1 && (
        <div className="py-4 mt-2">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); setCompletedJobsPage(p => Math.max(1, p - 1)); }} 
                  className={completedJobsPage === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="text-xs font-medium text-muted-foreground px-4">
                  หน้า {completedJobsPage} จาก {totalCompletedJobsPages}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); setCompletedJobsPage(p => Math.min(totalCompletedJobsPages, p + 1)); }}
                  className={completedJobsPage === totalCompletedJobsPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Modal: QR Code Scanner Simulator */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/40 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-border bg-white p-6 pb-10 sm:pb-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <QrCode className="h-4 w-4 text-foreground" />
                <span>สแกนรหัส QR เครื่องปรับอากาศ</span>
              </h3>
              <button onClick={() => setShowQrModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {!qrResult ? (
              <>
                <div className="relative h-40 w-full rounded-xl border-2 border-dashed border-border bg-muted flex flex-col items-center justify-center overflow-hidden">
                  <div className="absolute inset-x-0 h-0.5 bg-primary animate-laser" />
                  <QrCode className="h-12 w-12 text-muted-foreground animate-pulse" />
                  <span className="text-[11px] font-semibold text-muted-foreground mt-2">เล็งกล้องไปที่ QR Code</span>
                </div>
    
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-foreground">จำลองการสแกน:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={scannedAcCode}
                      onChange={(e) => setScannedAcCode(e.target.value)}
                      placeholder="e.g. PKRU-ENG-101-AC1"
                      className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-xs text-foreground font-mono focus:border-primary focus:outline-none"
                    />
                    <button
                      onClick={handleSimulateQrScan}
                      disabled={isPending}
                      className="rounded-xl bg-foreground px-4 py-2 text-xs font-bold text-white hover:bg-primary/90 shrink-0"
                    >
                      ยืนยัน
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4 animate-in zoom-in-95">
                <div className="bg-muted border border-border p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-mono text-lg font-bold text-foreground">{qrResult.acDetails.acCode}</div>
                      <div className="text-xs text-muted-foreground font-medium">{qrResult.acDetails.location}</div>
                    </div>
                    <span className="bg-accent text-foreground text-[10px] font-bold px-2 py-1 rounded-md">
                      {qrResult.acDetails.brand}
                    </span>
                  </div>
                  
                  <div className="border-t border-border pt-3 flex flex-col gap-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">สถานะล่าสุด:</span>
                      <span className="font-bold">{qrResult.acDetails.status === 'normal' ? '✅ ปกติ' : '⚠️ มีปัญหา'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ซ่อมบำรุงล่าสุด:</span>
                      <span className="font-semibold">{qrResult.acDetails.lastMaintenance ? format(new Date(qrResult.acDetails.lastMaintenance), "dd/MM/yyyy") : 'ไม่เคยซ่อมบำรุง'}</span>
                    </div>
                  </div>
                </div>
                
                {qrResult.pendingJobId ? (
                  <div className="bg-warning/10 border border-warning/30 p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-warning-foreground">มีใบงานค้างอยู่!</div>
                      <div className="text-[10px] text-warning-foreground">ต้องการรับงานนี้หรือไม่?</div>
                    </div>
                    <button 
                      onClick={handleClaimFromQr}
                      disabled={isPending}
                      className="bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-amber-700 shadow-sm"
                    >
                      รับงานทันที
                    </button>
                  </div>
                ) : (
                  <div className="bg-success/10 border border-success/30 p-3 rounded-xl">
                    <div className="text-xs font-bold text-success-foreground mb-2">ไม่พบใบงานแจ้งซ่อมค้างอยู่</div>
                    <button 
                      onClick={() => {
                        setToastMessage({type: 'success', text: 'สร้างใบงานบำรุงรักษาเรียบร้อย (จำลอง)'});
                        setShowQrModal(false);
                      }}
                      className="w-full bg-success text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-success/90 shadow-sm"
                    >
                      สร้างใบงาน PM ใหม่
                    </button>
                  </div>
                )}
                
                <button 
                  onClick={() => setQrResult(null)}
                  className="w-full border border-border bg-white text-foreground text-xs font-bold px-3 py-2 rounded-lg hover:bg-muted"
                >
                  สแกนเครื่องใหม่
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Action Logger Sheet */}
      {selectedJobForLog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/40 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-md max-h-[95vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-border bg-white p-6 pb-10 sm:pb-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground">บันทึกประวัติการซ่อม ({selectedJobForLog.acCode})</h3>
              <button onClick={() => setSelectedJobForLog(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleLogActionSubmit} className="space-y-4 text-xs">
              <input type="hidden" name="workOrderId" value={selectedJobForLog.id} />
              <input type="hidden" name="airConditionerId" value={selectedJobForLog.airConditionerId || ""} />

              <div>
                <label className="mb-2 block font-bold text-foreground">ประเภทการดำเนินการ <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-3 gap-2">
                  <div 
                    onClick={() => toggleAction("cleaning")}
                    className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center cursor-pointer transition-colors ${selectedActions.includes("cleaning") ? "border-slate-950 bg-secondary ring-1 ring-slate-950" : "border-border bg-muted hover:border-slate-400"}`}
                  >
                    <Sparkles className="h-4 w-4 text-foreground mb-1" />
                    <span className="font-bold text-foreground">ล้างแอร์</span>
                  </div>

                  <div 
                    onClick={() => toggleAction("repair")}
                    className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center cursor-pointer transition-colors ${selectedActions.includes("repair") ? "border-slate-950 bg-secondary ring-1 ring-slate-950" : "border-border bg-muted hover:border-slate-400"}`}
                  >
                    <Wrench className="h-4 w-4 text-foreground mb-1" />
                    <span className="font-bold text-foreground">ซ่อมแอร์</span>
                  </div>

                  <div 
                    onClick={() => toggleAction("refill_refrigerant")}
                    className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center cursor-pointer transition-colors ${selectedActions.includes("refill_refrigerant") ? "border-slate-950 bg-secondary ring-1 ring-slate-950" : "border-border bg-muted hover:border-slate-400"}`}
                  >
                    <Droplets className="h-4 w-4 text-foreground mb-1" />
                    <span className="font-bold text-foreground">เติมน้ำยาแอร์</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block font-bold text-foreground">รูปภาพหลักฐาน (ก่อนทำ/หลังทำ)</label>
                <div className="flex flex-col gap-3">
                  <div className="border border-border p-2 rounded-xl bg-muted">
                    <div className="text-[10px] font-bold text-muted-foreground mb-1">ภาพก่อนซ่อมบำรุง:</div>
                    <FileUpload 
                      maxFiles={1} 
                      className="w-full"
                      onFilesChange={(files) => setBeforePhotos(files)} 
                    />
                  </div>
                  <div className="border border-border p-2 rounded-xl bg-muted">
                    <div className="text-[10px] font-bold text-muted-foreground mb-1">ภาพหลังซ่อมบำรุง:</div>
                    <FileUpload 
                      maxFiles={1} 
                      className="w-full"
                      onFilesChange={(files) => setAfterPhotos(files)} 
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-bold text-foreground">สถานะแอร์หลังซ่อม <span className="text-red-500">*</span></label>
                  <NativeSelect name="acStatus" className="w-full h-auto py-2.5 px-3 rounded-xl border-border bg-muted text-xs font-bold text-foreground" required defaultValue="normal">
                    <NativeSelectOption value="normal">✅ ใช้งานได้ปกติ</NativeSelectOption>
                    <NativeSelectOption value="broken">⚠️ รออะไหล่/ใช้งานไม่ได้</NativeSelectOption>
                    <NativeSelectOption value="needs_cleaning">❄️ แอร์ไม่เย็น/รอตรวจสอบ</NativeSelectOption>
                  </NativeSelect>
                </div>
                <div>
                  <label className="mb-1 block font-bold text-foreground">รายละเอียดอะไหล่/น้ำยาแอร์</label>
                  <input
                    type="text"
                    name="parts"
                    placeholder="เช่น R32 10 ปอนด์"
                    className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-bold text-foreground">บันทึกเพิ่มเติม (ไม่บังคับ)</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="รายละเอียดอาการ หรือปัญหาที่พบ..."
                  className="w-full rounded-xl border border-border bg-muted px-3.5 py-2 text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedJobForLog(null)}
                  className="w-1/2 rounded-xl border border-border py-2.5 font-bold text-foreground hover:bg-secondary"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-1/2 rounded-xl bg-foreground py-2.5 font-bold text-white hover:bg-primary/90 disabled:opacity-50"
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

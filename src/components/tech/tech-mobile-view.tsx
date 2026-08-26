"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { claimWorkOrderAction, bulkClaimWorkOrdersAction, logMaintenanceAction, scanQrCodeAction } from "@/app/tech/actions";
import type { TechnicianAssetUnit, TechnicianAssetSummary } from "@/lib/maintenance";
import {
  Wrench,
  QrCode,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Clock,
  Snowflake,
  User,
} from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";
import { DashboardLayout, NavItem } from "@/components/layout/dashboard-layout";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { AssetsPanel } from "@/components/tech/assets-panel";
import { JobPoolPanel } from "@/components/tech/job-pool-panel";
import { MyJobsPanel } from "@/components/tech/my-jobs-panel";
import { CompletedJobsPanel } from "@/components/tech/completed-jobs-panel";
import { QrScanModal } from "@/components/tech/qr-scan-modal";
import { LogActionModal } from "@/components/tech/log-action-modal";
import { ProfilePanel } from "@/components/shared/profile-panel";
import { AcHistoryModal } from "@/components/admin/ac-history-modal";
import type { TechJobItem, Building } from "@/components/tech/types";

// Pulls in date-fns and its own markup — split out of the initial bundle
// since only the calendar tab needs it.
const MaintenanceCalendar = dynamic(
  () => import("@/components/shared/maintenance-calendar").then((m) => m.MaintenanceCalendar),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-card">
        <AnimatedIcon icon={Clock} size={24} animation="spin" className="text-primary" />
      </div>
    ),
  }
);

interface TechMobileViewProps {
  user: {
    id?: string;
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
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState<string>("all");

  // QR Scanner Modal State
  const [showQrModal, setShowQrModal] = useState(false);

  // Action Logger Modal State
  const [selectedJobForLog, setSelectedJobForLog] = useState<TechJobItem | null>(null);

  // History Modal State — opened from a card in the "ประวัติ" tab so a
  // technician can correct a log they recorded wrong. Same modal admin uses.
  const [historyAcId, setHistoryAcId] = useState<string | null>(null);

  // Scanning the QR sticker on the unit itself links here with ?ac=<acCode>
  // (see the QR page's "บันทึกงานซ่อมบำรุง" button) so the technician can go
  // straight to the log form instead of retyping the code through the
  // in-app scanner. pendingJobId becomes the workOrderId if one is already
  // open; otherwise the field is left blank and logMaintenanceAction creates
  // one automatically.
  useEffect(() => {
    const acCode = searchParams.get("ac");
    if (!acCode) return;

    // Strip the query param right away so refreshing the page or navigating
    // back doesn't re-trigger the scan.
    router.replace("/tech");

    scanQrCodeAction(acCode).then((res) => {
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setSelectedJobForLog({
        id: res.pendingJobId ?? "",
        acCode: res.acDetails.acCode,
        brand: res.acDetails.brand,
        btu: res.acDetails.btu,
        status: res.acDetails.status,
        location: res.acDetails.location,
        airConditionerId: res.acDetails.id,
      });
    });
    // Deliberately runs once for the ?ac= param present on initial load —
    // searchParams/router are stable-enough refs here and re-running this
    // after router.replace() strips the query string would just no-op, but
    // omitting them keeps the intent (run once on arrival) unambiguous.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleClaim(workOrderId: string) {
    startTransition(async () => {
      const res = await claimWorkOrderAction(workOrderId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("รับงานเรียบร้อยแล้ว! งานถูกย้ายไปที่แท็บ 'งานของฉัน'");
        setActiveTab("my_jobs");
      }
    });
  }

  function handleBulkClaim(workOrderIds: string[]): Promise<boolean> {
    return new Promise((resolve) => {
      startTransition(async () => {
        const res = await bulkClaimWorkOrdersAction(workOrderIds);
        if ("error" in res) {
          toast.error(res.error ?? "เกิดข้อผิดพลาดในการรับงานหลายรายการ");
          resolve(false);
          return;
        }
        toast.success(
          `รับงานสำเร็จ ${res.claimedCount} งาน${
            res.skippedCount > 0 ? ` (ข้าม ${res.skippedCount} งานที่ถูกรับไปแล้ว)` : ""
          } งานถูกย้ายไปที่แท็บ 'งานของฉัน'`
        );
        setActiveTab("my_jobs");
        resolve(true);
      });
    });
  }

  function handleLogActionSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await logMaintenanceAction(formData);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("บันทึกประวัติการซ่อมบำรุงและปิดงานสำเร็จ!");
        setSelectedJobForLog(null);
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
    {
      id: "calendar",
      label: "ปฏิทิน",
      icon: Calendar,
    },
    {
      id: "profile",
      label: "โปรไฟล์ของฉัน",
      icon: User,
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
             activeTab === "calendar" ? "ปฏิทินซ่อมบำรุง" :
             activeTab === "profile" ? "โปรไฟล์ของฉัน" :
             "ประวัติการทำงานของฉัน"}
          </h1>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <NativeSelect
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="w-full h-auto py-2 px-3 sm:w-auto rounded-xl border-border bg-card text-xs font-bold text-foreground shadow-sm"
          >
            <NativeSelectOption value="all">ทุกอาคาร</NativeSelectOption>
            {buildings.map(b => (
              <NativeSelectOption key={b.id} value={b.name}>{b.name}</NativeSelectOption>
            ))}
          </NativeSelect>

          <button
            onClick={() => setShowQrModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-md shrink-0"
          >
            <QrCode className="h-4 w-4 text-primary-foreground" />
            <span className="hidden sm:inline">สแกน QR Code</span>
          </button>
        </div>
      </div>

      {/* TAB 0: All Assets */}
      {activeTab === "assets" && (
        <AssetsPanel
          assetList={assetList}
          assetSummary={assetSummary}
          searchQuery={searchQuery}
          selectedBuilding={selectedBuilding}
        />
      )}

      {/* TAB 1: Job Pool */}
      {activeTab === "pool" && (
        <JobPoolPanel
          jobPool={jobPool}
          searchQuery={searchQuery}
          selectedBuilding={selectedBuilding}
          isPending={isPending}
          onClaim={handleClaim}
          onBulkClaim={handleBulkClaim}
        />
      )}

      {/* TAB 2: My Jobs */}
      {activeTab === "my_jobs" && (
        <MyJobsPanel
          myJobs={myJobs}
          searchQuery={searchQuery}
          selectedBuilding={selectedBuilding}
          onSelectForLog={setSelectedJobForLog}
        />
      )}

      {/* TAB 3: Completed Jobs */}
      {activeTab === "completed" && (
        <CompletedJobsPanel
          completedJobs={completedJobs}
          searchQuery={searchQuery}
          selectedBuilding={selectedBuilding}
          onViewHistory={setHistoryAcId}
        />
      )}

      {/* TAB 4: Maintenance Calendar */}
      {activeTab === "calendar" && (
        <div className="animate-in fade-in">
          <MaintenanceCalendar />
        </div>
      )}

      {/* TAB 5: My Profile */}
      {activeTab === "profile" && (
        <ProfilePanel
          profile={{ name: user.name ?? "", email: user.email ?? "", role: user.role, phone: null }}
          universityName={universityName}
          showPhone={false}
        />
      )}

      {/* Modal: QR Code Scanner Simulator */}
      <QrScanModal
        open={showQrModal}
        isPending={isPending}
        onClose={() => setShowQrModal(false)}
        onClaim={handleClaim}
        onPlaceholderCreated={() => {
          toast.success("สร้างใบงานบำรุงรักษาเรียบร้อย (จำลอง)");
          setShowQrModal(false);
        }}
        onScanError={(message) => toast.error(message)}
      />

      {/* Modal: Action Logger Sheet */}
      <LogActionModal
        job={selectedJobForLog}
        isPending={isPending}
        onClose={() => setSelectedJobForLog(null)}
        onSubmit={handleLogActionSubmit}
        onValidationError={(message) => toast.error(message)}
      />

      {/* Modal: Maintenance History (view + edit own logs) */}
      {historyAcId && (
        <AcHistoryModal
          airConditionerId={historyAcId}
          currentUserId={user.id}
          onClose={() => setHistoryAcId(null)}
        />
      )}
    </DashboardLayout>
  );
}

"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { claimWorkOrderAction, bulkClaimWorkOrdersAction, logMaintenanceAction } from "@/app/tech/actions";
import type { TechnicianAssetUnit, TechnicianAssetSummary } from "@/lib/maintenance";
import {
  Wrench,
  QrCode,
  ClipboardList,
  CheckCircle2,
  X,
  AlertTriangle,
  Calendar,
  Clock,
  Snowflake,
} from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import {
  Alert,
  AlertTitle,
  AlertDescription,
  AlertAction,
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
import type { TechJobItem, Building } from "@/components/tech/types";

// Pulls in date-fns and its own markup — split out of the initial bundle
// since only the calendar tab needs it.
const MaintenanceCalendar = dynamic(
  () => import("@/components/shared/maintenance-calendar").then((m) => m.MaintenanceCalendar),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-white">
        <AnimatedIcon icon={Clock} size={24} animation="spin" className="text-primary" />
      </div>
    ),
  }
);

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

  function handleBulkClaim(workOrderIds: string[]): Promise<boolean> {
    setToastMessage(null);
    return new Promise((resolve) => {
      startTransition(async () => {
        const res = await bulkClaimWorkOrdersAction(workOrderIds);
        if ("error" in res) {
          setToastMessage({ type: "error", text: res.error ?? "เกิดข้อผิดพลาดในการรับงานหลายรายการ" });
          resolve(false);
          return;
        }
        setToastMessage({
          type: "success",
          text: `รับงานสำเร็จ ${res.claimedCount} งาน${
            res.skippedCount > 0 ? ` (ข้าม ${res.skippedCount} งานที่ถูกรับไปแล้ว)` : ""
          } งานถูกย้ายไปที่แท็บ 'งานของฉัน'`,
        });
        setActiveTab("my_jobs");
        resolve(true);
      });
    });
  }

  function handleLogActionSubmit(formData: FormData) {
    setToastMessage(null);
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
             activeTab === "calendar" ? "ปฏิทินซ่อมบำรุง" :
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
        />
      )}

      {/* TAB 4: Maintenance Calendar */}
      {activeTab === "calendar" && (
        <div className="animate-in fade-in">
          <MaintenanceCalendar />
        </div>
      )}

      {/* Modal: QR Code Scanner Simulator */}
      <QrScanModal
        open={showQrModal}
        isPending={isPending}
        onClose={() => setShowQrModal(false)}
        onClaim={handleClaim}
        onPlaceholderCreated={() => {
          setToastMessage({ type: "success", text: "สร้างใบงานบำรุงรักษาเรียบร้อย (จำลอง)" });
          setShowQrModal(false);
        }}
        onScanError={(message) => setToastMessage({ type: "error", text: message })}
      />

      {/* Modal: Action Logger Sheet */}
      <LogActionModal
        job={selectedJobForLog}
        isPending={isPending}
        onClose={() => setSelectedJobForLog(null)}
        onSubmit={handleLogActionSubmit}
        onValidationError={(message) => setToastMessage({ type: "error", text: message })}
      />
    </DashboardLayout>
  );
}

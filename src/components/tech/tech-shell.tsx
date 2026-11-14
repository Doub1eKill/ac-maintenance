"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { QrCode, Snowflake, ClipboardList, Wrench, CheckCircle2, Calendar, User, BookMarked } from "lucide-react";
import { DashboardLayout, NavItem } from "@/components/layout/dashboard-layout";
import type { SearchEntry } from "@/lib/search";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { QrScanModal, type QrScanResult } from "@/components/tech/qr-scan-modal";
import { LogActionModal } from "@/components/tech/log-action-modal";
import { TechBottomNav } from "@/components/tech/tech-bottom-nav";
import { AcHistoryModal } from "@/components/admin/ac-history-modal";
import { MotionFade } from "@/components/ui/motion";
import { motion } from "motion/react";
import {
  claimWorkOrderAction,
  getTechSearchIndexAction,
  logMaintenanceAction,
  scanQrCodeAction,
} from "@/app/tech/actions";
import type { Building, TechJobItem } from "@/components/tech/types";

/**
 * The chrome and the modals shared by every technician page.
 *
 * tech-mobile-view.tsx used to be all of this plus the six screens themselves,
 * switching between them with a useState. What is left here is only what is
 * genuinely shared: the sidebar, the page title, the two filters, and the three
 * modals that can be opened from more than one page — the QR scanner (header
 * button, present everywhere), the log form (from "งานของฉัน" and from scanning
 * a sticker), and the history viewer.
 */
interface TechFiltersValue {
  search: string;
  building: string;
  isPending: boolean;
  openLogFor: (job: TechJobItem) => void;
  openHistoryFor: (airConditionerId: string) => void;
  claim: (workOrderId: string) => void;
  // The banner's action row, for a page to add its own button beside
  // "สแกน QR Code" (through a portal) rather than floating one under the
  // banner. null until the banner has mounted.
  pageActionsSlot: HTMLElement | null;
}

const TechFiltersContext = createContext<TechFiltersValue>({
  search: "",
  building: "all",
  isPending: false,
  openLogFor: () => {},
  openHistoryFor: () => {},
  claim: () => {},
  pageActionsSlot: null,
});

export function useTechFilters() {
  return useContext(TechFiltersContext);
}

/**
 * The log form wants a job; a scan produces a unit. This is the bridge, used
 * both by the ?ac= arrival from the public QR page and by the in-app scanner
 * when the unit has no open job — the two ways a technician reaches the form
 * for work nobody has reported yet.
 */
function jobFromScan(res: QrScanResult): TechJobItem {
  return {
    id: res.pendingJobId ?? "",
    acCode: res.acDetails.acCode,
    brand: res.acDetails.brand,
    brandDeleted: res.acDetails.brandDeleted,
    modelDeleted: res.acDetails.modelDeleted,
    btu: res.acDetails.btu,
    status: res.acDetails.status,
    location: res.acDetails.location,
    // The scan result has no building or room of its own to group under,
    // so the room line is the full location here.
    roomLocation: res.acDetails.location,
    roomId: "",
    roomName: "",
    floor: null,
    // scanQrCodeAction does not return a building — this synthetic job only
    // feeds the log form, which does not group by building.
    buildingId: "",
    buildingName: "",
    airConditionerId: res.acDetails.id,
  };
}

const PAGE_TITLES: Record<string, string> = {
  "/tech": "งานซ่อมบำรุงที่รอรับ",
  "/tech/my-jobs": "งานที่ฉันกำลังดำเนินการ",
  "/tech/history": "ประวัติการทำงานของฉัน",
  "/tech/assets": "เครื่องปรับอากาศทั้งหมด",
  "/tech/calendar": "ปฏิทินซ่อมบำรุง",
  "/tech/profile": "โปรไฟล์ของฉัน",
};

export interface TechShellProps {
  user: {
    id?: string | null;
    name?: string | null;
    email?: string | null;
    role?: string | null;
    avatarUrl?: string | null;
  };
  universityName: string;
  buildings: Building[];
  badges: { jobPool: number; myJobs: number };
  children: React.ReactNode;
}

export function TechShell({ user, universityName, buildings, badges, children }: TechShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [building, setBuilding] = useState("all");
  const [showQrModal, setShowQrModal] = useState(false);
  const [jobForLog, setJobForLog] = useState<TechJobItem | null>(null);
  const [historyAcId, setHistoryAcId] = useState<string | null>(null);
  // Set from the slot's callback ref once it exists, so a page rendering
  // into it never has to wait for an effect.
  const [pageActionsSlot, setPageActionsSlot] = useState<HTMLElement | null>(null);

  // Both filters reset when the page changes, for the reason the admin search
  // does: each list searches different text, so a term left over from the
  // previous page usually matches nothing on the next one. The exception is a
  // suggestion for a building or a room, which links to /tech/assets?q=<term>
  // so the page it lands on arrives already narrowed by that same filter.
  //
  // The reset is keyed off a remembered path rather than off the effect firing,
  // because stripping ?q= below changes searchParams and runs this again — and
  // an unconditional reset would then wipe the filter the same suggestion had
  // just applied, which is exactly what a suggestion picked while already on
  // the asset list did.
  // Applied during render (React's "adjust state on change" form), so the
  // page that renders with the new path already has its filters right; only
  // the URL rewrite, a side effect, waits for the effect below.
  const term = searchParams.get("q");
  const [applied, setApplied] = useState<{ path: string; term: string | null }>({ path: pathname, term: null });
  if (term && (applied.term !== term || applied.path !== pathname)) {
    setApplied({ path: pathname, term });
    setSearch(term);
    setBuilding("all");
  } else if (!term && applied.path !== pathname) {
    setApplied({ path: pathname, term: null });
    setSearch("");
    setBuilding("all");
  }

  useEffect(() => {
    // Stripped straight away, like the ?ac= handler below, so a refresh or a
    // back navigation does not re-apply a filter the user has since cleared.
    if (term) router.replace(pathname);
  }, [term, pathname, router]);

  // Scanning the sticker on a unit links to /tech?ac=<acCode> (see the QR
  // page's button), so the technician lands straight on the log form instead of
  // retyping the code into the in-app scanner.
  useEffect(() => {
    const acCode = searchParams.get("ac");
    if (!acCode) return;

    // Strip the param immediately so a refresh or a back navigation does not
    // re-trigger the scan.
    router.replace(pathname);

    scanQrCodeAction(acCode).then((res) => {
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setJobForLog(jobFromScan(res));
    });
    // Runs once for the ?ac= present on arrival; after router.replace() strips
    // it, re-running would no-op anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const claim = useCallback(
    (workOrderId: string) => {
      startTransition(async () => {
        const res = await claimWorkOrderAction(workOrderId);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success("รับงานเรียบร้อยแล้ว งานถูกย้ายไปที่หน้างานของฉัน");
          router.push("/tech/my-jobs");
        }
      });
    },
    [router]
  );

  // Claim, then open the log form for the same job. The claim is the same
  // status=pending guarded update the pool uses, so a job another technician
  // took a moment earlier is refused rather than logged twice; on success the
  // form opens with the job id, and saving it closes the job.
  const claimAndLog = useCallback(
    (res: QrScanResult) => {
      const workOrderId = res.pendingJobId;
      if (!workOrderId) return;
      startTransition(async () => {
        const claimed = await claimWorkOrderAction(workOrderId);
        if (claimed.error) {
          toast.error(claimed.error);
          return;
        }
        toast.success("รับงานแล้ว — บันทึกผลงานได้เลย");
        setJobForLog(jobFromScan(res));
        // The pool and "งานของฉัน" badges move with the claim.
        router.refresh();
      });
    },
    [router]
  );

  function handleLogSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await logMaintenanceAction(formData);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("บันทึกประวัติการซ่อมบำรุงและปิดงานสำเร็จ");
        setJobForLog(null);
      }
    });
  }

  const navItems: NavItem[] = [
    { id: "assets", label: "แอร์ทั้งหมด", icon: Snowflake, group: "เมนูทั่วไป", href: "/tech/assets" },
    { id: "pool", label: "งานทั้งหมด", icon: ClipboardList, badge: badges.jobPool, group: "เมนูทั่วไป", href: "/tech" },
    { id: "my_jobs", label: "งานของฉัน", icon: Wrench, badge: badges.myJobs, group: "เมนูทั่วไป", href: "/tech/my-jobs" },
    { id: "completed", label: "ประวัติ", icon: CheckCircle2, group: "เมนูทั่วไป", href: "/tech/history" },
    { id: "calendar", label: "ปฏิทิน", icon: Calendar, group: "เมนูทั่วไป", href: "/tech/calendar" },
    { id: "catalogue", label: "ยี่ห้อ/รุ่นแอร์", icon: BookMarked, group: "เมนูทั่วไป", href: "/tech/catalogue" },
    { id: "profile", label: "โปรไฟล์ของฉัน", icon: User, group: "เมนูทั่วไป", href: "/tech/profile" },
  ];

  const showFilters = pathname !== "/tech/calendar" && pathname !== "/tech/profile";

  // The menu itself is searchable, which is what the browser's own address bar
  // does with bookmarks. Built from navItems rather than a second list, so a
  // page added to the sidebar becomes findable without anyone remembering to
  // register it twice.
  const loadSearchIndex = useCallback(async () => {
    const pages: SearchEntry[] = navItems.map((item) => ({
      type: "page" as const,
      id: item.id,
      label: item.label,
      hint: "เมนูในระบบ",
      href: item.href,
    }));

    return [...(await getTechSearchIndexAction()), ...pages];
    // navItems is rebuilt every render but its contents only change with the
    // badge counts, which do not affect what this returns.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <TechFiltersContext.Provider
      value={{
        search,
        building,
        isPending,
        openLogFor: setJobForLog,
        openHistoryFor: setHistoryAcId,
        claim,
        pageActionsSlot,
      }}
    >
      <DashboardLayout
        user={{ name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl, universityName }}
        navItems={navItems}
        searchValue={search}
        onSearchChange={showFilters ? setSearch : undefined}
        searchPlaceholder="ค้นหารหัสแอร์..."
        searchIndexLoader={loadSearchIndex}
        // A unit opens its history where the technician already is — the
        // question behind typing a code into the header is almost always "what
        // has been done to this one", and the modal answers it without losing
        // the page underneath. Everything else carries a destination.
        onSearchPick={(entry) => {
          if (entry.href) {
            router.push(entry.href);
            return;
          }
          setHistoryAcId(entry.id);
        }}
        onCreateAction={() => setShowQrModal(true)}
        createActionLabel="สแกน QR Code"
        createActionIcon={QrCode}
      >
        <div className="biz-banner p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
          <div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              พื้นที่ปฏิบัติงานช่างเทคนิค
            </div>
            <h1 className="text-xl font-bold text-foreground mt-1">
              {PAGE_TITLES[pathname] ?? "พื้นที่ปฏิบัติงาน"}
            </h1>
          </div>

          {/* A page's own action sits beside the filter and the scan button on
              a wide screen, and on a row of its own under them on a phone. */}
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:shrink-0 sm:flex-row sm:items-center">
          {/* Where a page puts that action; empty on pages that have none. */}
          <div ref={setPageActionsSlot} className="contents" />
          <div className="flex gap-2 w-full sm:w-auto">
            {showFilters && (
              <NativeSelect
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                aria-label="กรองตามอาคาร"
                className="w-full h-auto py-2 px-3 sm:w-auto rounded-xl border-border bg-card text-xs font-bold text-foreground shadow-sm"
              >
                <NativeSelectOption value="all">ทุกอาคาร</NativeSelectOption>
                {buildings.map((b) => (
                  <NativeSelectOption key={b.id} value={b.name}>
                    {b.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setShowQrModal(true)}
              aria-label="สแกน QR Code"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-md shrink-0 cursor-pointer"
            >
              <QrCode className="h-4 w-4 text-primary-foreground" />
              <span className="hidden sm:inline">สแกน QR Code</span>
            </motion.button>
          </div>
          </div>
        </div>

        <MotionFade key={pathname} className="pb-20 md:pb-0">
          {children}
        </MotionFade>

        <TechBottomNav
          badges={badges}
          onScanQr={() => setShowQrModal(true)}
        />

        <QrScanModal
          open={showQrModal}
          isPending={isPending}
          onClose={() => setShowQrModal(false)}
          onClaim={claim}
          onClaimAndLog={claimAndLog}
          onLogWork={(res) => setJobForLog(jobFromScan(res))}
          onViewHistory={setHistoryAcId}
          onScanError={(message) => toast.error(message)}
        />

        <LogActionModal
          job={jobForLog}
          isPending={isPending}
          onClose={() => setJobForLog(null)}
          onSubmit={handleLogSubmit}
          onValidationError={(message) => toast.error(message)}
        />

        {historyAcId && (
          <AcHistoryModal
            airConditionerId={historyAcId}
            currentUserId={user.id ?? undefined}
            onClose={() => setHistoryAcId(null)}
          />
        )}
      </DashboardLayout>
    </TechFiltersContext.Provider>
  );
}

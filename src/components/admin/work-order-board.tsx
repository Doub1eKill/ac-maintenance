"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Ban, CheckCircle2, ClipboardList, Clock, Loader2, Sparkles, Wrench } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { getWorkOrdersPage } from "@/app/admin/actions";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { WorkOrderItem, WorkOrderPageInfo, BuildingItem } from "@/components/admin/types";

interface WorkOrderBoardProps {
  workOrders: WorkOrderItem[];
  workOrderPage: WorkOrderPageInfo;
  buildings: BuildingItem[];
  globalSearch: string;
  onOpenDetails: (workOrder: WorkOrderItem) => void;
  onAssign: (workOrderId: string) => void;
}

type StatusFilter = "" | "pending" | "claimed" | "completed" | "cancelled";

const STATUS_FILTER_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: "", label: "ทุกสถานะ" },
  { value: "pending", label: "รอดำเนินการ" },
  { value: "claimed", label: "กำลังดำเนินการ" },
  { value: "completed", label: "เสร็จสิ้น" },
  { value: "cancelled", label: "ยกเลิกแล้ว" },
];

// Cache key combining page, search term and the two filters — any one of
// them changing needs its own set of pages, so keying by page alone would
// show one combination's rows under another's number.
function pageCacheKey(page: number, search: string, status: StatusFilter, buildingId: string) {
  return `${search}::${status}::${buildingId}::${page}`;
}

function getWorkOrderRowClassName(wo: WorkOrderItem) {
  // No status color separately here — the "สถานะ" column already carries a
  // labeled badge (icon + text) for that, and a second, unlabeled colored
  // strip repeating the same information read as unexplained decoration
  // rather than a second signal.

  // Low-opacity token tints rather than literal bg-red-50/bg-orange-50 —
  // those stay near-white regardless of theme, which reads fine against
  // light-mode's white table but washes the token-colored text out (or
  // just looks like a stray light patch) once the row itself goes dark.
  const tintClass =
    wo.priority === "critical" ? "bg-destructive/10" :
    wo.priority === "high" ? "bg-warning/10" :
    "";

  const fadeClass = wo.status === "completed" ? "opacity-60" : "";

  return `${tintClass} ${fadeClass}`.trim();
}

export function WorkOrderBoard({ workOrders, workOrderPage, buildings, globalSearch, onOpenDetails, onAssign }: WorkOrderBoardProps) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [buildingFilter, setBuildingFilter] = useState("");
  // Debounced so typing doesn't fire a query per keystroke — the board only
  // searches once the user pauses for 300ms.
  const [debouncedSearch, setDebouncedSearch] = useState(globalSearch.trim());
  // Empty search + page 1 always comes from the dashboard's own load
  // (getOrgAdminData()) so it renders instantly; every other page/search
  // combination is fetched on demand via getWorkOrdersPage() and cached here,
  // keyed by both so switching back to a term already searched doesn't refetch.
  const [pagesLoaded, setPagesLoaded] = useState<Map<string, WorkOrderItem[]>>(new Map());
  // total/hasMore for the active search — null means "not searching", so the
  // board falls back to workOrderPage (the unfiltered count from the parent).
  const [searchPageInfo, setSearchPageInfo] = useState<{ total: number; hasMore: boolean } | null>(null);
  const [isLoadingPage, startPageTransition] = useTransition();
  const [pageError, setPageError] = useState<string | null>(null);
  // Guards against an older, slower request overwriting the total/error left
  // by a newer one that already resolved — keyed rather than boolean because
  // page and search can each change independently.
  const latestRequestKeyRef = useRef<string | null>(null);

  // The dashboard revalidates and hands down a fresh `workOrders` array after
  // any action that changes a work order (assign, claim, complete, create).
  // Drop the cache and jump back to page 1 so the board never shows a stale
  // status next to a freshly-mutated row on some other cached page — the
  // fetch effect below re-requests whatever page/search is current once the
  // cache is empty.
  useEffect(() => {
    setPagesLoaded(new Map());
    setSearchPageInfo(null);
    setPage(1);
    setPageError(null);
  }, [workOrders]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(globalSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [globalSearch]);

  useEffect(() => {
    setPage(1);
  }, [globalSearch, statusFilter, buildingFilter]);

  // Whether any filter narrows the result away from the dashboard's own
  // unfiltered first page — once true, page 1 has to be fetched like any
  // other page instead of reusing the `workOrders` prop.
  const isFiltered = debouncedSearch !== "" || statusFilter !== "" || buildingFilter !== "";

  useEffect(() => {
    const key = pageCacheKey(page, debouncedSearch, statusFilter, buildingFilter);
    latestRequestKeyRef.current = key;

    // The dashboard's own first page covers this combination already.
    if (!isFiltered && page === 1) {
      setPageError(null);
      return;
    }

    if (pagesLoaded.has(key)) return;

    setPageError(null);
    startPageTransition(async () => {
      const result = await getWorkOrdersPage(page, {
        search: debouncedSearch,
        status: statusFilter || undefined,
        buildingId: buildingFilter || undefined,
      });
      // A newer page or search request landed and already updated the view —
      // this response answers a question nobody's asking anymore.
      if (latestRequestKeyRef.current !== key) return;

      if ("error" in result && result.error) {
        setPageError(result.error);
        return;
      }
      setPagesLoaded((prev) => new Map(prev).set(key, result.workOrders));
      setSearchPageInfo({ total: result.total, hasMore: result.hasMore });
    });
  }, [page, debouncedSearch, statusFilter, buildingFilter, pagesLoaded, isFiltered]);

  const currentPageRows =
    !isFiltered && page === 1
      ? workOrders
      : pagesLoaded.get(pageCacheKey(page, debouncedSearch, statusFilter, buildingFilter)) ?? [];

  const effectiveTotal = !isFiltered ? workOrderPage.total : searchPageInfo?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / workOrderPage.pageSize));

  function goToPage(target: number) {
    const clamped = Math.max(1, Math.min(totalPages, target));
    setPage(clamped);
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" /> ระบบจัดการงานซ่อมบำรุง
        </h2>
        <div className="text-sm text-muted-foreground font-medium">
          ทั้งหมด <span className="font-bold text-foreground">{effectiveTotal}</span> รายการ
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="w-full sm:w-48">
          <NativeSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            aria-label="กรองตามสถานะ"
          >
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <NativeSelectOption key={opt.value} value={opt.value}>
                {opt.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="w-full sm:w-56">
          <NativeSelect
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            aria-label="กรองตามอาคาร"
          >
            <NativeSelectOption value="">ทุกอาคาร</NativeSelectOption>
            {buildings.map((b) => (
              <NativeSelectOption key={b.id} value={b.id}>
                {b.name} ({b.abbreviation})
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">รหัสแอร์</th>
                <th className="px-4 py-3">สถานที่ตั้ง / ยี่ห้อ</th>
                <th className="px-4 py-3 whitespace-nowrap">ประเภทงาน</th>
                <th className="px-4 py-3 whitespace-nowrap">วันที่แจ้ง</th>
                <th className="px-4 py-3 whitespace-nowrap">ผู้รับผิดชอบ</th>
                <th className="px-4 py-3 whitespace-nowrap text-center">สถานะ</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoadingPage ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">
                    <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> กำลังโหลดหน้า {page}...
                  </td>
                </tr>
              ) : pageError ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-destructive">
                    {pageError}
                  </td>
                </tr>
              ) : currentPageRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    ไม่พบข้อมูลใบงาน
                  </td>
                </tr>
              ) : (
                currentPageRows.map((wo) => (
                  <tr
                    key={wo.id}
                    className={`hover:bg-muted transition-colors cursor-pointer ${getWorkOrderRowClassName(wo)}`}
                    onClick={() => onOpenDetails(wo)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap font-mono font-bold text-base text-foreground">
                      {wo.acCode}
                    </td>
                    <td className="px-4 py-3 max-w-[190px]">
                      <div className="font-medium text-foreground">{wo.location}</div>
                      <div className="text-xs text-muted-foreground">
                        {wo.brand} {wo.btu ? `(${wo.btu} BTU)` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {wo.type === "repair" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20">
                          <Wrench className="h-3 w-3" />
                          งานซ่อม
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/10 text-sky-600 border border-sky-500/20">
                          <Sparkles className="h-3 w-3" />
                          งานล้างแอร์
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {wo.createdAt ? new Date(wo.createdAt).toLocaleDateString("th-TH") : "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {wo.claimedByName ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                            {wo.claimedByName.charAt(0)}
                          </div>
                          <span className="font-medium text-foreground">{wo.claimedByName}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      {wo.status === "pending" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-warning/20 text-warning-foreground border border-warning/30">
                          <Clock className="h-3 w-3" />
                          รอดำเนินการ
                        </span>
                      )}
                      {wo.status === "claimed" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/20 text-primary border border-primary/30">
                          <Wrench className="h-3 w-3" />
                          กำลังดำเนินการ
                        </span>
                      )}
                      {wo.status === "completed" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-success/20 text-success-foreground border border-success/30">
                          <CheckCircle2 className="h-3 w-3" />
                          เสร็จสิ้น
                        </span>
                      )}
                      {wo.status === "cancelled" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-muted text-muted-foreground border border-border">
                          <Ban className="h-3 w-3" />
                          ยกเลิกแล้ว
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      {wo.status === "pending" ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAssign(wo.id);
                          }}
                          className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-bold text-primary bg-primary/10 border border-primary/30 rounded-lg hover:bg-primary/20 transition-colors"
                        >
                          จ่ายงาน
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); onOpenDetails(wo); }}
                          className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-bold text-foreground bg-secondary border border-border rounded-lg hover:bg-secondary/80 transition-colors"
                        >
                          ดูรายละเอียด
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-border bg-muted flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              หน้า {page} จาก {totalPages}
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => goToPage(page - 1)}
                    className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>

                {[...Array(totalPages)].map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      onClick={() => goToPage(i + 1)}
                      isActive={page === i + 1}
                      className="cursor-pointer"
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => goToPage(page + 1)}
                    className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  );
}

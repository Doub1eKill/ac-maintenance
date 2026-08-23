"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, ClipboardList, Clock, Loader2, MoreVertical, Wrench } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { getWorkOrdersPage } from "@/app/admin/actions";
import type { WorkOrderItem, WorkOrderPageInfo } from "@/components/admin/types";

interface WorkOrderBoardProps {
  workOrders: WorkOrderItem[];
  workOrderPage: WorkOrderPageInfo;
  globalSearch: string;
  onOpenDetails: (workOrder: WorkOrderItem) => void;
  onAssign: (workOrderId: string) => void;
}

function matchesSearch(wo: WorkOrderItem, search: string) {
  if (!search.trim()) return true;
  const s = search.toLowerCase();
  return (
    wo.acCode.toLowerCase().includes(s) ||
    wo.brand.toLowerCase().includes(s) ||
    wo.location.toLowerCase().includes(s) ||
    (!!wo.claimedByName && wo.claimedByName.toLowerCase().includes(s))
  );
}

function getWorkOrderRowClassName(wo: WorkOrderItem) {
  const borderClass =
    wo.status === "pending" ? "border-l-warning" :
    wo.status === "claimed" ? "border-l-primary" :
    wo.status === "completed" ? "border-l-success" :
    "border-l-transparent";

  const tintClass =
    wo.priority === "critical" ? "bg-red-50/60" :
    wo.priority === "high" ? "bg-orange-50/40" :
    "";

  const fadeClass = wo.status === "completed" ? "opacity-60" : "";

  return `border-l-4 ${borderClass} ${tintClass} ${fadeClass}`.trim();
}

export function WorkOrderBoard({ workOrders, workOrderPage, globalSearch, onOpenDetails, onAssign }: WorkOrderBoardProps) {
  const [page, setPage] = useState(1);
  // Page 1 always comes from the dashboard's own load (getOrgAdminData()) so
  // it renders instantly; every other page is fetched on demand via
  // getWorkOrdersPage() and cached here so flipping back doesn't refetch.
  const [pagesLoaded, setPagesLoaded] = useState<Map<number, WorkOrderItem[]>>(() => new Map([[1, workOrders]]));
  const [isLoadingPage, startPageTransition] = useTransition();
  const [pageError, setPageError] = useState<string | null>(null);

  // The dashboard revalidates and hands down a fresh `workOrders` array after
  // any action that changes a work order (assign, claim, complete, create).
  // Drop the cache and jump back to page 1 so the board never shows a stale
  // status next to a freshly-mutated row on some other cached page.
  useEffect(() => {
    setPagesLoaded(new Map([[1, workOrders]]));
    setPage(1);
    setPageError(null);
  }, [workOrders]);

  useEffect(() => {
    setPage(1);
  }, [globalSearch]);

  const totalPages = Math.max(1, Math.ceil(workOrderPage.total / workOrderPage.pageSize));
  const currentPageRows = pagesLoaded.get(page) ?? [];
  const filteredWorkOrders = currentPageRows.filter((wo) => matchesSearch(wo, globalSearch));

  function goToPage(target: number) {
    const clamped = Math.max(1, Math.min(totalPages, target));
    if (clamped === page) return;
    setPage(clamped);

    if (pagesLoaded.has(clamped)) return;

    setPageError(null);
    startPageTransition(async () => {
      const result = await getWorkOrdersPage(clamped);
      if ("error" in result && result.error) {
        setPageError(result.error);
        return;
      }
      setPagesLoaded((prev) => new Map(prev).set(clamped, result.workOrders));
    });
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" /> ระบบจัดการงานซ่อมบำรุง
        </h2>
        <div className="text-sm text-muted-foreground font-medium">
          ทั้งหมด <span className="font-bold text-foreground">{workOrderPage.total}</span> รายการ
          {globalSearch.trim() && (
            <>
              {" "}
              · พบ <span className="font-bold text-foreground">{filteredWorkOrders.length}</span> รายการในหน้านี้
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">รหัสแอร์</th>
                <th className="px-6 py-4 whitespace-nowrap">สถานที่ตั้ง / ยี่ห้อ</th>
                <th className="px-6 py-4 whitespace-nowrap">วันที่แจ้ง</th>
                <th className="px-6 py-4 whitespace-nowrap">ผู้รับผิดชอบ</th>
                <th className="px-6 py-4 whitespace-nowrap text-center">สถานะ</th>
                <th className="px-6 py-4 whitespace-nowrap text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingPage ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                    <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> กำลังโหลดหน้า {page}...
                  </td>
                </tr>
              ) : pageError ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-destructive">
                    {pageError}
                  </td>
                </tr>
              ) : filteredWorkOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    ไม่พบข้อมูลใบงาน
                  </td>
                </tr>
              ) : (
                filteredWorkOrders.map((wo) => (
                  <tr
                    key={wo.id}
                    className={`hover:bg-muted transition-colors cursor-pointer ${getWorkOrderRowClassName(wo)}`}
                    onClick={() => onOpenDetails(wo)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-base text-foreground">
                      {wo.acCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-foreground">{wo.location}</div>
                      <div className="text-xs text-muted-foreground">
                        {wo.brand} {wo.btu ? `(${wo.btu} BTU)` : ""}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                      {wo.createdAt ? new Date(wo.createdAt).toLocaleDateString("th-TH") : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {wo.claimedByName ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                            {wo.claimedByName.charAt(0)}
                          </div>
                          <span className="font-medium text-foreground">{wo.claimedByName}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
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
                          className="inline-flex items-center justify-center p-1.5 text-muted-foreground hover:text-muted-foreground rounded-lg hover:bg-secondary transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
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

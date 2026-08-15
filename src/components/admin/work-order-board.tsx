"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardList, Clock, MoreVertical, Wrench } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { WorkOrderItem } from "@/components/admin/types";

interface WorkOrderBoardProps {
  workOrders: WorkOrderItem[];
  globalSearch: string;
  onOpenDetails: (workOrder: WorkOrderItem) => void;
  onAssign: (workOrderId: string) => void;
}

const ITEMS_PER_PAGE = 10;

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

export function WorkOrderBoard({ workOrders, globalSearch, onOpenDetails, onAssign }: WorkOrderBoardProps) {
  const [workOrdersPage, setWorkOrdersPage] = useState(1);

  useEffect(() => {
    setWorkOrdersPage(1);
  }, [globalSearch]);

  const filteredWorkOrders = workOrders.filter((wo) => matchesSearch(wo, globalSearch));
  const totalWorkOrdersPages = Math.ceil(filteredWorkOrders.length / ITEMS_PER_PAGE);
  const paginatedWorkOrders = filteredWorkOrders.slice(
    (workOrdersPage - 1) * ITEMS_PER_PAGE,
    workOrdersPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" /> ระบบจัดการงานซ่อมบำรุง
        </h2>
        <div className="text-sm text-muted-foreground font-medium">
          พบใบงานทั้งหมด <span className="font-bold text-foreground">{filteredWorkOrders.length}</span> รายการ
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
              {paginatedWorkOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    ไม่พบข้อมูลใบงาน
                  </td>
                </tr>
              ) : (
                paginatedWorkOrders.map((wo) => (
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
        {totalWorkOrdersPages > 1 && (
          <div className="px-6 py-4 border-t border-border bg-muted flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              หน้า {workOrdersPage} จาก {totalWorkOrdersPages}
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setWorkOrdersPage((p) => Math.max(1, p - 1))}
                    className={workOrdersPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>

                {[...Array(totalWorkOrdersPages)].map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      onClick={() => setWorkOrdersPage(i + 1)}
                      isActive={workOrdersPage === i + 1}
                      className="cursor-pointer"
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => setWorkOrdersPage((p) => Math.min(totalWorkOrdersPages, p + 1))}
                    className={workOrdersPage === totalWorkOrdersPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
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

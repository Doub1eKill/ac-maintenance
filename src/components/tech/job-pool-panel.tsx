"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, Clock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { TechJobItem } from "@/components/tech/types";
import { filterJobs } from "@/components/tech/types";

interface JobPoolPanelProps {
  jobPool: TechJobItem[];
  searchQuery: string;
  selectedBuilding: string;
  isPending: boolean;
  onClaim: (workOrderId: string) => void;
  onBulkClaim: (workOrderIds: string[]) => Promise<boolean>;
}

const ITEMS_PER_PAGE = 10;

function isUrgent(dateString?: string | null) {
  if (!dateString) return false;
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 3;
}

export function JobPoolPanel({ jobPool, searchQuery, selectedBuilding, isPending, onClaim, onBulkClaim }: JobPoolPanelProps) {
  const [poolPage, setPoolPage] = useState(1);
  const [selectedPoolIds, setSelectedPoolIds] = useState<string[]>([]);

  useEffect(() => {
    setPoolPage(1);
    setSelectedPoolIds([]);
  }, [searchQuery, selectedBuilding]);

  // Drop stale selections once a job leaves the pool (claimed by this tech or
  // someone else), so the "เลือกแล้ว N งาน" count never lags reality.
  useEffect(() => {
    setSelectedPoolIds((prev) => prev.filter((id) => jobPool.some((job) => job.id === id)));
  }, [jobPool]);

  function togglePoolSelection(jobId: string) {
    setSelectedPoolIds((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    );
  }

  const filteredPool = filterJobs(jobPool, searchQuery, selectedBuilding);
  const totalPoolPages = Math.ceil(filteredPool.length / ITEMS_PER_PAGE);
  const paginatedPool = filteredPool.slice((poolPage - 1) * ITEMS_PER_PAGE, poolPage * ITEMS_PER_PAGE);

  return (
    <div className="animate-in fade-in">
      <div className="space-y-4">
        {selectedPoolIds.length > 0 && (
          <div className="biz-card p-4 flex items-center justify-between gap-3 bg-secondary/40 border-dashed">
            <span className="text-xs font-bold text-foreground">เลือกแล้ว {selectedPoolIds.length} งาน</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedPoolIds([])}
                className="rounded-xl border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted transition-all"
              >
                ยกเลิกการเลือก
              </button>
              <button
                onClick={async () => {
                  if (selectedPoolIds.length === 0) return;
                  const success = await onBulkClaim(selectedPoolIds);
                  if (success) setSelectedPoolIds([]);
                }}
                disabled={isPending}
                className="rounded-xl bg-foreground px-4 py-1.5 text-xs font-bold text-white hover:bg-primary/90 transition-all shadow-sm active:scale-95 disabled:opacity-50"
              >
                รับงานที่เลือก ({selectedPoolIds.length})
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedPoolIds.includes(job.id)}
                      onCheckedChange={() => togglePoolSelection(job.id)}
                      aria-label={`เลือก ${job.acCode}`}
                    />
                    <div className="text-sm font-bold text-foreground leading-snug">{job.location}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-muted-foreground">{job.acCode}</span>
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold text-foreground">
                      {job.brand} {job.btu ? `(${job.btu} BTU)` : ""}
                    </span>
                    {job.priority === "critical" && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800">
                        <AlertTriangle className="h-3 w-3" /> ด่วนที่สุด
                      </span>
                    )}
                    {job.priority === "high" && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-800">
                        <AlertTriangle className="h-3 w-3" /> ด่วน
                      </span>
                    )}
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
                    onClick={() => onClaim(job.id)}
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
      </div>

      {totalPoolPages > 1 && (
        <div className="py-4 mt-2">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); setPoolPage((p) => Math.max(1, p - 1)); }}
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
                  onClick={(e) => { e.preventDefault(); setPoolPage((p) => Math.min(totalPoolPages, p + 1)); }}
                  className={poolPage === totalPoolPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}

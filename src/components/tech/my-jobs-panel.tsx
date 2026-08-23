"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, MoreVertical } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { TechJobItem } from "@/components/tech/types";
import { filterJobs } from "@/components/tech/types";

interface MyJobsPanelProps {
  myJobs: TechJobItem[];
  searchQuery: string;
  selectedBuilding: string;
  onSelectForLog: (job: TechJobItem) => void;
}

const ITEMS_PER_PAGE = 10;

export function MyJobsPanel({ myJobs, searchQuery, selectedBuilding, onSelectForLog }: MyJobsPanelProps) {
  const [myJobsPage, setMyJobsPage] = useState(1);

  useEffect(() => {
    setMyJobsPage(1);
  }, [searchQuery, selectedBuilding]);

  const filteredMyJobs = filterJobs(myJobs, searchQuery, selectedBuilding);
  const totalMyJobsPages = Math.ceil(filteredMyJobs.length / ITEMS_PER_PAGE);
  const paginatedMyJobs = filteredMyJobs.slice((myJobsPage - 1) * ITEMS_PER_PAGE, myJobsPage * ITEMS_PER_PAGE);

  return (
    <div className="animate-in fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMyJobs.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
            คุณไม่มีงานที่กำลังดำเนินการ
          </div>
        ) : (
          paginatedMyJobs.map((job) => (
            <div
              key={job.id}
              className="biz-card p-5 space-y-4 hover:border-muted-foreground transition-all relative overflow-hidden"
            >
              {job.priority === "critical" ? (
                <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-sm">
                  <AlertTriangle className="w-3 h-3" /> ด่วนที่สุด
                </div>
              ) : job.priority === "high" ? (
                <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-sm">
                  <AlertTriangle className="w-3 h-3" /> ด่วน
                </div>
              ) : null}
              <div className="flex items-center justify-between pr-8">
                <div className="space-y-1">
                  <div className="text-sm font-bold leading-snug text-foreground">
                    {job.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-muted-foreground">
                      {job.acCode}
                    </span>
                    <span className="rounded-md px-2 py-0.5 text-[10px] font-bold bg-secondary text-foreground">
                      {job.brand}
                    </span>
                  </div>
                </div>
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="pt-2 flex items-center justify-between text-xs border-t border-border">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-sky-400">กำลังดำเนินการ</span>
                  <span className="text-[10px] mt-1 text-muted-foreground">
                    {job.claimedAt ? `รับงานเมื่อ: ${format(new Date(job.claimedAt), "dd/MM HH:mm")}` : ""}
                  </span>
                </div>
                <button
                  onClick={() => onSelectForLog(job)}
                  className="rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-sm active:scale-95 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  บันทึกและปิดงาน
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {totalMyJobsPages > 1 && (
        <div className="py-4 mt-2">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); setMyJobsPage((p) => Math.max(1, p - 1)); }}
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
                  onClick={(e) => { e.preventDefault(); setMyJobsPage((p) => Math.min(totalMyJobsPages, p + 1)); }}
                  className={myJobsPage === totalMyJobsPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}

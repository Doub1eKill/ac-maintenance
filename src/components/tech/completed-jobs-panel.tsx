"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CheckCircle2 } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { TechJobItem } from "@/components/tech/types";
import { filterJobs } from "@/components/tech/types";

interface CompletedJobsPanelProps {
  completedJobs: TechJobItem[];
  searchQuery: string;
  selectedBuilding: string;
}

const ITEMS_PER_PAGE = 10;

export function CompletedJobsPanel({ completedJobs, searchQuery, selectedBuilding }: CompletedJobsPanelProps) {
  const [completedJobsPage, setCompletedJobsPage] = useState(1);

  useEffect(() => {
    setCompletedJobsPage(1);
  }, [searchQuery, selectedBuilding]);

  const filteredCompletedJobs = filterJobs(completedJobs, searchQuery, selectedBuilding);
  const totalCompletedJobsPages = Math.ceil(filteredCompletedJobs.length / ITEMS_PER_PAGE);
  const paginatedCompletedJobs = filteredCompletedJobs.slice(
    (completedJobsPage - 1) * ITEMS_PER_PAGE,
    completedJobsPage * ITEMS_PER_PAGE
  );

  return (
    <div className="animate-in fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {totalCompletedJobsPages > 1 && (
        <div className="py-4 mt-2">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); setCompletedJobsPage((p) => Math.max(1, p - 1)); }}
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
                  onClick={(e) => { e.preventDefault(); setCompletedJobsPage((p) => Math.min(totalCompletedJobsPages, p + 1)); }}
                  className={completedJobsPage === totalCompletedJobsPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}

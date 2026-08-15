"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Clock, Droplets, Snowflake, Wrench } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { TechnicianAssetUnit, TechnicianAssetSummary } from "@/lib/maintenance";
import { filterJobs } from "@/components/tech/types";

interface AssetsPanelProps {
  assetList: TechnicianAssetUnit[];
  assetSummary: TechnicianAssetSummary;
  searchQuery: string;
  selectedBuilding: string;
}

const ITEMS_PER_PAGE = 10;

export function AssetsPanel({ assetList, assetSummary, searchQuery, selectedBuilding }: AssetsPanelProps) {
  const [assetsPage, setAssetsPage] = useState(1);

  useEffect(() => {
    setAssetsPage(1);
  }, [searchQuery, selectedBuilding]);

  const filteredAssets = filterJobs(assetList, searchQuery, selectedBuilding);
  const totalAssetsPages = Math.ceil(filteredAssets.length / ITEMS_PER_PAGE);
  const paginatedAssets = filteredAssets.slice((assetsPage - 1) * ITEMS_PER_PAGE, assetsPage * ITEMS_PER_PAGE);

  return (
    <div className="animate-in fade-in">
      <div className="space-y-4">
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

      {totalAssetsPages > 1 && (
        <div className="py-4 mt-2">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); setAssetsPage((p) => Math.max(1, p - 1)); }}
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
                  onClick={(e) => { e.preventDefault(); setAssetsPage((p) => Math.min(totalAssetsPages, p + 1)); }}
                  className={assetsPage === totalAssetsPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}

"use client";

import { format } from "date-fns";
import { Clock, Droplets, Snowflake, Wrench } from "lucide-react";
import { BuildingGroupList, groupByBuilding } from "@/components/shared/building-groups";
import type { TechnicianAssetUnit, TechnicianAssetSummary } from "@/lib/maintenance";
import { filterJobs } from "@/components/tech/types";

interface AssetsPanelProps {
  assetList: TechnicianAssetUnit[];
  assetSummary: TechnicianAssetSummary;
  searchQuery: string;
  selectedBuilding: string;
}

export function AssetsPanel({ assetList, assetSummary, searchQuery, selectedBuilding }: AssetsPanelProps) {
  const filteredAssets = filterJobs(assetList, searchQuery, selectedBuilding);
  const groups = groupByBuilding(filteredAssets);

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

        <BuildingGroupList
          groups={groups}
          getSubtitle={(g) => {
            const floors = new Set(g.items.map((u) => u.floor ?? 0)).size;
            const rooms = new Set(g.items.map((u) => u.roomName)).size;
            return `${floors} ชั้น • ${rooms} ห้อง • ${g.items.length} แอร์`;
          }}
          emptyMessage="ไม่มีเครื่องปรับอากาศในระบบ"
          resetKey={`${searchQuery}|${selectedBuilding}`}
          renderExtra={(group) => {
            const repairCount = group.items.filter((u) => u.pendingWorkOrder?.type === "repair").length;
            const cleaningCount = group.items.filter((u) => u.pendingWorkOrder?.type === "cleaning").length;
            if (repairCount === 0 && cleaningCount === 0) return null;
            return (
              <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold">
                {repairCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 text-destructive px-1.5 py-0.5">
                    <Wrench className="h-3 w-3" /> {repairCount}
                  </span>
                )}
                {cleaningCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-warning/10 text-warning-foreground px-1.5 py-0.5">
                    <Droplets className="h-3 w-3" /> {cleaningCount}
                  </span>
                )}
              </div>
            );
          }}
          renderItems={(group) => (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {group.items.map((unit) => (
                <div key={unit.id} className="biz-card p-5 space-y-4 hover:border-muted-foreground transition-all relative overflow-hidden">
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
              ))}
            </div>
          )}
        />
      </div>
    </div>
  );
}

"use client";

import { Snowflake, Wrench, Sparkles, Users, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface OverviewMetricsGridProps {
  metrics: {
    totalUnits: number;
    brokenOrCleaningUnits: number;
    repairUnits: number;
    cleaningUnits: number;
    pendingWorkOrders: number;
    activeTechsCount: number;
  };
}

export function OverviewMetricsGrid({ metrics }: OverviewMetricsGridProps) {
  const healthPercent =
    metrics.totalUnits > 0
      ? Math.round(((metrics.totalUnits - metrics.brokenOrCleaningUnits) / metrics.totalUnits) * 100)
      : 100;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total AC Units & Fleet Health */}
      <div className="biz-card p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-muted-foreground">เครื่องปรับอากาศทั้งหมด</span>
            <div className="text-2xl font-bold tracking-tight text-foreground mt-1">
              {metrics.totalUnits.toLocaleString()}
              <span className="text-xs font-normal text-muted-foreground ml-1.5">เครื่อง</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Snowflake className="w-5 h-5 text-primary" />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border/60">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-emerald-500" /> อัตราความพร้อมใช้งาน
            </span>
            <span className="font-bold text-foreground">{healthPercent}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                healthPercent >= 90 ? "bg-emerald-500" : healthPercent >= 75 ? "bg-amber-500" : "bg-destructive"
              )}
              style={{ width: `${Math.min(100, Math.max(0, healthPercent))}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Urgent Repair Units */}
      <div className="biz-card p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-muted-foreground">รอซ่อมด่วน</span>
            <div className="text-2xl font-bold tracking-tight text-destructive mt-1">
              {metrics.repairUnits.toLocaleString()}
              <span className="text-xs font-normal text-muted-foreground ml-1.5">รายการ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center shrink-0">
            <Wrench className="w-5 h-5 text-destructive" />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">เครื่องแจ้งเสีย/ชำรุด</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-destructive/10 text-destructive border border-destructive/20">
            ต้องดูแลเร่งด่วน
          </span>
        </div>
      </div>

      {/* 3. Cleaning Due Units */}
      <div className="biz-card p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-muted-foreground">ถึงรอบล้างแอร์</span>
            <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 mt-1">
              {metrics.cleaningUnits.toLocaleString()}
              <span className="text-xs font-normal text-muted-foreground ml-1.5">รายการ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">รอบบำรุงรักษาเชิงป้องกัน</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
            ตามกำหนดรอบ
          </span>
        </div>
      </div>

      {/* 4. Active Technicians */}
      <div className="biz-card p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-muted-foreground">ช่างเทคนิคในระบบ</span>
            <div className="text-2xl font-bold tracking-tight text-foreground mt-1">
              {metrics.activeTechsCount.toLocaleString()}
              <span className="text-xs font-normal text-muted-foreground ml-1.5">คน</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">สถานะบัญชี Active</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            พร้อมปฏิบัติงาน
          </span>
        </div>
      </div>
    </div>
  );
}

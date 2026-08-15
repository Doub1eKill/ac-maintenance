"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Activity, CheckCircle2, ClipboardList, Clock, Snowflake, Wrench } from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { Slider } from "@/components/ui/slider";
import { UpcomingMaintenanceTable, type MaintenanceRow, type UrgentMaintenanceAC } from "@/components/admin/upcoming-maintenance-table";
import type { BuildingItem, WorkOrderItem } from "@/components/admin/types";

const ChartAreaInteractive = dynamic(
  () => import("@/components/admin/chart-area-interactive").then((m) => m.ChartAreaInteractive),
  { ssr: false, loading: () => <ChunkLoadingFallback /> }
);

function ChunkLoadingFallback() {
  return (
    <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-white">
      <AnimatedIcon icon={Clock} size={24} animation="spin" className="text-primary" />
    </div>
  );
}

function priorityRank(p: string | null) {
  return p === "critical" ? 0 : p === "high" ? 1 : 2;
}

interface OverviewPanelProps {
  metrics: {
    totalUnits: number;
    brokenOrCleaningUnits: number;
    repairUnits: number;
    cleaningUnits: number;
    pendingWorkOrders: number;
    activeTechsCount: number;
  };
  weeklyActivity: Array<{ day: string; repairs: number }>;
  urgentUnits: UrgentMaintenanceAC[];
  buildings: BuildingItem[];
  workOrders: WorkOrderItem[];
  onViewDetails: (acCode: string) => void;
  onCreateWorkOrder: (acId: string) => void;
  onAssignWorkOrder: (workOrderId: string) => void;
}

export function OverviewPanel({
  metrics,
  weeklyActivity,
  urgentUnits,
  buildings,
  workOrders,
  onViewDetails,
  onCreateWorkOrder,
  onAssignWorkOrder,
}: OverviewPanelProps) {
  const combinedMaintenanceRows = useMemo((): MaintenanceRow[] => {
    const urgentIds = new Set(urgentUnits.map((u) => u.id));

    const nextDueDateByAcId = new Map<string, string>();
    buildings.forEach((b) => {
      b.rooms.forEach((r) => {
        r.acUnits.forEach((ac) => {
          if (ac.maintenanceSchedule?.nextDueDate) {
            nextDueDateByAcId.set(ac.id, ac.maintenanceSchedule.nextDueDate);
          }
        });
      });
    });

    const urgentRows: MaintenanceRow[] = [...urgentUnits]
      .sort((a, b) => {
        const rankDiff = priorityRank(a.priority) - priorityRank(b.priority);
        if (rankDiff !== 0) return rankDiff;
        const aTime = a.reportedAt ? new Date(a.reportedAt).getTime() : 0;
        const bTime = b.reportedAt ? new Date(b.reportedAt).getTime() : 0;
        return aTime - bTime;
      })
      .map((u) => {
        const pendingWo = workOrders.find((wo) => wo.airConditionerId === u.id && wo.status === "pending");
        return {
          kind: "urgent" as const,
          ...u,
          pendingWorkOrderId: pendingWo ? pendingWo.id : null,
          nextDueDate: nextDueDateByAcId.get(u.id) ?? null,
        };
      });

    const upcomingRows: Array<{ kind: "upcoming"; id: string; acCode: string; brand: string; btu: number | null; location: string; nextDueDate: string }> = [];
    buildings.forEach((b) => {
      b.rooms.forEach((r) => {
        r.acUnits.forEach((ac) => {
          if (ac.maintenanceSchedule?.nextDueDate && !urgentIds.has(ac.id)) {
            upcomingRows.push({
              kind: "upcoming",
              id: ac.id,
              acCode: ac.acCode,
              brand: ac.brand || "ไม่ระบุยี่ห้อ",
              btu: ac.btu,
              location: `${b.name} - ห้อง ${r.name}`,
              nextDueDate: ac.maintenanceSchedule.nextDueDate,
            });
          }
        });
      });
    });
    upcomingRows.sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());

    return [...urgentRows, ...upcomingRows];
  }, [urgentUnits, buildings, workOrders]);

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="w-full">
        <ChartAreaInteractive
          title="ภาพรวมสถิติการซ่อมบำรุง (Maintenance Analytics)"
          description="สถิติการแจ้งซ่อมและงานที่เสร็จสิ้น เปรียบเทียบย้อนหลัง"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 w-full">
          <UpcomingMaintenanceTable
            data={combinedMaintenanceRows}
            onViewDetails={onViewDetails}
            onCreateWorkOrder={onCreateWorkOrder}
            onAssignWorkOrder={onAssignWorkOrder}
          />
        </div>

        <div className="biz-card p-6 h-fit w-full">
          <h3 className="text-base font-bold mb-6 flex items-center gap-2 text-foreground">
            <Activity className="h-5 w-5 text-primary" />
            สรุปสถานะระบบ
          </h3>

          <div className="grid grid-cols-2 xl:grid-cols-3 gap-y-8 gap-x-4">
            {/* Item 1 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Snowflake className="h-4 w-4 text-primary" />
                </div>
                ทั้งหมด
              </div>
              <div className="text-3xl font-bold">{metrics.totalUnits} <span className="text-sm font-medium text-muted-foreground">เครื่อง</span></div>
            </div>

            {/* Item 2 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <Wrench className="h-4 w-4 text-red-500" />
                </div>
                รอซ่อม
              </div>
              <div className="text-3xl font-bold">{metrics.repairUnits} <span className="text-sm font-medium text-muted-foreground">เครื่อง</span></div>
            </div>

            {/* Item 3 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Snowflake className="h-4 w-4 text-amber-500" />
                </div>
                รอล้าง
              </div>
              <div className="text-3xl font-bold">{metrics.cleaningUnits} <span className="text-sm font-medium text-muted-foreground">เครื่อง</span></div>
            </div>

            {/* Item 4 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <ClipboardList className="h-4 w-4 text-warning" />
                </div>
                รอดำเนินการ
              </div>
              <div className="text-3xl font-bold">{metrics.pendingWorkOrders} <span className="text-sm font-medium text-muted-foreground">ใบงาน</span></div>
            </div>

            {/* Item 5 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Wrench className="h-4 w-4 text-success" />
                </div>
                ช่างดูแล
              </div>
              <div className="text-3xl font-bold">{metrics.activeTechsCount} <span className="text-sm font-medium text-muted-foreground">คน</span></div>
            </div>

            {/* Item 6 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                เสร็จสิ้นสัปดาห์นี้
              </div>
              <div className="text-3xl font-bold">{weeklyActivity.reduce((sum, d) => sum + d.repairs, 0)} <span className="text-sm font-medium text-muted-foreground">งาน</span></div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex justify-between text-xs mb-2">
              <span className="font-bold text-muted-foreground">สถานะความพร้อมของเครื่อง</span>
              <span className="font-bold text-success">
                {metrics.totalUnits > 0 ? Math.round(((metrics.totalUnits - metrics.brokenOrCleaningUnits) / metrics.totalUnits) * 100) : 100}%
              </span>
            </div>
            <div className="pt-2 pb-1">
              <Slider
                defaultValue={[metrics.totalUnits > 0 ? Math.round(((metrics.totalUnits - metrics.brokenOrCleaningUnits) / metrics.totalUnits) * 100) : 100]}
                max={100}
                step={1}
                disabled
                className="[&_[data-slot=slider-track]]:bg-red-500 [&_[data-slot=slider-range]]:bg-success [&_[data-slot=slider-thumb]]:hidden opacity-100"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

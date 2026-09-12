"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Clock } from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { OverviewMetricsGrid } from "@/components/admin/overview-metrics-grid";
import { UpcomingMaintenanceTable, type MaintenanceRow, type UrgentMaintenanceAC } from "@/components/admin/upcoming-maintenance-table";
import type { BuildingItem, WorkOrderItem } from "@/components/admin/types";
import { formatUnitLocation } from "@/lib/location";

const MaintenanceAnalyticsDonut = dynamic(
  () => import("@/components/admin/maintenance-analytics-donut").then((m) => m.MaintenanceAnalyticsDonut),
  { ssr: false, loading: () => <ChunkLoadingFallback /> }
);

function ChunkLoadingFallback() {
  return (
    <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-card">
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
  urgentUnits: UrgentMaintenanceAC[];
  buildings: BuildingItem[];
  workOrders: WorkOrderItem[];
  onViewDetails: (acCode: string) => void;
  onCreateWorkOrder: (acId: string) => void;
  onBulkAssignWorkOrder: (workOrderIds: string[]) => void;
}

export function OverviewPanel({
  metrics,
  urgentUnits,
  buildings,
  workOrders,
  onViewDetails,
  onCreateWorkOrder,
  onBulkAssignWorkOrder,
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
        // Units that actually have an open job come first.
        //
        // Without this the list opened with the twelve units that are flagged
        // as broken or due but have no work order raised on them. They sort to
        // the very top because they have no report date, and `?? 0` reads a
        // missing date as the beginning of time — so the rows nobody has
        // ticketed yet outranked jobs reported in July, and the first thing an
        // admin saw was the only rows the "มอบหมายช่าง" button cannot act on.
        const aHasJob = a.workOrderId !== null;
        const bHasJob = b.workOrderId !== null;
        if (aHasJob !== bHasJob) return aHasJob ? -1 : 1;

        const rankDiff = priorityRank(a.priority) - priorityRank(b.priority);
        if (rankDiff !== 0) return rankDiff;

        // Oldest report first, among rows that have one. The `?? 0` is now only
        // reached by two rows that both lack a date, where it is a tie.
        const aTime = a.reportedAt ? new Date(a.reportedAt).getTime() : 0;
        const bTime = b.reportedAt ? new Date(b.reportedAt).getTime() : 0;
        return aTime - bTime;
      })
      .map((u) => ({
        kind: "urgent" as const,
        ...u,
        // Taken from the unit itself, which the server fills in from a query
        // over every open work order.
        //
        // This used to search the `workOrders` prop for a pending row on the
        // same unit. That prop is the work order board's first page — fifty
        // rows of every status, newest first — so it holds only a fraction of
        // the open jobs, and matched none of the 38 urgent units that have one.
        // The result was a "มอบหมายช่าง (0)" button that was disabled no matter
        // what was ticked: the bulk assign on this table could never be used.
        pendingWorkOrderId: u.workOrderId,
        nextDueDate: nextDueDateByAcId.get(u.id) ?? null,
      }));

    // Typed off MaintenanceRow rather than restating its fields: the inline
    // copy this replaces had to be edited in step with the interface, and was
    // the thing that went stale when the building columns were added.
    const upcomingRows: MaintenanceRow[] = [];
    buildings.forEach((b) => {
      b.rooms.forEach((r) => {
        r.acUnits.forEach((ac) => {
          if (ac.maintenanceSchedule?.nextDueDate && !urgentIds.has(ac.id)) {
            upcomingRows.push({
              kind: "upcoming",
              id: ac.id,
              acCode: ac.acCode,
              brand: ac.brand || "ไม่ระบุยี่ห้อ",
              brandDeleted: ac.brandDeleted,
              modelDeleted: ac.modelDeleted,
              btu: ac.btu,
              // Through the helper rather than an inline template: this row
              // shows the same place as every other list, and the grouped
              // table needs the room on its own as well.
              location: formatUnitLocation({ name: r.name, building: { name: b.name } }),
              roomLocation: formatUnitLocation(
                { name: r.name, building: { name: b.name } },
                { withBuilding: false }
              ),
              roomId: r.id,
              roomName: r.name,
              floor: r.floor,
              buildingId: b.id,
              buildingName: b.name,
              nextDueDate: ac.maintenanceSchedule.nextDueDate,
            });
          }
        });
      });
    });
    // Every row pushed above carries a date; the nullish guard is here because
    // the shared row type allows an urgent row without one, and the array is
    // now typed off that union rather than a local restatement of it.
    const dueTime = (row: MaintenanceRow) =>
      row.nextDueDate ? new Date(row.nextDueDate).getTime() : 0;
    upcomingRows.sort((a, b) => dueTime(a) - dueTime(b));

    return [...urgentRows, ...upcomingRows];
  }, [urgentUnits, buildings, workOrders]);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Executive KPI Metrics Grid */}
      <OverviewMetricsGrid metrics={metrics} />

      <div className="w-full">
        <MaintenanceAnalyticsDonut
          workOrders={workOrders}
          title="ภาพรวมสถิติการซ่อมบำรุง (Maintenance Analytics)"
          description="สัดส่วนสถานะงานซ่อมบำรุงและอัตราความสำเร็จของทีมช่าง"
        />
      </div>

      <div className="w-full">
        <UpcomingMaintenanceTable
          data={combinedMaintenanceRows}
          onViewDetails={onViewDetails}
          onCreateWorkOrder={onCreateWorkOrder}
          onBulkAssignWorkOrder={onBulkAssignWorkOrder}
        />
      </div>
    </div>
  );
}

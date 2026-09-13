"use client";

import * as React from "react";
import { type CSSProperties } from "react";
import { Label, Pie, PieChart } from "recharts";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ClipboardList,
  Wrench,
  Sparkles,
  Flame,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { WorkOrderItem } from "@/components/admin/types";

const chartConfig = {
  count: { label: "จำนวนใบสั่งงาน" },
  completed: {
    label: "เสร็จสิ้น",
    color: "#10b981", // Emerald-500
  },
  claimed: {
    label: "กำลังดำเนินการ",
    color: "#3b82f6", // Blue-500
  },
  pending: {
    label: "รอดำเนินการ",
    color: "#f59e0b", // Amber-500
  },
  cancelled: {
    label: "ยกเลิก",
    color: "#94a3b8", // Slate-400
  },
} satisfies ChartConfig;

interface MaintenanceAnalyticsDonutProps {
  workOrders?: WorkOrderItem[];
  title?: string;
  description?: string;
}

/**
 * ReUI c-chart-20 based Donut Chart with center completion rate and status breakdown.
 * Visualizes maintenance operational performance based on live Work Orders.
 */
export function MaintenanceAnalyticsDonut({
  workOrders = [],
  title = "สถิติสถานะใบสั่งงานซ่อมบำรุง (Work Order Analytics)",
  description = "สัดส่วนสถานะงานซ่อมบำรุงและอัตราความสำเร็จของทีมช่าง",
}: MaintenanceAnalyticsDonutProps) {
  const counts = React.useMemo(() => {
    if (!workOrders || workOrders.length === 0) {
      return {
        completed: 0,
        claimed: 0,
        pending: 0,
        cancelled: 0,
        total: 0,
        urgent: 0,
        cleaning: 0,
        repair: 0,
      };
    }

    let completed = 0;
    let claimed = 0;
    let pending = 0;
    let cancelled = 0;
    let urgent = 0;
    let cleaning = 0;
    let repair = 0;

    for (const wo of workOrders) {
      if (wo.status === "completed") completed++;
      else if (wo.status === "claimed") claimed++;
      else if (wo.status === "pending") pending++;
      else if (wo.status === "cancelled") cancelled++;

      // Priority is low / high / critical (createWorkOrderSchema); this used
      // to test for "urgent", a value that never existed, and missed
      // "critical". Only open orders: a completed critical job is not a
      // fire any more, and the footer's number is meant to be what needs
      // attention now.
      if (
        (wo.priority === "critical" || wo.priority === "high") &&
        (wo.status === "pending" || wo.status === "claimed")
      ) {
        urgent++;
      }
      if (wo.type === "cleaning") cleaning++;
      else if (wo.type === "repair") repair++;
    }

    return {
      completed,
      claimed,
      pending,
      cancelled,
      total: workOrders.length,
      urgent,
      cleaning,
      repair,
    };
  }, [workOrders]);

  const completionRate = counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;

  const chartData = React.useMemo(() => {
    if (counts.total === 0) {
      return [
        { status: "completed", count: 1, fill: "var(--color-completed)" },
      ];
    }

    const items = [
      { status: "completed", count: counts.completed, fill: "var(--color-completed)" },
      { status: "claimed", count: counts.claimed, fill: "var(--color-claimed)" },
      { status: "pending", count: counts.pending, fill: "var(--color-pending)" },
      { status: "cancelled", count: counts.cancelled, fill: "var(--color-cancelled)" },
    ];

    // Keep items that have count > 0, or fallback to all items if all 0
    const nonZero = items.filter((d) => d.count > 0);
    return nonZero.length > 0 ? nonZero : items;
  }, [counts]);

  return (
    <Card className="w-full border-border bg-card shadow-xs">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div className="space-y-1">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            {title}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            {description}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-secondary text-secondary-foreground border border-border/60">
          <span>รวมทั้งหมด:</span>
          <span className="font-mono text-sm font-bold text-foreground">
            {counts.total.toLocaleString()} ใบงาน
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left / Center: ReUI c-chart-20 Donut Chart */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square w-full max-w-[320px] max-h-[280px]"
            >
              <PieChart accessibilityLayer>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      className="min-w-44 gap-2.5"
                      formatter={(value, name) => (
                        <div className="flex w-full items-center justify-between gap-3">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="h-2.5 w-2.5 shrink-0 rounded-xs bg-(--color-bg)"
                              style={
                                {
                                  "--color-bg": `var(--color-${name})`,
                                } as CSSProperties
                              }
                            />
                            <span className="text-muted-foreground text-xs">
                              {chartConfig[name as keyof typeof chartConfig]?.label || name}
                            </span>
                          </div>
                          <span className="text-foreground font-bold tabular-nums text-xs">
                            {counts.total === 0 ? "0 งาน" : `${Number(value).toLocaleString()} งาน`}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <ChartLegend
                  content={
                    <ChartLegendContent
                      nameKey="status"
                      className="flex-wrap justify-center gap-x-3.5 gap-y-1 text-xs"
                    />
                  }
                  className="-translate-y-1"
                />
                <Pie
                  data={chartData}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={65}
                  outerRadius={95}
                  cornerRadius={5}
                  paddingAngle={3}
                  stroke="var(--card)"
                  strokeWidth={3}
                >
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="central"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) - 7}
                              className="fill-foreground text-3xl font-extrabold tabular-nums"
                            >
                              {completionRate}%
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 17}
                              className="fill-muted-foreground text-[11px] font-medium"
                            >
                              งานเสร็จสิ้น
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
          </div>

          {/* Right: Quick Breakdown & KPI Cards */}
          <div className="lg:col-span-7 flex flex-col justify-between gap-3.5">
            <div className="grid grid-cols-2 gap-3">
              {/* Completed Tile */}
              <div className="p-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-1 transition-all">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">เสร็จสิ้น</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-foreground font-mono">
                    {counts.completed.toLocaleString()}
                  </span>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0}%
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground">ปิดงานเรียบร้อยแล้ว</div>
              </div>

              {/* In Progress Tile */}
              <div className="p-3.5 rounded-2xl border border-blue-500/20 bg-blue-500/5 space-y-1 transition-all">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">กำลังดำเนินการ</span>
                  <Clock className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-foreground font-mono">
                    {counts.claimed.toLocaleString()}
                  </span>
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {counts.total > 0 ? Math.round((counts.claimed / counts.total) * 100) : 0}%
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground">ช่างรับงานและกำลังดำเนินการ</div>
              </div>

              {/* Pending Tile */}
              <div className="p-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-1 transition-all">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">รอดำเนินการ</span>
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-foreground font-mono">
                    {counts.pending.toLocaleString()}
                  </span>
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                    {counts.total > 0 ? Math.round((counts.pending / counts.total) * 100) : 0}%
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground">รอการมอบหมายหรือช่างกดรับ</div>
              </div>

              {/* Cancelled Tile */}
              <div className="p-3.5 rounded-2xl border border-border bg-muted/30 space-y-1 transition-all">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">ยกเลิก</span>
                  <XCircle className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-foreground font-mono">
                    {counts.cancelled.toLocaleString()}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {counts.total > 0 ? Math.round((counts.cancelled / counts.total) * 100) : 0}%
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground">แจ้งซ้ำหรือยกเลิกคำขอ</div>
              </div>
            </div>

            {/* Quick Context Footer Pill */}
            <div className="rounded-xl border border-border/60 bg-secondary/40 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                <span>ใบงานความสำคัญสูง/วิกฤต ที่เปิดอยู่:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                  {counts.urgent}
                </span>
                <span>ใบ</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[11px]">
                  <Sparkles className="w-3 h-3 text-sky-500" />
                  ล้างแอร์: <b className="text-foreground font-mono">{counts.cleaning}</b>
                </span>
                <span className="flex items-center gap-1 text-[11px]">
                  <Wrench className="w-3 h-3 text-primary" />
                  แจ้งซ่อม: <b className="text-foreground font-mono">{counts.repair}</b>
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

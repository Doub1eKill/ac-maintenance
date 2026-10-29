"use client";

import { useState } from "react";
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
import type { WorkOrderStats } from "@/lib/admin/work-order-stats";

// The four slices, in drawing order (clockwise from twelve o'clock).
const SLICES = [
  { key: "completed", label: "เสร็จสิ้น", color: "#10b981" }, // Emerald-500
  { key: "claimed", label: "กำลังดำเนินการ", color: "#3b82f6" }, // Blue-500
  { key: "pending", label: "รอดำเนินการ", color: "#f59e0b" }, // Amber-500
  { key: "cancelled", label: "ยกเลิก", color: "#94a3b8" }, // Slate-400
] as const;

type SliceKey = (typeof SLICES)[number]["key"];

interface MaintenanceAnalyticsDonutProps {
  stats?: WorkOrderStats;
  title?: string;
  description?: string;
}

const EMPTY_STATS: WorkOrderStats = {
  total: 0,
  completed: 0,
  claimed: 0,
  pending: 0,
  cancelled: 0,
  cleaning: 0,
  repair: 0,
  urgentOpen: 0,
};

// Drawn by hand rather than with recharts, which this ring was the app's only
// use of: its chunk was 330 KB for four arcs. Each slice is one circle stroked
// along part of its circumference (stroke-dasharray), turned to start where the
// previous one ended, with a small gap between them.
const SIZE = 220;
const RADIUS = 80;
const STROKE = 28;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 6; // along the ring, in px, between neighbouring slices

function DonutRing({
  counts,
  completionRate,
}: {
  counts: WorkOrderStats;
  completionRate: number;
}) {
  const [hovered, setHovered] = useState<SliceKey | null>(null);
  const visible = SLICES.filter((s) => counts[s.key] > 0);
  const hoveredSlice = SLICES.find((s) => s.key === hovered);

  let offset = 0;
  const arcs = visible.map((slice) => {
    const share = counts[slice.key] / counts.total;
    const length = share * CIRCUMFERENCE;
    // A lone slice is the whole ring and needs no gap.
    const drawn = visible.length > 1 ? Math.max(length - GAP, 0.5) : length;
    const arc = { ...slice, drawn, start: offset };
    offset += length;
    return arc;
  });

  const summary =
    counts.total === 0
      ? "ยังไม่มีใบงาน"
      : SLICES.map((s) => `${s.label} ${counts[s.key]}`).join(", ");

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full max-w-[260px]"
        role="img"
        aria-label={`สัดส่วนสถานะใบงาน: ${summary}; เสร็จสิ้น ${completionRate}%`}
      >
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          {counts.total === 0 ? (
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="var(--muted)"
              strokeWidth={STROKE}
            />
          ) : (
            arcs.map((arc) => (
              <circle
                key={arc.key}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={arc.color}
                strokeWidth={hovered === arc.key ? STROKE + 4 : STROKE}
                strokeDasharray={`${arc.drawn} ${CIRCUMFERENCE - arc.drawn}`}
                strokeDashoffset={-arc.start}
                className="cursor-default transition-[stroke-width] duration-150"
                onMouseEnter={() => setHovered(arc.key)}
                onMouseLeave={() => setHovered(null)}
              >
                <title>{`${arc.label}: ${counts[arc.key].toLocaleString()} งาน`}</title>
              </circle>
            ))
          )}
        </g>
        {/* The centre reads the completion rate, or the slice under the pointer. */}
        <text
          x={SIZE / 2}
          y={SIZE / 2}
          textAnchor="middle"
          dominantBaseline="central"
          className="pointer-events-none"
        >
          <tspan
            x={SIZE / 2}
            y={SIZE / 2 - 8}
            className="fill-foreground text-3xl font-extrabold tabular-nums"
          >
            {hoveredSlice ? counts[hoveredSlice.key].toLocaleString() : `${completionRate}%`}
          </tspan>
          <tspan x={SIZE / 2} y={SIZE / 2 + 18} className="fill-muted-foreground text-[11px] font-medium">
            {hoveredSlice ? hoveredSlice.label : "งานเสร็จสิ้น"}
          </tspan>
        </text>
      </svg>
      <ul className="flex flex-wrap justify-center gap-x-3.5 gap-y-1 text-xs text-muted-foreground">
        {SLICES.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-xs" style={{ backgroundColor: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Donut of work orders by status, with the completion rate in the centre and
 * the status breakdown beside it.
 */
export function MaintenanceAnalyticsDonut({
  title = "สถิติสถานะใบสั่งงานซ่อมบำรุง (Work Order Analytics)",
  description = "สัดส่วนสถานะงานซ่อมบำรุงและอัตราความสำเร็จของทีมช่าง",
  stats,
}: MaintenanceAnalyticsDonutProps) {
  // Counted server-side over every work order (getWorkOrderStats); the
  // donut used to tally the board's first fifty rows and call that the total.
  const counts = stats ?? EMPTY_STATS;

  const completionRate = counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;

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
          {/* Left / Center: status donut */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <DonutRing counts={counts} completionRate={completionRate} />
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
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
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
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
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
                  {counts.urgentOpen}
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

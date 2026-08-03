# Org Admin — Split Metrics + Urgent Work List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the Org Admin dashboard's combined "เสีย/รอซ่อม" metric into separate repair/cleaning counts, and replace the forward-looking-only "กำหนดล้างแอร์" table with a merged list that surfaces units broken/overdue *right now* first.

**Architecture:** Pure frontend change. `getOrgAdminData()` (`src/app/admin/actions.ts`) already returns `metrics.repairUnits`, `metrics.cleaningUnits`, and a pre-shaped `urgentUnits` array — none of it reaches the UI yet. This plan widens the stale TypeScript prop types, threads `urgentUnits` through `page.tsx` → `AdminDashboardView`, and merges it with the existing schedule-based "upcoming" rows into one table, deduped and priority-sorted.

**Tech Stack:** Next.js 16 App Router (Server Component page + Client Component view), TypeScript, @tanstack/react-table, Tailwind CSS v4, shadcn/ReUI `Badge`.

## Global Constraints

- No test framework is installed in this project (no jest/vitest/playwright) — verification is `npx tsc --noEmit` for type correctness plus manual browser verification against the live dev server. Do not add a test framework as part of this work; that is out of scope.
- No backend/schema changes (`prisma/schema.prisma`, `src/app/admin/actions.ts`) — per the `HANDOFF.md` collaboration rule, backend changes require a written request first, and none are needed here (see spec §3 Out of Scope).
- Follow the strict no-emoji UI rule (`AGENTS.md`): status must be communicated with `lucide-react` icons/Badge components, never emoji.
- Reference spec: `docs/superpowers/specs/2026-08-03-org-admin-status-urgent-list-design.md`.

---

### Task 1: System Status Summary card — split repair/cleaning tiles

**Files:**
- Modify: `src/components/admin/admin-dashboard-view.tsx:126-146` (the `metrics` type in `AdminDashboardViewProps`)
- Modify: `src/components/admin/admin-dashboard-view.tsx:488-557` (the "สรุปสถานะระบบ" card JSX)

**Interfaces:**
- Consumes: `metrics.repairUnits: number`, `metrics.cleaningUnits: number` (already returned at runtime by `getOrgAdminData()` in `src/app/admin/actions.ts`, just not typed yet), `weeklyActivity: Array<{ day: string; repairs: number }>` (existing prop).
- Produces: nothing new consumed by later tasks — this task is self-contained.

- [ ] **Step 1: Widen the `metrics` type**

Find this block (around line 134):

```tsx
  metrics: {
    totalUnits: number;
    brokenOrCleaningUnits: number;
    pendingWorkOrders: number;
    activeTechsCount: number;
    pendingUsersCount?: number;
  };
```

Replace with:

```tsx
  metrics: {
    totalUnits: number;
    brokenOrCleaningUnits: number;
    repairUnits: number;
    cleaningUnits: number;
    pendingWorkOrders: number;
    activeTechsCount: number;
    pendingUsersCount?: number;
  };
```

- [ ] **Step 2: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: no new errors (the wider type is a superset of what's already destructured, so nothing else breaks).

- [ ] **Step 3: Replace the summary grid with a 3-column, 6-tile layout**

Find the full block from `<div className="biz-card p-6 h-fit w-full">` (around line 488) through its closing `</div>` right before `</div>\n</div>\n)}\n\n{/* Formal Data Table for Work Orders */}` (around line 557) — i.e. the whole "สรุปสถานะระบบ" card, including the `grid grid-cols-2 gap-y-8 gap-x-4` div and the progress-bar block below it. Replace the **inner grid div only** (leave the surrounding card wrapper, heading, and the `mt-8 pt-6 border-t border-border` progress-bar block untouched):

Old:
```tsx
              <div className="grid grid-cols-2 gap-y-8 gap-x-4">
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
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    </div>
                    เสีย/รอซ่อม
                  </div>
                  <div className="text-3xl font-bold">{metrics.brokenOrCleaningUnits} <span className="text-sm font-medium text-muted-foreground">เครื่อง</span></div>
                </div>

                {/* Item 3 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <ClipboardList className="h-4 w-4 text-warning" />
                    </div>
                    รอดำเนินการ
                  </div>
                  <div className="text-3xl font-bold">{metrics.pendingWorkOrders} <span className="text-sm font-medium text-muted-foreground">ใบงาน</span></div>
                </div>

                {/* Item 4 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <Wrench className="h-4 w-4 text-success" />
                    </div>
                    ช่างดูแล
                  </div>
                  <div className="text-3xl font-bold">{metrics.activeTechsCount} <span className="text-sm font-medium text-muted-foreground">คน</span></div>
                </div>
              </div>
```

New:
```tsx
              <div className="grid grid-cols-3 gap-y-8 gap-x-4">
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
```

Do not touch the `AlertTriangle` import — it's still used elsewhere in this file (the DB error / toast alerts). `CheckCircle2` and `Wrench` are already imported at the top of the file; no import changes needed.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manually verify in the browser**

The dev server should already be running on `http://localhost:3000` with an authenticated Org Admin session. Reload `http://localhost:3000/admin` (Overview tab) and confirm:
- The "สรุปสถานะระบบ" card now shows 6 tiles in a 3-column layout: ทั้งหมด, รอซ่อม, รอล้าง, รอดำเนินการ, ช่างดูแล, เสร็จสิ้นสัปดาห์นี้.
- รอซ่อม + รอล้าง sum to the old combined "เสีย/รอซ่อม" number.
- The readiness progress bar below still renders correctly (unchanged formula/markup).

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/admin-dashboard-view.tsx
git commit -m "feat(admin): split repair/cleaning metrics into separate summary tiles"
```

---

### Task 2: `UpcomingMaintenanceTable` — merged row type, type badge, conditional actions

**Files:**
- Modify: `src/components/admin/upcoming-maintenance-table.tsx` (full rewrite of the file below)

**Interfaces:**
- Consumes: nothing new from other tasks.
- Produces (for Task 3 to consume):
  - `export type MaintenanceRow = ({ kind: "upcoming" } & UpcomingMaintenanceAC) | ({ kind: "urgent" } & UrgentMaintenanceAC)` — the exact shape Task 3's data source must produce.
  - `export interface UrgentMaintenanceAC { id: string; acCode: string; brand: string; location: string; status: string; priority: string | null; issueDescription: string | null; reportedAt: string | null }`.
  - `UpcomingMaintenanceTableProps` gains `onAssignWorkOrder?: (acId: string) => void` (called with the **AC unit id**, not a work order id — the caller is responsible for resolving that, since this component only ever sees `urgentUnits` data, which doesn't carry a work order id).

- [ ] **Step 1: Replace the entire file contents**

```tsx
"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowUpDown, CalendarRange, ChevronDown, MoreHorizontal } from "lucide-react";

export interface UpcomingMaintenanceAC {
  id: string;
  acCode: string;
  brand: string;
  location: string;
  nextDueDate: string;
}

export interface UrgentMaintenanceAC {
  id: string;
  acCode: string;
  brand: string;
  location: string;
  status: string;
  priority: string | null;
  issueDescription: string | null;
  reportedAt: string | null;
}

export type MaintenanceRow =
  | ({ kind: "upcoming" } & UpcomingMaintenanceAC)
  | ({ kind: "urgent" } & UrgentMaintenanceAC);

export const columns: ColumnDef<MaintenanceRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "acCode",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          className="p-0 hover:bg-transparent font-bold text-xs"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          รหัสแอร์
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      );
    },
    cell: ({ row }) => <div className="font-mono font-bold text-xs">{row.getValue("acCode")}</div>,
  },
  {
    accessorKey: "location",
    header: () => <div className="text-xs font-bold">สถานที่ / ยี่ห้อ</div>,
    cell: ({ row }) => (
      <div>
        <div className="font-medium text-xs">{row.getValue("location")}</div>
        <div className="text-[10px] text-muted-foreground">{row.original.brand}</div>
      </div>
    ),
  },
  {
    id: "type",
    header: () => <div className="text-xs font-bold">ประเภท</div>,
    cell: ({ row }) => {
      const item = row.original;
      if (item.kind === "urgent" && item.status === "broken") {
        return <Badge variant="destructive" className="text-[10px]">ซ่อมด่วน</Badge>;
      }
      if (item.kind === "urgent" && item.status === "needs_cleaning") {
        return (
          <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600 bg-amber-500/10">
            ค้างล้าง
          </Badge>
        );
      }
      return <Badge variant="outline" className="text-[10px]">กำหนดล้าง</Badge>;
    },
    enableSorting: false,
  },
  {
    id: "dateInfo",
    header: () => <div className="text-xs font-bold text-right">วันที่</div>,
    cell: ({ row }) => {
      const item = row.original;
      if (item.kind === "urgent") {
        const label = item.reportedAt ? new Date(item.reportedAt).toLocaleDateString("th-TH") : "-";
        return (
          <div className="text-right text-xs">
            <div className="text-[10px] text-muted-foreground">แจ้งเมื่อ</div>
            <div className="font-medium text-red-500">{label}</div>
          </div>
        );
      }
      const date = new Date(item.nextDueDate);
      const isOverdue = date.getTime() < new Date().getTime();
      return (
        <div className={`text-right text-xs font-medium ${isOverdue ? "text-red-500" : "text-foreground"}`}>
          {date.toLocaleDateString("th-TH")}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row, table }) => {
      const item = row.original;
      const meta = table.options.meta as any;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>จัดการ</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(item.acCode)}
            >
              คัดลอกรหัสแอร์
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => meta?.onViewDetails?.(item.acCode)}>ดูรายละเอียดเครื่อง</DropdownMenuItem>
            {item.kind === "urgent" ? (
              <DropdownMenuItem onClick={() => meta?.onAssignWorkOrder?.(item.id)}>มอบหมายช่าง</DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => meta?.onCreateWorkOrder?.(item.id)}>สร้างใบงานล้างแอร์</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

interface UpcomingMaintenanceTableProps {
  data: MaintenanceRow[];
  onViewDetails?: (acCode: string) => void;
  onCreateWorkOrder?: (acId: string) => void;
  onAssignWorkOrder?: (acId: string) => void;
}

export function UpcomingMaintenanceTable({ data, onViewDetails, onCreateWorkOrder, onAssignWorkOrder }: UpcomingMaintenanceTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    meta: {
      onViewDetails,
      onCreateWorkOrder,
      onAssignWorkOrder,
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 5,
      },
    }
  });

  return (
    <div className="biz-card p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <CalendarRange className="w-5 h-5 text-primary" /> รอซ่อมด่วน
        </h3>
        
        <div className="flex items-center gap-2">
          <Input
            placeholder="ค้นหารหัสแอร์..."
            value={(table.getColumn("acCode")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("acCode")?.setFilterValue(event.target.value)
            }
            className="max-w-[200px] h-8 text-xs"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto h-8 text-xs">
                คอลัมน์ <ChevronDown className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize text-xs"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id === "acCode" ? "รหัสแอร์" :
                       column.id === "location" ? "สถานที่" :
                       column.id === "type" ? "ประเภท" :
                       column.id === "dateInfo" ? "วันที่" : column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="h-10 px-4 whitespace-normal text-xs">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="h-12"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-2 whitespace-normal">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-xs text-muted-foreground">
                  ไม่มีงานซ่อมด่วนหรือกำหนดล้างในขณะนี้
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-muted-foreground">
          เลือกแล้ว {table.getFilteredSelectedRowModel().rows.length} จาก{" "}
          {table.getFilteredRowModel().rows.length} รายการ
        </div>
        {table.getPageCount() > 1 && (
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              ก่อนหน้า
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              ถัดไป
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it typechecks in isolation**

Run: `npx tsc --noEmit`
Expected: this file compiles cleanly on its own, but the build will report an error in `src/components/admin/admin-dashboard-view.tsx` because it still imports `UpcomingMaintenanceAC` and passes the old `upcomingMaintenanceAcs` shape as `data`. **That error is expected here** — Task 3 fixes the call site. Confirm the *only* new errors are in `admin-dashboard-view.tsx`, not in `upcoming-maintenance-table.tsx` itself.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/upcoming-maintenance-table.tsx
git commit -m "feat(admin): support merged urgent/upcoming rows in maintenance table"
```

---

### Task 3: Wire `urgentUnits` end-to-end and merge with upcoming rows

**Files:**
- Modify: `src/app/admin/page.tsx`
- Modify: `src/components/admin/admin-dashboard-view.tsx` (props interface, imports, the `upcomingMaintenanceAcs` memo, the `UpcomingMaintenanceTable` render call, and the assign-handler wiring)

**Interfaces:**
- Consumes: `MaintenanceRow`, `UrgentMaintenanceAC` from Task 2 (`src/components/admin/upcoming-maintenance-table.tsx`); `assignWorkOrderAction(workOrderId: string, assignToUserId: string)` (existing, `src/app/admin/actions.ts`); existing state `selectedOrderToAssign`, `setSelectedOrderToAssign`, `showAssignModal`, `setShowAssignModal` (all already defined in `admin-dashboard-view.tsx`).
- Produces: nothing consumed by later tasks — this is the final integration task.

- [ ] **Step 1: Pass `urgentUnits` through the page**

In `src/app/admin/page.tsx`, find:

```tsx
  const {
    dbError,
    universityName,
    metrics,
    workOrders,
    buildings,
    allAcUnits,
    pendingUsers,
    allUsers,
    brands,
    weeklyActivity,
  } = await getOrgAdminData();
```

Replace with:

```tsx
  const {
    dbError,
    universityName,
    metrics,
    workOrders,
    buildings,
    allAcUnits,
    pendingUsers,
    allUsers,
    brands,
    weeklyActivity,
    urgentUnits,
  } = await getOrgAdminData();
```

Then find:

```tsx
      allUsers={allUsers}
      brands={brands || []}
      weeklyActivity={weeklyActivity}
    />
  );
}
```

Replace with:

```tsx
      allUsers={allUsers}
      brands={brands || []}
      weeklyActivity={weeklyActivity}
      urgentUnits={urgentUnits}
    />
  );
}
```

- [ ] **Step 2: Add the `urgentUnits` prop and import the new type in `admin-dashboard-view.tsx`**

Find (line 65):

```tsx
import { UpcomingMaintenanceTable } from "@/components/admin/upcoming-maintenance-table";
```

Replace with:

```tsx
import { UpcomingMaintenanceTable, type MaintenanceRow, type UrgentMaintenanceAC } from "@/components/admin/upcoming-maintenance-table";
```

Then find the `AdminDashboardViewProps` interface and add the new field (right after `weeklyActivity: Array<{ day: string; repairs: number }>;`):

```tsx
  weeklyActivity: Array<{ day: string; repairs: number }>;
  urgentUnits: UrgentMaintenanceAC[];
```

Then find the function's destructured parameters:

```tsx
export function AdminDashboardView({
  user,
  dbError,
  universityName,
  metrics,
  weeklyActivity = [],
  workOrders,
  buildings,
  allAcUnits,
  pendingUsers = [],
  allUsers = [],
  brands = [],
}: AdminDashboardViewProps) {
```

Replace with:

```tsx
export function AdminDashboardView({
  user,
  dbError,
  universityName,
  metrics,
  weeklyActivity = [],
  workOrders,
  buildings,
  allAcUnits,
  pendingUsers = [],
  allUsers = [],
  brands = [],
  urgentUnits = [],
}: AdminDashboardViewProps) {
```

- [ ] **Step 3: Replace the `upcomingMaintenanceAcs` memo with a combined, deduped, priority-sorted memo**

Find:

```tsx
  const upcomingMaintenanceAcs = useMemo(() => {
    const acs: any[] = [];
    buildings.forEach(b => {
      b.rooms.forEach(r => {
        r.acUnits.forEach(ac => {
          if (ac.maintenanceSchedule?.nextDueDate) {
            acs.push({
              id: ac.id,
              acCode: ac.acCode,
              brand: ac.brand || "ไม่ระบุยี่ห้อ",
              location: `${b.abbreviation} - ${r.name}`,
              nextDueDate: ac.maintenanceSchedule.nextDueDate
            });
          }
        });
      });
    });
    return acs.sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());
  }, [buildings]);
```

Replace with:

```tsx
  const priorityRank = (p: string | null) => (p === "critical" ? 0 : p === "high" ? 1 : 2);

  const combinedMaintenanceRows = useMemo((): MaintenanceRow[] => {
    const urgentIds = new Set(urgentUnits.map((u) => u.id));

    const urgentRows: MaintenanceRow[] = [...urgentUnits]
      .sort((a, b) => {
        const rankDiff = priorityRank(a.priority) - priorityRank(b.priority);
        if (rankDiff !== 0) return rankDiff;
        const aTime = a.reportedAt ? new Date(a.reportedAt).getTime() : 0;
        const bTime = b.reportedAt ? new Date(b.reportedAt).getTime() : 0;
        return aTime - bTime;
      })
      .map((u) => ({ kind: "urgent" as const, ...u }));

    const upcomingRows: Array<{ kind: "upcoming"; id: string; acCode: string; brand: string; location: string; nextDueDate: string }> = [];
    buildings.forEach((b) => {
      b.rooms.forEach((r) => {
        r.acUnits.forEach((ac) => {
          if (ac.maintenanceSchedule?.nextDueDate && !urgentIds.has(ac.id)) {
            upcomingRows.push({
              kind: "upcoming",
              id: ac.id,
              acCode: ac.acCode,
              brand: ac.brand || "ไม่ระบุยี่ห้อ",
              location: `${b.name} - ห้อง ${r.name}`,
              nextDueDate: ac.maintenanceSchedule.nextDueDate,
            });
          }
        });
      });
    });
    upcomingRows.sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());

    return [...urgentRows, ...upcomingRows];
  }, [urgentUnits, buildings]);
```

Note: `upcomingRows`' `location` now uses `b.name` (full building name, matching the format `urgentUnits` already uses: `${b.name} - ห้อง ${r.name}` from `src/app/admin/actions.ts`) instead of the old `b.abbreviation`, so both row kinds read consistently in the merged table.

- [ ] **Step 4: Add the assign handler and update the render call site**

Find where `<UpcomingMaintenanceTable>` is rendered:

```tsx
              <UpcomingMaintenanceTable 
                data={upcomingMaintenanceAcs} 
                onViewDetails={(acCode) => {
                  setActiveTab("assets");
                  setGlobalSearch(acCode);
                }}
                onCreateWorkOrder={handleOpenCalendarWorkOrder}
              />
```

Replace with:

```tsx
              <UpcomingMaintenanceTable
                data={combinedMaintenanceRows}
                onViewDetails={(acCode) => {
                  setActiveTab("assets");
                  setGlobalSearch(acCode);
                }}
                onCreateWorkOrder={handleOpenCalendarWorkOrder}
                onAssignWorkOrder={(acId) => {
                  const pendingWo = workOrders.find((wo) => wo.airConditionerId === acId && wo.status === "pending");
                  if (!pendingWo) {
                    setToastMessage({ type: "error", text: "ไม่พบใบงานที่รอดำเนินการสำหรับเครื่องนี้" });
                    return;
                  }
                  setSelectedOrderToAssign(pendingWo.id);
                  setShowAssignModal(true);
                }}
              />
```

This resolves the AC unit id → pending work order id using the `workOrders` list already available as a prop, then reuses the existing assign-modal state machine (`selectedOrderToAssign` / `showAssignModal` / `handleAssignSubmit` → `assignWorkOrderAction`) — no new modal or server action needed.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors anywhere in the project (this closes out the expected error from Task 2, Step 2).

- [ ] **Step 6: Manually verify in the browser**

Reload `http://localhost:3000/admin` (Overview tab):
- The card title now reads "รอซ่อมด่วน".
- Rows tagged "ซ่อมด่วน" / "ค้างล้าง" appear first, each showing "แจ้งเมื่อ" + a date instead of "วันครบกำหนด".
- No AC unit appears twice (an urgent unit should not also appear in the upcoming section).
- Any remaining rows below the urgent ones are tagged "กำหนดล้าง" and show the due date, sorted soonest-first, styled red if overdue.
- Open the `...` menu on an urgent row → click "มอบหมายช่าง" → the existing "มอบหมายงานให้ช่างเทคนิค" modal opens. Open the `...` menu on a "กำหนดล้าง" row → click "สร้างใบงานล้างแอร์" → the existing create-work-order flow still opens as before.

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/page.tsx src/components/admin/admin-dashboard-view.tsx
git commit -m "feat(admin): merge urgent units into maintenance table, wire assign action"
```

---

## Post-Plan Verification

1. `npx tsc --noEmit` — zero errors across the whole project.
2. Manual QA per Task 1 Step 5 and Task 3 Step 6 above.
3. Update `HANDOFF.md`: mark backlog items #5 and #6 done under the Org Admin section.

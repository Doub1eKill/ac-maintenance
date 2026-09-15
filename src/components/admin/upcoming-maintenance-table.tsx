"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  ColumnDef,
  ColumnFiltersState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type Row,
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowUpDown, CalendarRange, ChevronDown, Copy, UserPlus, Wrench, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BuildingGroupList,
  FloorGroupList,
  RoomGroupList,
  groupByBuilding,
  groupByFloor,
  groupByRoom,
} from "@/components/shared/building-groups";
import { CatalogueMark } from "@/components/shared/catalogue-mark";
import { MotionActivePill } from "@/components/ui/motion";

export interface UpcomingMaintenanceAC {
  id: string;
  acCode: string;
  brand: string;
  // Whether the brand/model behind that name has been retired from the
  // catalogue. See @/lib/catalogue-status.
  brandDeleted: boolean;
  modelDeleted: boolean;
  btu: number | null;
  location: string;
  roomLocation: string;
  roomId: string;
  roomName: string;
  floor: number | null;
  buildingId: string;
  buildingName: string;
  nextDueDate: string;
  // Always absent on a scheduled row — it is scheduled precisely because no job
  // has been raised. Declared so both halves of the union can be asked the same
  // question without narrowing first.
  pendingWorkOrderId?: null;
}

export interface UrgentMaintenanceAC {
  id: string;
  acCode: string;
  brand: string;
  brandDeleted: boolean;
  modelDeleted: boolean;
  btu: number | null;
  location: string;
  roomLocation: string;
  roomId: string;
  roomName: string;
  floor: number | null;
  buildingId: string;
  buildingName: string;
  status: string;
  priority: string | null;
  issueDescription: string | null;
  reportedAt: string | null;
  // The open work order on this unit, straight from the server's own query over
  // every pending job. `pendingWorkOrderId` below is the same value under the
  // name the table reads; both are kept so the row stays assignable whichever
  // one a caller reaches for.
  workOrderId?: string | null;
  pendingWorkOrderId?: string | null;
  nextDueDate?: string | null;
}

export type MaintenanceRow =
  | ({ kind: "upcoming" } & UpcomingMaintenanceAC)
  | ({ kind: "urgent" } & UrgentMaintenanceAC);

/**
 * What kind of work a row represents, decided in one place.
 *
 * `kind` alone does not say it: an "urgent" row is a repair or an overdue
 * clean depending on the unit's condition, and the two are as different to an
 * admin as either is to a scheduled clean. The rule used to live only inside
 * the type column's cell, so the building headers ended up labelling the sum of
 * the first two as "ด่วน" — a count that matched no badge in the table under it.
 */
export type JobTypeKind = "repair" | "overdueCleaning" | "scheduled";

export function jobTypeOf(item: MaintenanceRow): JobTypeKind {
  if (item.kind === "urgent" && item.status === "broken") return "repair";
  if (item.kind === "urgent" && item.status === "needs_cleaning") return "overdueCleaning";
  return "scheduled";
}

const JOB_TYPE_LABELS: Record<JobTypeKind, string> = {
  repair: "ซ่อมด่วน",
  overdueCleaning: "ค้างล้าง",
  scheduled: "กำหนดล้าง",
};

/** One badge, used both in the table's ประเภท column and in the group headers. */
export function JobTypeBadge({ kind, count }: { kind: JobTypeKind; count?: number }) {
  const label = count === undefined ? JOB_TYPE_LABELS[kind] : `${JOB_TYPE_LABELS[kind]} ${count}`;

  if (kind === "repair") {
    return <Badge variant="destructive" className="text-[10px]">{label}</Badge>;
  }
  if (kind === "overdueCleaning") {
    return (
      <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600 bg-amber-500/10">
        {label}
      </Badge>
    );
  }
  return <Badge variant="outline" className="text-[10px]">{label}</Badge>;
}

/**
 * The breakdown carried by a group header — one badge per kind of work, in the
 * wording and colour the ประเภท column uses on the rows themselves.
 *
 * Shared by the building header and the room header rather than written twice:
 * two levels summarising the same rows have to agree, and the way they stop
 * agreeing is one of them being edited alone.
 */
function GroupTypeBadges({ items }: { items: { row: Row<MaintenanceRow> }[] }) {
  const counts = { repair: 0, overdueCleaning: 0, scheduled: 0 };
  items.forEach((item) => {
    counts[jobTypeOf(item.row.original)] += 1;
  });

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {(["repair", "overdueCleaning", "scheduled"] as const)
        .filter((kind) => counts[kind] > 0)
        .map((kind) => (
          <JobTypeBadge key={kind} kind={kind} count={counts[kind]} />
        ))}
    </div>
  );
}

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
    cell: ({ row }) => {
      // No checkbox at all on a row that cannot be assigned. Selecting one was
      // always possible and never did anything — it just added to the count
      // while the button stayed at (0), which read as the button being broken.
      // The row's own control is "สร้างใบงาน"; once that raises a job, the
      // checkbox appears.
      if (!row.getCanSelect()) {
        return null;
      }

      // Stops the row's own onClick (opens the asset page) from firing when the
      // checkbox itself is what got clicked.
      return (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      );
    },
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
    header: () => <div className="text-xs font-bold">รุ่นแอร์</div>,
    cell: ({ row }) => (
      <div className="text-[10px] text-muted-foreground">
        {row.original.brand} {row.original.btu ? `(${row.original.btu} BTU)` : ""}
        <CatalogueMark
          brandDeleted={row.original.brandDeleted}
          modelDeleted={row.original.modelDeleted}
          className="ml-1"
        />
      </div>
    ),
  },
  {
    id: "type",
    header: () => <div className="text-xs font-bold">ประเภท</div>,
    cell: ({ row }) => <JobTypeBadge kind={jobTypeOf(row.original)} />,
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
          <div className="text-right text-xs space-y-0.5">
            <div>
              <div className="text-[10px] text-muted-foreground">แจ้งเมื่อ</div>
              <div className="font-medium text-red-500">{label}</div>
            </div>
            {item.nextDueDate && (
              <div className="text-[10px] text-muted-foreground">
                กำหนดล้าง: {new Date(item.nextDueDate).toLocaleDateString("th-TH")}
              </div>
            )}
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
    // No more "..." menu: copying a code and viewing details are frequent
    // enough to earn a direct control, and viewing details doubles as the
    // row's own click target. Assigning a technician moved out of this
    // per-row column entirely — it now works on whatever rows are ticked, via
    // the toolbar button below the table.
    cell: ({ row, table }) => {
      const item = row.original;
      const meta = table.options.meta as MaintenanceTableMeta | undefined;

      return (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="คัดลอกรหัสแอร์"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(item.acCode);
              toast.success(`คัดลอกรหัส ${item.acCode} แล้ว`);
            }}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          {/*
            Offered on every row that has no open job, not only the scheduled
            ones. Twelve units here are flagged broken or overdue with nothing
            raised against them: they could not be assigned — there is no job to
            assign — and had no control to raise one either, so the row was a
            dead end. This is the action those rows need.
          */}
          {!item.pendingWorkOrderId && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs px-2"
              onClick={(e) => {
                e.stopPropagation();
                meta?.onCreateWorkOrder?.(item.id);
              }}
            >
              {item.kind === "upcoming" ? "สร้างใบงานล้างแอร์" : "สร้างใบงาน"}
            </Button>
          )}
        </div>
      );
    },
  },
];

// What the column definitions reach through table.options.meta.
interface MaintenanceTableMeta {
  onViewDetails?: (acCode: string) => void;
  onCreateWorkOrder?: (acId: string) => void;
}

interface UpcomingMaintenanceTableProps extends MaintenanceTableMeta {
  data: MaintenanceRow[];
  onBulkAssignWorkOrder?: (workOrderIds: string[]) => void;
}

export function UpcomingMaintenanceTable({ data, onViewDetails, onCreateWorkOrder, onBulkAssignWorkOrder }: UpcomingMaintenanceTableProps) {
  const [filterKind, setFilterKind] = React.useState<"all" | "urgent" | "upcoming">("all");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const totalCount = data.length;
  // The two filters split rows by jobTypeOf, not by `kind`: an "urgent" row
  // is a repair or an overdue clean, and the "รอซ่อมด่วน" pill used to count
  // both — 52 against the KPI card's 25 for the same word on the same screen
  // (QA 20260913-1742, BUG-007). Repairs alone are what the card counts;
  // every cleaning row, overdue or scheduled, sits under the other pill,
  // and the subtitle spells out the split so each number matches a badge.
  const { urgentCount, overdueCleaningCount, scheduledCount } = React.useMemo(() => {
    let urgentCount = 0;
    let overdueCleaningCount = 0;
    let scheduledCount = 0;
    for (const d of data) {
      const t = jobTypeOf(d);
      if (t === "repair") urgentCount += 1;
      else if (t === "overdueCleaning") overdueCleaningCount += 1;
      else scheduledCount += 1;
    }
    return { urgentCount, overdueCleaningCount, scheduledCount };
  }, [data]);
  const upcomingCount = overdueCleaningCount + scheduledCount;

  const filteredData = React.useMemo(() => {
    if (filterKind === "urgent") return data.filter((d) => jobTypeOf(d) === "repair");
    if (filterKind === "upcoming") return data.filter((d) => jobTypeOf(d) !== "repair");
    return data;
  }, [data, filterKind]);

  // The dashboard revalidates and hands down a fresh `data` array after a
  // bulk assignment (or any other mutation) goes through. Clear ticked rows
  // when that happens — row selection is keyed by array index, so leaving it
  // alone would tick whatever rows happen to now sit at those same positions.
  React.useEffect(() => {
    setRowSelection({});
  }, [data, filterKind]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    // Only rows with an open work order can be picked, because assignment
    // happens on the job rather than on the unit. Declaring it here rather than
    // filtering afterwards is what makes the header's select-all skip them too,
    // instead of ticking rows that cannot go anywhere.
    enableRowSelection: (row) => Boolean(row.original.pendingWorkOrderId),
    // No pagination row model: the rows are grouped by building below and it is
    // the buildings that page, the way the technician lists do. Paginating the
    // rows as well would cut a building in half across two pages.
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    meta: {
      onViewDetails,
      onCreateWorkOrder,
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  // Grouped after filtering and sorting, so a building only appears when it has
  // a row that survived the search, and the rows inside it keep whatever order
  // the column headers asked for. groupByBuilding is the same helper the
  // technician lists use — a building with nothing in it never gets an entry,
  // so "hide empty buildings" needs no separate step.
  // Not memoized on purpose. getRowModel() hands back a fresh object on every
  // render, so a useMemo keyed on it would recompute anyway while giving the
  // React Compiler something it warns about holding onto (see the
  // react-hooks/incompatible-library note on useReactTable). Grouping a list
  // this size is a single pass over a handful of rows.
  const groups = groupByBuilding(
    table.getRowModel().rows.map((row) => ({
      buildingId: row.original.buildingId,
      buildingName: row.original.buildingName,
      roomId: row.original.roomId,
      roomName: row.original.roomName,
      floor: row.original.floor,
      row,
    }))
  );

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const assignableWorkOrderIds: string[] = [];
  selectedRows.forEach((row) => {
    const item = row.original;
    if (item.kind === "urgent" && item.pendingWorkOrderId) {
      assignableWorkOrderIds.push(item.pendingWorkOrderId);
    }
  });

  return (
    <div className="biz-card p-6 space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <CalendarRange className="w-5 h-5 text-primary" />
              {filterKind === "urgent"
                ? "รายการรอซ่อมด่วน"
                : filterKind === "upcoming"
                ? "รายการงานล้างแอร์"
                : "งานซ่อมบำรุงและกำหนดรอบล้าง"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {filterKind === "urgent"
                ? `พบ ${urgentCount} เครื่องที่แจ้งเสีย/ชำรุด รอซ่อมแซม`
                : filterKind === "upcoming"
                ? `พบ ${upcomingCount} รายการ (ค้างล้าง ${overdueCleaningCount} • กำหนดล้าง ${scheduledCount})`
                : `ทั้งหมด ${totalCount} รายการ (ซ่อมด่วน ${urgentCount} • ค้างล้าง ${overdueCleaningCount} • กำหนดล้าง ${scheduledCount})`}
            </p>
          </div>

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

        {/* Segmented Filter Control */}
        <div className="flex items-center p-1 bg-muted/60 rounded-xl border border-border/80 w-fit">
          <button
            type="button"
            onClick={() => setFilterKind("all")}
            className={cn(
              "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
              filterKind === "all"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {filterKind === "all" && (
              <MotionActivePill
                layoutId="maintenance-filter-pill"
                className="absolute inset-0 bg-card rounded-lg shadow-xs -z-10"
              />
            )}
            ทั้งหมด
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                filterKind === "all" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}
            >
              {totalCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilterKind("urgent")}
            className={cn(
              "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
              filterKind === "urgent"
                ? "text-destructive"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {filterKind === "urgent" && (
              <MotionActivePill
                layoutId="maintenance-filter-pill"
                className="absolute inset-0 bg-card rounded-lg shadow-xs -z-10"
              />
            )}
            <Wrench className="w-3.5 h-3.5" />
            รอซ่อมด่วน
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                filterKind === "urgent" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"
              )}
            >
              {urgentCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilterKind("upcoming")}
            className={cn(
              "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
              filterKind === "upcoming"
                ? "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {filterKind === "upcoming" && (
              <MotionActivePill
                layoutId="maintenance-filter-pill"
                className="absolute inset-0 bg-card rounded-lg shadow-xs -z-10"
              />
            )}
            <Sparkles className="w-3.5 h-3.5" />
            งานล้างแอร์
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                filterKind === "upcoming" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" : "bg-muted text-muted-foreground"
              )}
            >
              {upcomingCount}
            </span>
          </button>
        </div>
      </div>

      <BuildingGroupList
        groups={groups}
        getSubtitle={(group) => `${group.items.length} รายการ`}
        emptyMessage={
          filterKind === "urgent"
            ? "ไม่มีรายการแจ้งซ่อมด่วนในขณะนี้"
            : filterKind === "upcoming"
            ? "ไม่มีรายการค้างล้างหรือถึงกำหนดรอบล้างในขณะนี้"
            : "ไม่มีงานซ่อมด่วนหรือกำหนดล้างในขณะนี้"
        }
        // Collapsing back to the first building when the search changes, the
        // same way the technician lists do.
        resetKey={(table.getColumn("acCode")?.getFilterValue() as string) ?? ""}
        // One badge per kind of work in the building, using the same component
        // the ประเภท column uses, so a header count and the rows it summarises
        // always carry the same word and the same colour. The single "ด่วน N"
        // this replaces added repairs and overdue cleans together under a label
        // that matched neither.
        renderExtra={(group) => <GroupTypeBadges items={group.items} />}
        renderItems={(group) => (
          <FloorGroupList
            floors={groupByFloor(group.items)}
            getSubtitle={(floor) =>
              `${new Set(floor.items.map((i) => i.roomId)).size} ห้อง • ${floor.items.length} รายการ`
            }
            renderExtra={(floor) => <GroupTypeBadges items={floor.items} />}
            renderItems={(floor) => (
              <RoomGroupList
                rooms={groupByRoom(floor.items)}
                getSubtitle={(room) => `${room.items.length} รายการ`}
                renderExtra={(room) => <GroupTypeBadges items={room.items} />}
                renderItems={(room) => (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        {table.getHeaderGroups().map((headerGroup) => (
                          <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                              <TableHead key={header.id} className="h-10 px-4 whitespace-normal text-xs">
                                {header.isPlaceholder
                                  ? null
                                  : flexRender(header.column.columnDef.header, header.getContext())}
                              </TableHead>
                            ))}
                          </TableRow>
                        ))}
                      </TableHeader>
                      <TableBody>
                        {room.items.map(({ row }) => (
                          <TableRow
                            key={row.id}
                            data-state={row.getIsSelected() && "selected"}
                            className="h-12 cursor-pointer hover:bg-muted/50"
                            onClick={() => onViewDetails?.(row.original.acCode)}
                          >
                            {row.getVisibleCells().map((cell) => {
                              // The tick column swallows the row's own click and toggles
                              // instead, so the whole cell is the target rather than the
                              // 16px box inside it. Aiming for a checkbox and landing a
                              // few pixels off used to open the asset page — an easy
                              // miss on a phone, and a jarring one when the intent was
                              // to select several rows.
                              // Only the cells that actually hold a checkbox take the
                              // click. On a row that cannot be assigned the cell is
                              // empty, so it behaves like the rest of the row and opens
                              // the asset page rather than swallowing the click and
                              // appearing dead.
                              const isSelectCell = cell.column.id === "select" && row.getCanSelect();
                              return (
                                <TableCell
                                  key={cell.id}
                                  className={
                                    isSelectCell
                                      ? "px-4 py-2 whitespace-normal cursor-default"
                                      : "px-4 py-2 whitespace-normal"
                                  }
                                  onClick={
                                    isSelectCell
                                      ? (event) => {
                                          event.stopPropagation();
                                          // A click that landed on the checkbox itself is
                                          // already being handled by it; toggling here as
                                          // well would undo it immediately.
                                          if ((event.target as HTMLElement).closest('[role="checkbox"]')) {
                                            return;
                                          }
                                          row.toggleSelected(!row.getIsSelected());
                                        }
                                      : undefined
                                  }
                                >
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
            )}
              />
        )}
          />
        )}
      />

      {/*
        Sticks to the bottom of the viewport while the list is scrolled, so the
        action follows the rows being ticked. It used to live in the footer
        below every building section, which meant ticking a row near the top and
        then scrolling past five sections to reach the button.
      */}
      {selectedRows.length > 0 && (
        <div className="sticky bottom-4 z-10 rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-bold text-foreground">
                เลือกแล้ว {selectedRows.length} รายการ
              </div>
              {/*
                Says why the button is dead rather than leaving a "(0)" to be
                puzzled over. A row can be ticked and still not be assignable:
                assignment happens on a work order, and a unit flagged as broken
                or overdue does not necessarily have one.
              */}
              {/*
                Kept as a safety net. Rows without a job no longer offer a
                checkbox, so this should not be reachable — but if a row ever
                loses its job while ticked, saying so beats a silent (0).
              */}
              {assignableWorkOrderIds.length < selectedRows.length && (
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {assignableWorkOrderIds.length === 0
                    ? "รายการที่เลือกไม่มีใบงานแล้ว จึงมอบหมายช่างไม่ได้"
                    : `มอบหมายได้ ${assignableWorkOrderIds.length} รายการ ส่วนอีก ${
                        selectedRows.length - assignableWorkOrderIds.length
                      } รายการไม่มีใบงานแล้ว`}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs px-2"
                onClick={() => table.resetRowSelection()}
              >
                ล้างการเลือก
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs px-3 gap-1.5"
                disabled={assignableWorkOrderIds.length === 0}
                onClick={() => onBulkAssignWorkOrder?.(assignableWorkOrderIds)}
              >
                <UserPlus className="h-3.5 w-3.5" />
                มอบหมายช่าง ({assignableWorkOrderIds.length})
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-muted-foreground">
          เลือกแล้ว {selectedRows.length} จาก{" "}
          {table.getFilteredRowModel().rows.length} รายการ
        </div>
        <div className="text-xs text-muted-foreground">
          {groups.length} อาคาร
        </div>
      </div>
    </div>
  );
}

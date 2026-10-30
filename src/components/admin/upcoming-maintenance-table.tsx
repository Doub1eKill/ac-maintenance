"use client";

import * as React from "react";
import {
  ColumnFiltersState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
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
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  CalendarRange,
  ChevronDown,
  UserPlus,
  Wrench,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BuildingGroupList,
  FloorGroupList,
  RoomGroupList,
  groupByBuilding,
  groupByFloor,
  groupByRoom,
} from "@/components/shared/building-groups";
import { MotionActivePill } from "@/components/ui/motion";
import { columns, GroupTypeBadges, jobTypeOf, RoomSelectAll, type MaintenanceRow, type MaintenanceTableMeta } from "@/components/admin/upcoming-maintenance-columns";

export { columns, jobTypeOf, JobTypeBadge } from "@/components/admin/upcoming-maintenance-columns";
export type { UpcomingMaintenanceAC, UrgentMaintenanceAC, MaintenanceRow, JobTypeKind } from "@/components/admin/upcoming-maintenance-columns";

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

  // TanStack returns functions the React Compiler cannot memoise, so it skips
  // this component — intended, and not something a code change here can fix.
  // eslint-disable-next-line react-hooks/incompatible-library
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
                filterKind === "urgent" ? "bg-destructive/15 text-red-700 dark:text-red-300" : "bg-muted text-muted-foreground"
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
                ? "text-amber-700 dark:text-amber-400"
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
                                {header.isPlaceholder ? null : header.column.id === "select" ? (
                                  // The header is the whole table's, drawn once per room,
                                  // so the column's own tick would select every row on the
                                  // page — 45 from a room of two. This one is scoped to the
                                  // rows under it.
                                  <RoomSelectAll rows={room.items.map((i) => i.row)} />
                                ) : (
                                  flexRender(header.column.columnDef.header, header.getContext())
                                )}
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

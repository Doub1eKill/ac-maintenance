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
import { ArrowUpDown, CalendarRange, ChevronDown, Copy, UserPlus } from "lucide-react";
import { BuildingGroupList, groupByBuilding } from "@/components/shared/building-groups";

export interface UpcomingMaintenanceAC {
  id: string;
  acCode: string;
  brand: string;
  btu: number | null;
  location: string;
  buildingId: string;
  buildingName: string;
  nextDueDate: string;
}

export interface UrgentMaintenanceAC {
  id: string;
  acCode: string;
  brand: string;
  btu: number | null;
  location: string;
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
      // Stops the row's own onClick (opens the detail view) from firing when
      // the checkbox itself is what got clicked.
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
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
    header: () => <div className="text-xs font-bold">สถานที่ / รุ่นแอร์</div>,
    cell: ({ row }) => (
      <div>
        <div className="font-medium text-xs">{row.getValue("location")}</div>
        <div className="text-[10px] text-muted-foreground">
          {row.original.brand} {row.original.btu ? `(${row.original.btu} BTU)` : ""}
        </div>
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
      const meta = table.options.meta as any;

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
          {item.kind === "upcoming" && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs px-2"
              onClick={(e) => {
                e.stopPropagation();
                meta?.onCreateWorkOrder?.(item.id);
              }}
            >
              สร้างใบงานล้างแอร์
            </Button>
          )}
        </div>
      );
    },
  },
];

interface UpcomingMaintenanceTableProps {
  data: MaintenanceRow[];
  onViewDetails?: (acCode: string) => void;
  onCreateWorkOrder?: (acId: string) => void;
  onBulkAssignWorkOrder?: (workOrderIds: string[]) => void;
}

export function UpcomingMaintenanceTable({ data, onViewDetails, onCreateWorkOrder, onBulkAssignWorkOrder }: UpcomingMaintenanceTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  // The dashboard revalidates and hands down a fresh `data` array after a
  // bulk assignment (or any other mutation) goes through. Clear ticked rows
  // when that happens — row selection is keyed by array index, so leaving it
  // alone would tick whatever rows happen to now sit at those same positions.
  React.useEffect(() => {
    setRowSelection({});
  }, [data]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
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

      <BuildingGroupList
        groups={groups}
        getSubtitle={(group) => `${group.items.length} รายการ`}
        emptyMessage="ไม่มีงานซ่อมด่วนหรือกำหนดล้างในขณะนี้"
        // Collapsing back to the first building when the search changes, the
        // same way the technician lists do.
        resetKey={(table.getColumn("acCode")?.getFilterValue() as string) ?? ""}
        renderExtra={(group) => {
          const urgentCount = group.items.filter(
            (item) => item.row.original.kind === "urgent"
          ).length;
          return urgentCount > 0 ? (
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
              ด่วน {urgentCount}
            </span>
          ) : null;
        }}
        renderItems={(group) => (
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
                {group.items.map(({ row }) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="h-12 cursor-pointer hover:bg-muted/50"
                    onClick={() => onViewDetails?.(row.original.acCode)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-4 py-2 whitespace-normal">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      />

      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <div className="text-xs text-muted-foreground">
            เลือกแล้ว {selectedRows.length} จาก{" "}
            {table.getFilteredRowModel().rows.length} รายการ
          </div>
          {selectedRows.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2 gap-1.5"
              disabled={assignableWorkOrderIds.length === 0}
              title={
                assignableWorkOrderIds.length === 0
                  ? "แถวที่เลือกไม่มีใบงานค้างอยู่"
                  : undefined
              }
              onClick={() => onBulkAssignWorkOrder?.(assignableWorkOrderIds)}
            >
              <UserPlus className="h-3.5 w-3.5" />
              มอบหมายช่าง ({assignableWorkOrderIds.length})
            </Button>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {groups.length} อาคาร
        </div>
      </div>
    </div>
  );
}

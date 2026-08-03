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
  btu: number | null;
  location: string;
  nextDueDate: string;
}

export interface UrgentMaintenanceAC {
  id: string;
  acCode: string;
  brand: string;
  btu: number | null;
  location: string;
  status: string;
  priority: string | null;
  issueDescription: string | null;
  reportedAt: string | null;
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
            {item.kind === "urgent" && item.pendingWorkOrderId ? (
              <DropdownMenuItem onClick={() => meta?.onAssignWorkOrder?.(item.pendingWorkOrderId!)}>มอบหมายช่าง</DropdownMenuItem>
            ) : null}
            {item.kind === "upcoming" ? (
              <DropdownMenuItem onClick={() => meta?.onCreateWorkOrder?.(item.id)}>สร้างใบงานล้างแอร์</DropdownMenuItem>
            ) : null}
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
  onAssignWorkOrder?: (workOrderId: string) => void;
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

"use client";

import { toast } from "sonner";
import { ColumnDef, type Row } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Copy, UserCheck } from "lucide-react";
import { formatThaiDate } from "@/lib/labels";
import { CatalogueMark } from "@/components/shared/catalogue-mark";

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
  // Set when the unit's open job is already a technician's: nothing to raise
  // and nothing to assign, so the row says who has it instead.
  claimedByName?: string | null;
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
      <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-800 bg-amber-500/10">
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
export function GroupTypeBadges({ items }: { items: { row: Row<MaintenanceRow> }[] }) {
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

/**
 * The tick at the head of one room's table: all, some or none of that
 * room's assignable rows, and toggling it touches only those.
 */
export function RoomSelectAll({ rows }: { rows: Row<MaintenanceRow>[] }) {
  const selectable = rows.filter((r) => r.getCanSelect());
  if (selectable.length === 0) return null;
  const picked = selectable.filter((r) => r.getIsSelected()).length;
  const state = picked === selectable.length ? true : picked > 0 ? "indeterminate" : false;
  return (
    <Checkbox
      checked={state}
      onCheckedChange={(value) => {
        for (const r of selectable) r.toggleSelected(!!value);
      }}
      aria-label="เลือกทั้งห้อง"
    />
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
        const label = formatThaiDate(item.reportedAt);
        return (
          <div className="text-right text-xs space-y-0.5">
            <div>
              <div className="text-[10px] text-muted-foreground">แจ้งเมื่อ</div>
              <div className="font-medium text-red-500">{label}</div>
            </div>
            {item.nextDueDate && (
              <div className="text-[10px] text-muted-foreground">
                กำหนดล้าง: {formatThaiDate(item.nextDueDate)}
              </div>
            )}
          </div>
        );
      }
      const date = new Date(item.nextDueDate);
      const isOverdue = date.getTime() < new Date().getTime();
      return (
        <div className={`text-right text-xs font-medium ${isOverdue ? "text-red-500" : "text-foreground"}`}>
          {formatThaiDate(date)}
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
          {/* A job someone already holds: raising another would be refused
              (one open job per unit and type), so the row says who has it
              rather than offering a button that only ever toasts an error. */}
          {item.kind === "urgent" && item.claimedByName ? (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary whitespace-nowrap"
              title={`มอบหมายให้ ${item.claimedByName} แล้ว`}
            >
              <UserCheck className="h-3 w-3 shrink-0" />
              มอบหมายแล้ว · {item.claimedByName}
            </span>
          ) : !item.pendingWorkOrderId ? (
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
          ) : null}
        </div>
      );
    },
  },
];

// What the column definitions reach through table.options.meta.
export interface MaintenanceTableMeta {
  onViewDetails?: (acCode: string) => void;
  onCreateWorkOrder?: (acId: string) => void;
}

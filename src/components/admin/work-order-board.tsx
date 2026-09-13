"use client";

import { useMemo, useState } from "react";
import { Ban, CheckCircle2, ClipboardList, Clock, Sparkles, Wrench } from "lucide-react";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  BuildingGroupList,
  FloorGroupList,
  RoomGroupList,
  groupByBuilding,
  groupByFloor,
  groupByRoom,
} from "@/components/shared/building-groups";
import { CatalogueMark } from "@/components/shared/catalogue-mark";
import { useCreateWorkOrder } from "@/components/admin/create-work-order-provider";
import type { WorkOrderItem, WorkOrderPageInfo } from "@/components/admin/types";

interface WorkOrderBoardProps {
  workOrders: WorkOrderItem[];
  workOrderPage: WorkOrderPageInfo;
  globalSearch: string;
  onOpenDetails: (workOrder: WorkOrderItem) => void;
  onAssign: (workOrderId: string) => void;
}

type StatusFilter = "" | "pending" | "claimed" | "completed" | "cancelled";

const STATUS_FILTER_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: "", label: "ทุกสถานะ" },
  { value: "pending", label: "รอดำเนินการ" },
  { value: "claimed", label: "กำลังดำเนินการ" },
  { value: "completed", label: "เสร็จสิ้น" },
  { value: "cancelled", label: "ยกเลิกแล้ว" },
];

function getWorkOrderRowClassName(wo: WorkOrderItem) {
  // No status color separately here — the "สถานะ" column already carries a
  // labeled badge (icon + text) for that, and a second, unlabeled colored
  // strip repeating the same information read as unexplained decoration
  // rather than a second signal.

  // Low-opacity token tints rather than literal bg-red-50/bg-orange-50 —
  // those stay near-white regardless of theme, which reads fine against
  // light-mode's white table but washes the token-colored text out (or
  // just looks like a stray light patch) once the row itself goes dark.
  const tintClass =
    wo.priority === "critical" ? "bg-destructive/10" :
    wo.priority === "high" ? "bg-warning/10" :
    "";

  const fadeClass = wo.status === "completed" ? "opacity-60" : "";

  return `${tintClass} ${fadeClass}`.trim();
}

// The same four fields the board's search used to match in SQL: unit code,
// brand, location and the technician holding the job. `location` is assembled
// from the building name, its abbreviation and the room, so typing any of
// those still finds the row.
function matchesSearch(wo: WorkOrderItem, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    wo.acCode.toLowerCase().includes(q) ||
    wo.brand.toLowerCase().includes(q) ||
    wo.location.toLowerCase().includes(q) ||
    (wo.claimedByName ?? "").toLowerCase().includes(q)
  );
}

// The counts a group header carries. Two axes: งานซ่อม + งานล้างแอร์ add up to
// the group's total, while รอดำเนินการ and กำลังดำเนินการ cut across both and
// do not — the group also holds finished and cancelled jobs. Each badge uses
// the wording and colour its own column already uses in the rows below, so a
// header count and the rows it summarises read as the same thing rather than
// as separate numbers to reconcile — the mistake the urgent table's old
// "ด่วน N" made.
//
// One component for the building header and the room header: two levels
// summarising the same rows have to agree, and the way they stop agreeing is
// one of them being edited alone.
function GroupTypeBadges({ items }: { items: WorkOrderItem[] }) {
  const repair = items.filter((wo) => wo.type === "repair").length;
  const cleaning = items.filter((wo) => wo.type === "cleaning").length;
  const pending = items.filter((wo) => wo.status === "pending").length;
  const claimed = items.filter((wo) => wo.status === "claimed").length;

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {repair > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-destructive/20 bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive whitespace-nowrap">
          <Wrench className="h-3 w-3" />
          งานซ่อม {repair}
        </span>
      )}
      {cleaning > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-600 whitespace-nowrap">
          <Sparkles className="h-3 w-3" />
          งานล้างแอร์ {cleaning}
        </span>
      )}
      {pending > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/20 px-2 py-0.5 text-[10px] font-bold text-warning-foreground whitespace-nowrap">
          <Clock className="h-3 w-3" />
          รอดำเนินการ {pending}
        </span>
      )}
      {claimed > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary whitespace-nowrap">
          <Wrench className="h-3 w-3" />
          กำลังดำเนินการ {claimed}
        </span>
      )}
    </div>
  );
}

// Groups the board by building, the way the technician lists and the urgent
// table already read, so five buildings show as five sections instead of one
// flat table repeating the building name down every row.
//
// This is why the board no longer pages fifty rows at a time. A group can only
// be built from rows that are actually here, so paging in SQL would have split
// a building across pages — the exact thing grouping the urgent table was
// meant to stop. Filtering came back to the client along with the rows, and
// the building dropdown went away with it: the section headers are the
// building filter now, and a select that collapses four of five headers said
// nothing they were not already saying.
export function WorkOrderBoard({
  workOrders,
  workOrderPage,
  globalSearch,
  onOpenDetails,
  onAssign,
}: WorkOrderBoardProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");

  const filtered = useMemo(
    () =>
      workOrders.filter(
        (wo) => (statusFilter === "" || wo.status === statusFilter) && matchesSearch(wo, globalSearch)
      ),
    [workOrders, statusFilter, globalSearch]
  );

  const groups = useMemo(() => groupByBuilding(filtered), [filtered]);

  // The order raised a moment ago from the shell's modal: open its building
  // on whichever page it sits, instead of leaving the admin to find it.
  const { lastCreated } = useCreateWorkOrder();
  const focus = useMemo(() => {
    if (!lastCreated) return null;
    const row = workOrders.find((wo) => wo.airConditionerId === lastCreated.airConditionerId);
    return row ? { buildingId: row.buildingId, token: lastCreated.token } : null;
  }, [lastCreated, workOrders]);

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" /> ระบบจัดการงานซ่อมบำรุง
        </h2>
        <div className="text-sm text-muted-foreground font-medium">
          ทั้งหมด <span className="font-bold text-foreground">{filtered.length}</span> รายการ
        </div>
      </div>

      {workOrderPage.hasMore && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-xs text-warning-foreground">
          แสดงใบงานล่าสุด {workOrderPage.loaded} รายการ จากทั้งหมด {workOrderPage.total} รายการ ·
          ใบงานที่เก่ากว่านั้นยังไม่ถูกโหลดมา จึงไม่อยู่ในกลุ่มอาคารและการค้นหาด้านล่าง
        </div>
      )}

      <div className="w-full sm:w-48">
        <NativeSelect
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          aria-label="กรองตามสถานะ"
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <NativeSelectOption key={opt.value} value={opt.value}>
              {opt.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      <BuildingGroupList
        groups={groups}
        focus={focus}
        resetKey={`${globalSearch}::${statusFilter}`}
        getSubtitle={(group) => `${group.items.length} ใบงาน`}
        emptyMessage="ไม่พบข้อมูลใบงาน"
        renderExtra={(group) => <GroupTypeBadges items={group.items} />}
        renderItems={(group) => (
          <FloorGroupList
            floors={groupByFloor(group.items)}
            getSubtitle={(floor) =>
              `${new Set(floor.items.map((i) => i.roomId)).size} ห้อง • ${floor.items.length} ใบงาน`
            }
            renderExtra={(floor) => <GroupTypeBadges items={floor.items} />}
            renderItems={(floor) => (
              <RoomGroupList
                rooms={groupByRoom(floor.items)}
                getSubtitle={(room) => `${room.items.length} ใบงาน`}
                renderExtra={(room) => <GroupTypeBadges items={room.items} />}
                renderItems={(room) => (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="border-b border-border text-muted-foreground font-semibold">
                        <tr>
                          <th className="px-4 py-3 whitespace-nowrap">รหัสแอร์</th>
                          <th className="px-4 py-3">ยี่ห้อ / ขนาด</th>
                          <th className="px-4 py-3 whitespace-nowrap">ประเภทงาน</th>
                          <th className="px-4 py-3 whitespace-nowrap">วันที่แจ้ง</th>
                          <th className="px-4 py-3 whitespace-nowrap">ผู้รับผิดชอบ</th>
                          <th className="px-4 py-3 whitespace-nowrap text-center">สถานะ</th>
                          <th className="px-4 py-3 whitespace-nowrap text-right">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {room.items.map((wo) => (
                          <tr
                            key={wo.id}
                            className={`hover:bg-muted transition-colors cursor-pointer ${getWorkOrderRowClassName(wo)}`}
                            onClick={() => onOpenDetails(wo)}
                          >
                            <td className="px-4 py-3 whitespace-nowrap font-mono font-bold text-base text-foreground">
                              {wo.acCode}
                            </td>
                            <td className="px-4 py-3 max-w-[190px]">
                              <div className="text-xs text-muted-foreground">
                                {wo.brand} {wo.btu ? `(${wo.btu} BTU)` : ""}
                                <CatalogueMark brandDeleted={wo.brandDeleted} modelDeleted={wo.modelDeleted} className="ml-1" />
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {wo.type === "repair" ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20">
                                  <Wrench className="h-3 w-3" />
                                  งานซ่อม
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/10 text-sky-600 border border-sky-500/20">
                                  <Sparkles className="h-3 w-3" />
                                  งานล้างแอร์
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                              {wo.createdAt ? new Date(wo.createdAt).toLocaleDateString("th-TH") : "-"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {wo.claimedByName ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                                    {wo.claimedByName.charAt(0)}
                                  </div>
                                  <span className="font-medium text-foreground">{wo.claimedByName}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground italic">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              {wo.status === "pending" && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-warning/20 text-warning-foreground border border-warning/30">
                                  <Clock className="h-3 w-3" />
                                  รอดำเนินการ
                                </span>
                              )}
                              {wo.status === "claimed" && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/20 text-primary border border-primary/30">
                                  <Wrench className="h-3 w-3" />
                                  กำลังดำเนินการ
                                </span>
                              )}
                              {wo.status === "completed" && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-success/20 text-success-foreground border border-success/30">
                                  <CheckCircle2 className="h-3 w-3" />
                                  เสร็จสิ้น
                                </span>
                              )}
                              {wo.status === "cancelled" && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-muted text-muted-foreground border border-border">
                                  <Ban className="h-3 w-3" />
                                  ยกเลิกแล้ว
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              {wo.status === "pending" ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAssign(wo.id);
                                  }}
                                  className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-bold text-primary bg-primary/10 border border-primary/30 rounded-lg hover:bg-primary/20 transition-colors"
                                >
                                  จ่ายงาน
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => { e.stopPropagation(); onOpenDetails(wo); }}
                                  className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-bold text-foreground bg-secondary border border-border rounded-lg hover:bg-secondary/80 transition-colors"
                                >
                                  ดูรายละเอียด
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
            )}
              />
        )}
          />
        )}
      />
    </div>
  );
}

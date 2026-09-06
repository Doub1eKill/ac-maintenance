"use client";

import { format } from "date-fns";
import { Clock, Droplets, Snowflake, Wrench } from "lucide-react";
import {
  BuildingGroupList,
  FloorGroupList,
  RoomGroupList,
  groupByBuilding,
  groupByFloor,
  groupByRoom,
} from "@/components/shared/building-groups";
import type { TechnicianAssetUnit, TechnicianAssetSummary } from "@/lib/maintenance";
import { filterJobs } from "@/components/tech/types";
import { CatalogueMark } from "@/components/shared/catalogue-mark";

interface AssetsPanelProps {
  assetList: TechnicianAssetUnit[];
  assetSummary: TechnicianAssetSummary;
  searchQuery: string;
  selectedBuilding: string;
  // Opens the shared history modal on one unit. Optional so the panel still
  // renders read-only wherever no handler is wired.
  onViewHistory?: (airConditionerId: string) => void;
}

// The open work on a group of units, as the two badges the cards themselves
// use. Shared by the building header and the room header so the two levels
// cannot drift apart.
function GroupJobBadges({ items }: { items: TechnicianAssetUnit[] }) {
  const repairCount = items.filter((u) => u.pendingWorkOrder?.type === "repair").length;
  const cleaningCount = items.filter((u) => u.pendingWorkOrder?.type === "cleaning").length;
  if (repairCount === 0 && cleaningCount === 0) return null;

  return (
    <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold">
      {repairCount > 0 && (
        <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 text-destructive px-1.5 py-0.5">
          <Wrench className="h-3 w-3" /> {repairCount}
        </span>
      )}
      {cleaningCount > 0 && (
        <span className="inline-flex items-center gap-1 rounded-md bg-warning/10 text-warning-foreground px-1.5 py-0.5">
          <Droplets className="h-3 w-3" /> {cleaningCount}
        </span>
      )}
    </div>
  );
}

export function AssetsPanel({
  assetList,
  assetSummary,
  searchQuery,
  selectedBuilding,
  onViewHistory,
}: AssetsPanelProps) {
  const filteredAssets = filterJobs(assetList, searchQuery, selectedBuilding);
  const groups = groupByBuilding(filteredAssets);

  return (
    <div className="animate-in fade-in">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="biz-card p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
              <Snowflake className="h-3.5 w-3.5 text-primary" /> ทั้งหมด
            </div>
            <div className="text-xl font-bold text-foreground">{assetSummary.total}</div>
          </div>
          <div className="biz-card p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
              <Wrench className="h-3.5 w-3.5 text-red-500" /> รอซ่อม
            </div>
            <div className="text-xl font-bold text-foreground">{assetSummary.repairJobs}</div>
          </div>
          <div className="biz-card p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
              <Droplets className="h-3.5 w-3.5 text-amber-500" /> รอล้าง
            </div>
            <div className="text-xl font-bold text-foreground">{assetSummary.cleaningJobs}</div>
          </div>
        </div>

        <BuildingGroupList
          groups={groups}
          getSubtitle={(g) => {
            const floors = new Set(g.items.map((u) => u.floor ?? 0)).size;
            const rooms = new Set(g.items.map((u) => u.roomName)).size;
            return `${floors} ชั้น • ${rooms} ห้อง • ${g.items.length} แอร์`;
          }}
          emptyMessage="ไม่มีเครื่องปรับอากาศในระบบ"
          resetKey={`${searchQuery}|${selectedBuilding}`}
          renderExtra={(group) => <GroupJobBadges items={group.items} />}
          renderItems={(group) => (
            <FloorGroupList
              floors={groupByFloor(group.items)}
              getSubtitle={(floor) =>
                `${new Set(floor.items.map((i) => i.roomId)).size} ห้อง • ${floor.items.length} แอร์`
              }
              renderExtra={(floor) => <GroupJobBadges items={floor.items} />}
              renderItems={(floor) => (
                <RoomGroupList
                  rooms={groupByRoom(floor.items)}
                  getSubtitle={(room) => `${room.items.length} แอร์`}
                  renderExtra={(room) => <GroupJobBadges items={room.items} />}
                  renderItems={(room) => (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {room.items.map((unit) => (
                        <div key={unit.id} className="biz-card p-5 space-y-4 hover:border-muted-foreground transition-all relative overflow-hidden">
                          {unit.isOverdue && (
                            <div
                              className={`absolute top-0 right-0 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-sm ${
                                unit.status === "broken" ? "bg-red-500" : "bg-amber-500"
                              }`}
                            >
                              <Clock className="w-3 h-3" /> {unit.status === "broken" ? "รอซ่อม" : "รอล้าง"}
                            </div>
                          )}
                          <div className="pr-8 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-muted-foreground">{unit.acCode}</span>
                              <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold text-foreground">
                                {unit.brand} {unit.btu ? `(${unit.btu} BTU)` : ""}
                                <CatalogueMark
                                  brandDeleted={unit.brandDeleted}
                                  modelDeleted={unit.modelDeleted}
                                  className="ml-1"
                                />
                              </span>
                            </div>
                          </div>

                          <div className="pt-2 flex items-center justify-between gap-3 text-xs border-t border-border">
                            <div className="flex flex-col">
                              <span className="text-[11px] font-bold text-muted-foreground">ล้างล่าสุด</span>
                              <span className="text-[10px] text-muted-foreground mt-1">
                                {unit.lastCleanedAt ? format(new Date(unit.lastCleanedAt), "dd/MM/yyyy") : "ยังไม่เคยล้าง"}
                              </span>
                            </div>
                            {/* A real button rather than making the whole card
                                clickable, which is how /tech/history opens the
                                same modal: this card already carries a status
                                ribbon and a brand chip, so a card-wide click
                                target gives no clue that it does anything.
                                Same wording and shape as the admin asset
                                manager's — it opens the identical modal. */}
                            {onViewHistory && (
                              <button
                                type="button"
                                onClick={() => onViewHistory(unit.id)}
                                className="inline-flex shrink-0 items-center justify-center gap-1 rounded border border-border bg-card px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                              >
                                <Clock className="h-3 w-3" /> ดูประวัติ
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
              )}
                />
          )}
            />
          )}
        />
      </div>
    </div>
  );
}

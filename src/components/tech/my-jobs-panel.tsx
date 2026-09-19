"use client";

import { format } from "date-fns";
import { AlertTriangle, Clock } from "lucide-react";
import {
  BuildingGroupList,
  FloorGroupList,
  RoomGroupList,
  groupByBuilding,
  groupByFloor,
  groupByRoom,
} from "@/components/shared/building-groups";
import type { TechJobItem } from "@/components/tech/types";
import { filterJobs } from "@/components/tech/types";
import { CatalogueMark } from "@/components/shared/catalogue-mark";
import { WorkOrderTypeBadge } from "@/components/shared/work-order-badges";

interface MyJobsPanelProps {
  myJobs: TechJobItem[];
  searchQuery: string;
  selectedBuilding: string;
  onSelectForLog: (job: TechJobItem) => void;
  // Opens the shared history modal on the unit this job belongs to. Optional
  // so the panel still renders read-only wherever no handler is wired.
  onViewHistory?: (airConditionerId: string) => void;
}

export function MyJobsPanel({
  myJobs,
  searchQuery,
  selectedBuilding,
  onSelectForLog,
  onViewHistory,
}: MyJobsPanelProps) {
  const filteredMyJobs = filterJobs(myJobs, searchQuery, selectedBuilding);
  const groups = groupByBuilding(filteredMyJobs);

  return (
    <div className="animate-in fade-in">
      <BuildingGroupList
        groups={groups}
        getSubtitle={(g) => `${g.items.length} งาน`}
        emptyMessage="คุณไม่มีงานที่กำลังดำเนินการ"
        resetKey={`${searchQuery}|${selectedBuilding}`}
        renderItems={(group) => (
          <FloorGroupList
            floors={groupByFloor(group.items)}
            getSubtitle={(floor) =>
              `${new Set(floor.items.map((i) => i.roomId)).size} ห้อง • ${floor.items.length} ใบงาน`
            }
            renderItems={(floor) => (
              <RoomGroupList
                rooms={groupByRoom(floor.items)}
                getSubtitle={(room) => `${room.items.length} ใบงาน`}
                renderItems={(room) => (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {room.items.map((job) => (
                      <div
                        key={job.id}
                        className="biz-card p-5 space-y-4 hover:border-muted-foreground transition-all relative overflow-hidden"
                      >
                        {job.priority === "critical" ? (
                          <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-sm">
                            <AlertTriangle className="w-3 h-3" /> ด่วนที่สุด
                          </div>
                        ) : job.priority === "high" ? (
                          <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-sm">
                            <AlertTriangle className="w-3 h-3" /> ด่วน
                          </div>
                        ) : null}
                        {/* pr-8 keeps this clear of the priority ribbon pinned
                            to the card's top-right corner. */}
                        <div className="flex items-center pr-8">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-muted-foreground">
                                {job.acCode}
                              </span>
                              <span className="rounded-md px-2 py-0.5 text-[10px] font-bold bg-secondary text-foreground">
                                {job.brand}
                                <CatalogueMark
                                  brandDeleted={job.brandDeleted}
                                  modelDeleted={job.modelDeleted}
                                  className="ml-1"
                                />
                              </span>
                            </div>
                            {job.type && <WorkOrderTypeBadge type={job.type} size="sm" />}
                          </div>
                        </div>

                        <div className="pt-2 flex items-center justify-between text-xs border-t border-border">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-sky-400">กำลังดำเนินการ</span>
                            <span className="text-[10px] mt-1 text-muted-foreground">
                              {job.claimedAt ? `รับงานเมื่อ: ${format(new Date(job.claimedAt), "dd/MM HH:mm")}` : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Same button, same wording as the asset list's —
                                it opens the identical modal. Worth having here
                                too: what was done to this unit last time is the
                                thing you want before starting, not after. */}
                            {onViewHistory && job.airConditionerId && (
                              <button
                                type="button"
                                onClick={() => onViewHistory(job.airConditionerId!)}
                                className="inline-flex shrink-0 items-center justify-center gap-1 rounded border border-border bg-card px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                              >
                                <Clock className="h-3 w-3" /> ดูประวัติ
                              </button>
                            )}
                            <button
                              onClick={() => onSelectForLog(job)}
                              className="rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-sm active:scale-95 bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                              บันทึกและปิดงาน
                            </button>
                          </div>
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
  );
}

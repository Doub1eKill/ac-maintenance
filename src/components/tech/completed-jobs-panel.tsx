"use client";

import { format } from "date-fns";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
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
import { JobTypeBadge } from "@/components/tech/job-type-badge";

interface CompletedJobsPanelProps {
  completedJobs: TechJobItem[];
  searchQuery: string;
  selectedBuilding: string;
  onViewHistory?: (airConditionerId: string) => void;
}

export function CompletedJobsPanel({ completedJobs, searchQuery, selectedBuilding, onViewHistory }: CompletedJobsPanelProps) {
  const filteredCompletedJobs = filterJobs(completedJobs, searchQuery, selectedBuilding);
  const groups = groupByBuilding(filteredCompletedJobs);

  return (
    <div className="animate-in fade-in">
      <BuildingGroupList
        groups={groups}
        getSubtitle={(g) => `${g.items.length} งาน`}
        emptyMessage="ไม่มีประวัติการทำงาน"
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
                        onClick={() => job.airConditionerId && onViewHistory?.(job.airConditionerId)}
                        className="biz-card p-5 space-y-4 hover:border-muted-foreground transition-all bg-muted cursor-pointer"
                      >
                        <div className="flex items-center justify-between opacity-80">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-muted-foreground">{job.acCode}</span>
                              <span className="rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                                {job.brand}
                                <CatalogueMark
                                  brandDeleted={job.brandDeleted}
                                  modelDeleted={job.modelDeleted}
                                  className="ml-1"
                                />
                              </span>
                              <JobTypeBadge type={job.type} />
                              {job.priority === "critical" && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800">
                                  <AlertTriangle className="h-3 w-3" /> ด่วนที่สุด
                                </span>
                              )}
                              {job.priority === "high" && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-800">
                                  <AlertTriangle className="h-3 w-3" /> ด่วน
                                </span>
                              )}
                            </div>
                          </div>
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        </div>

                        <div className="pt-2 flex items-center justify-between text-xs border-t border-border text-muted-foreground">
                          <span className="text-[11px] font-bold text-success">เสร็จสิ้นแล้ว</span>
                          <span className="text-[10px] font-semibold">
                            {job.completedAt ? `เมื่อ: ${format(new Date(job.completedAt), "dd/MM/yyyy HH:mm")}` : ""}
                          </span>
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

"use client";

import { useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, Clock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
import { MotionCard } from "@/components/ui/motion";
import { motion, AnimatePresence } from "motion/react";

interface JobPoolPanelProps {
  jobPool: TechJobItem[];
  searchQuery: string;
  selectedBuilding: string;
  isPending: boolean;
  onClaim: (workOrderId: string) => void;
  onBulkClaim: (workOrderIds: string[]) => Promise<boolean>;
}

function isUrgent(dateString?: string | null) {
  if (!dateString) return false;
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 3;
}

export function JobPoolPanel({ jobPool, searchQuery, selectedBuilding, isPending, onClaim, onBulkClaim }: JobPoolPanelProps) {
  const [rawSelectedIds, setSelectedPoolIds] = useState<string[]>([]);

  // Ticks are dropped the moment the filters change, in the same render.
  const filterKey = `${searchQuery}|${selectedBuilding}`;
  const [keyForSelection, setKeyForSelection] = useState(filterKey);
  if (keyForSelection !== filterKey) {
    setKeyForSelection(filterKey);
    setSelectedPoolIds([]);
  }

  // Ticks on jobs that have since left the pool (claimed by this tech or
  // someone else) are ignored rather than stored, so the "เลือกแล้ว N งาน"
  // count never lags reality.
  const selectedPoolIds = rawSelectedIds.filter((id) => jobPool.some((job) => job.id === id));

  function togglePoolSelection(jobId: string) {
    setSelectedPoolIds((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    );
  }

  const filteredPool = filterJobs(jobPool, searchQuery, selectedBuilding);
  // Buildings ordered by their newest open job rather than by name: the pool
  // is where a technician looks for what has just come in, and five
  // alphabetical buildings to a page put a fresh order for "Library
  // Building" on page 2 with nothing to say so (QA 20260913-1742, BUG-008).
  // jobPool arrives newest-first, so the first item of each group is its
  // newest and the groups keep that order once stably sorted by it.
  const newest = (items: typeof filteredPool) =>
    items.reduce((max, j) => (j.createdAt && j.createdAt > max ? j.createdAt : max), "");
  const groups = groupByBuilding(filteredPool).sort((a, b) =>
    newest(b.items).localeCompare(newest(a.items))
  );

  return (
    <div className="animate-in fade-in">
      <div className="space-y-4">
        <BuildingGroupList
          groups={groups}
          getSubtitle={(g) => `${g.items.length} งาน`}
          emptyMessage="ไม่มีงานซ่อมบำรุงที่รอรับ"
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
                        <MotionCard
                          key={job.id}
                          className="biz-card p-5 space-y-4 hover:border-muted-foreground transition-all relative overflow-hidden flex flex-col justify-between"
                        >
                          <div>
                            {job.priority === "critical" ? (
                              <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-sm">
                                <AlertTriangle className="w-3 h-3" /> ด่วนที่สุด
                              </div>
                            ) : job.priority === "high" ? (
                              <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-sm">
                                <AlertTriangle className="w-3 h-3" /> ด่วน
                              </div>
                            ) : isUrgent(job.createdAt) ? (
                              <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-sm">
                                <Clock className="w-3 h-3" /> รอนาน
                              </div>
                            ) : null}
                            <div className="pr-8 space-y-1">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={selectedPoolIds.includes(job.id)}
                                  onCheckedChange={() => togglePoolSelection(job.id)}
                                  aria-label={`เลือก ${job.acCode}`}
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-muted-foreground">{job.acCode}</span>
                                <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold text-foreground">
                                  {job.brand} {job.btu ? `(${job.btu} BTU)` : ""}
                                  <CatalogueMark
                                    brandDeleted={job.brandDeleted}
                                    modelDeleted={job.modelDeleted}
                                    className="ml-1"
                                  />
                                </span>
                                {job.type && <WorkOrderTypeBadge type={job.type} size="sm" />}
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 flex items-center justify-between text-xs border-t border-border mt-3">
                            <div className="flex flex-col">
                              <span className="text-[11px] font-bold text-warning-foreground">รอรับงาน</span>
                              <span className="text-[10px] text-muted-foreground mt-1">
                                {job.createdAt ? `แจ้งเมื่อ: ${format(new Date(job.createdAt), "dd/MM/yyyy")}` : ""}
                              </span>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.94 }}
                              onClick={() => onClaim(job.id)}
                              disabled={isPending}
                              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                            >
                              รับงาน
                            </motion.button>
                          </div>
                        </MotionCard>
                      ))}
                    </div>
              )}
                />
          )}
            />
          )}
        />

        <AnimatePresence>
          {selectedPoolIds.length > 0 && (
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="sticky bottom-0 z-30 bg-background/95 py-2 backdrop-blur-sm"
            >
              <div className="biz-card p-4 flex items-center justify-between gap-3 bg-secondary/40 border-dashed">
                <span className="text-xs font-bold text-foreground">เลือกแล้ว {selectedPoolIds.length} งาน</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedPoolIds([])}
                    className="rounded-xl border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted transition-all cursor-pointer"
                  >
                    ยกเลิกการเลือก
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={async () => {
                      if (selectedPoolIds.length === 0) return;
                      const success = await onBulkClaim(selectedPoolIds);
                      if (success) setSelectedPoolIds([]);
                    }}
                    disabled={isPending}
                    className="rounded-xl bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    รับงานที่เลือก ({selectedPoolIds.length})
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

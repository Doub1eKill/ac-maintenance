"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { MyJobsPanel } from "@/components/tech/my-jobs-panel";
import { useTechFilters } from "@/components/tech/tech-shell";
import type { TechJobItem } from "@/components/tech/types";
import { releaseWorkOrderAction } from "@/app/tech/actions";

export function MyJobsClient({ myJobs }: { myJobs: TechJobItem[] }) {
  const { search, building, openLogFor, openHistoryFor } = useTechFilters();
  const [isReleasing, startRelease] = useTransition();

  // The list refreshes itself: the action revalidates /tech, and the job
  // leaves this page for the pool.
  function release(workOrderId: string) {
    startRelease(async () => {
      const res = await releaseWorkOrderAction(workOrderId);
      if ("error" in res) toast.error(res.error);
      else toast.success("คืนงานแล้ว งานกลับไปรอรับงาน");
    });
  }

  return (
    <MyJobsPanel
      myJobs={myJobs}
      searchQuery={search}
      selectedBuilding={building}
      onSelectForLog={openLogFor}
      onViewHistory={openHistoryFor}
      onRelease={release}
      isReleasing={isReleasing}
    />
  );
}

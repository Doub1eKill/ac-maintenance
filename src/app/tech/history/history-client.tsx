"use client";

import { CompletedJobsPanel } from "@/components/tech/completed-jobs-panel";
import { useTechFilters } from "@/components/tech/tech-shell";
import type { TechJobItem } from "@/components/tech/types";

export function HistoryClient({ completedJobs }: { completedJobs: TechJobItem[] }) {
  const { search, building, openHistoryFor } = useTechFilters();
  return (
    <CompletedJobsPanel
      completedJobs={completedJobs}
      searchQuery={search}
      selectedBuilding={building}
      onViewHistory={openHistoryFor}
    />
  );
}

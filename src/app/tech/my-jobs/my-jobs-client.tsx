"use client";

import { MyJobsPanel } from "@/components/tech/my-jobs-panel";
import { useTechFilters } from "@/components/tech/tech-shell";
import type { TechJobItem } from "@/components/tech/types";

export function MyJobsClient({ myJobs }: { myJobs: TechJobItem[] }) {
  const { search, building, openLogFor } = useTechFilters();
  return (
    <MyJobsPanel
      myJobs={myJobs}
      searchQuery={search}
      selectedBuilding={building}
      onSelectForLog={openLogFor}
    />
  );
}

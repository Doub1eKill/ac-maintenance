"use client";

import { JobPoolPanel } from "@/components/tech/job-pool-panel";
import { useTechFilters } from "@/components/tech/tech-shell";
import { bulkClaimWorkOrdersAction } from "@/app/tech/actions";
import { toast } from "sonner";
import type { TechJobItem } from "@/components/tech/types";

export function JobPoolClient({ jobPool }: { jobPool: TechJobItem[] }) {
  const { search, building, isPending, claim } = useTechFilters();

  async function bulkClaim(workOrderIds: string[]): Promise<boolean> {
    const res = await bulkClaimWorkOrdersAction(workOrderIds);
    if ("error" in res) {
      toast.error(res.error ?? "เกิดข้อผิดพลาดในการรับงานหลายรายการ");
      return false;
    }
    toast.success(
      `รับงานสำเร็จ ${res.claimedCount} งาน${
        res.skippedCount > 0 ? ` (ข้าม ${res.skippedCount} งานที่ถูกรับไปแล้ว)` : ""
      }`
    );
    return true;
  }

  return (
    <JobPoolPanel
      jobPool={jobPool}
      searchQuery={search}
      selectedBuilding={building}
      isPending={isPending}
      onClaim={claim}
      onBulkClaim={bulkClaim}
    />
  );
}

"use client";

import { AssetsPanel } from "@/components/tech/assets-panel";
import { useTechFilters } from "@/components/tech/tech-shell";
import type { TechnicianAssetUnit, TechnicianAssetSummary } from "@/lib/maintenance";

export function TechAssetsClient({
  assetList,
  assetSummary,
}: {
  assetList: TechnicianAssetUnit[];
  assetSummary: TechnicianAssetSummary;
}) {
  const { search, building, openHistoryFor } = useTechFilters();
  return (
    <AssetsPanel
      assetList={assetList}
      assetSummary={assetSummary}
      searchQuery={search}
      selectedBuilding={building}
      onViewHistory={openHistoryFor}
    />
  );
}

"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AssetsPanel } from "@/components/tech/assets-panel";
import { RegisterUnitModal } from "@/components/tech/register-unit-modal";
import { ScheduleModal } from "@/components/tech/schedule-modal";
import { useTechFilters } from "@/components/tech/tech-shell";
import type { TechnicianAssetUnit, TechnicianAssetSummary } from "@/lib/maintenance";
import type { RoomOption } from "@/lib/tech/pages";

export function TechAssetsClient({
  assetList,
  assetSummary,
  rooms,
}: {
  assetList: TechnicianAssetUnit[];
  assetSummary: TechnicianAssetSummary;
  rooms: RoomOption[];
}) {
  const { search, building, openHistoryFor } = useTechFilters();
  const [registering, setRegistering] = useState(false);
  // The unit whose cleaning cycle is being changed, held here rather than in
  // the panel so only one modal can be open at a time.
  const [schedulingUnit, setSchedulingUnit] = useState<TechnicianAssetUnit | null>(null);

  return (
    <>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setRegistering(true)}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" />
          ลงทะเบียนแอร์เครื่องใหม่
        </button>
      </div>

      <AssetsPanel
        assetList={assetList}
        assetSummary={assetSummary}
        searchQuery={search}
        selectedBuilding={building}
        onViewHistory={openHistoryFor}
        onEditSchedule={setSchedulingUnit}
      />

      {registering && <RegisterUnitModal rooms={rooms} onClose={() => setRegistering(false)} />}

      {schedulingUnit && (
        <ScheduleModal unit={schedulingUnit} onClose={() => setSchedulingUnit(null)} />
      )}
    </>
  );
}

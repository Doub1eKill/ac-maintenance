"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
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
  const { search, building, openHistoryFor, pageActionsSlot } = useTechFilters();
  const [registering, setRegistering] = useState(false);
  // The unit whose cleaning cycle is being changed, held here rather than in
  // the panel so only one modal can be open at a time.
  const [schedulingUnit, setSchedulingUnit] = useState<TechnicianAssetUnit | null>(null);

  return (
    <>
      {/* In the banner's action row, beside the building filter and the scan
          button, where the page's other controls already are — it used to
          float on its own under the banner. Secondary styling: scanning is
          the technician's everyday action, registering a unit is not. */}
      {pageActionsSlot &&
        createPortal(
          <button
            type="button"
            onClick={() => setRegistering(true)}
            className="order-last w-full sm:order-none sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground shadow-sm hover:bg-secondary transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="whitespace-nowrap">ลงทะเบียนแอร์เครื่องใหม่</span>
          </button>,
          pageActionsSlot
        )}

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

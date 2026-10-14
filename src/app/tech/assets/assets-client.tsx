"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import { Plus, X } from "lucide-react";
import { AssetsPanel } from "@/components/tech/assets-panel";
import { RegisterUnitModal } from "@/components/tech/register-unit-modal";
import { ScheduleModal } from "@/components/tech/schedule-modal";
import { UnitCataloguePanel } from "@/components/tech/unit-catalogue-panel";
import { useTechFilters } from "@/components/tech/tech-shell";
import type { TechnicianAssetUnit, TechnicianAssetSummary } from "@/lib/maintenance";
import type { RoomOption } from "@/lib/tech/pages";
import { EditRoomModal, type EditRoomTarget } from "@/components/shared/edit-room-modal";
import { updateRoomAction } from "@/app/tech/actions";
import { useEscapeToClose } from "@/hooks/use-escape-to-close";

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
  // The unit being corrected (brand, model, BTU — and its picture). The same
  // panel the maintenance-log form opens inline, here in a modal of its own.
  const [editingUnit, setEditingUnit] = useState<TechnicianAssetUnit | null>(null);
  // The room being renamed or moved to another floor.
  const [editingRoom, setEditingRoom] = useState<EditRoomTarget | null>(null);
  const [isSavingRoom, startSavingRoom] = useTransition();
  useEscapeToClose(() => setEditingRoom(null), editingRoom !== null);

  function handleEditRoom(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingRoom) return;
    const formData = new FormData(e.currentTarget);
    formData.append("id", editingRoom.id);
    startSavingRoom(async () => {
      const res = await updateRoomAction(formData);
      if (res.error) toast.error(res.error);
      else {
        setEditingRoom(null);
        toast.success("บันทึกการแก้ไขห้องแล้ว");
      }
    });
  }

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
        onEditUnit={setEditingUnit}
        onEditRoom={setEditingRoom}
      />

      {registering && <RegisterUnitModal rooms={rooms} onClose={() => setRegistering(false)} />}

      {editingRoom && (
        <EditRoomModal target={editingRoom} isPending={isSavingRoom} onClose={() => setEditingRoom(null)} onSubmit={handleEditRoom} />
      )}

      {schedulingUnit && (
        <ScheduleModal unit={schedulingUnit} onClose={() => setSchedulingUnit(null)} />
      )}

      {editingUnit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 backdrop-blur-xs sm:items-center sm:p-4">
          <div className="w-full max-w-md max-h-[95vh] overflow-y-auto rounded-t-3xl border border-border bg-card p-5 pb-10 shadow-2xl sm:rounded-2xl sm:pb-5 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:fade-in">
            <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-foreground">แก้ไขข้อมูลเครื่อง</h3>
                <p className="truncate font-mono text-xs text-muted-foreground">{editingUnit.acCode}</p>
              </div>
              <button type="button" onClick={() => setEditingUnit(null)} aria-label="ปิด" className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <UnitCataloguePanel
              airConditionerId={editingUnit.id}
              currentLabel={editingUnit.brand}
              currentBtu={editingUnit.btu}
              // The list refreshes through revalidatePath; nothing to carry over.
              onSaved={() => setEditingUnit(null)}
            />
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  BrandModelPicker,
  appendBrandModel,
  describeBrandModel,
  emptyBrandModel,
  type BrandModelValue,
  type CatalogueBrand,
} from "@/components/shared/brand-model-picker";
import { getAcMasterDataAction, updateAirConditionerAction } from "@/app/tech/actions";

interface UnitCataloguePanelProps {
  airConditionerId: string;
  /** What the unit says today, shown so the technician can see what they are correcting. */
  currentLabel: string;
  currentBtu: number | null;
  /**
   * Hands back what the unit now says so the summary above the panel can catch
   * up. revalidatePath refreshes the server data, but this modal is holding the
   * job object it was opened with — without this the technician saves a
   * correction and the line right above still shows what they just fixed.
   */
  onSaved: (next: { label: string; btu: number | null }) => void;
}

/**
 * Corrects the brand, model and BTU of the unit a technician is standing in
 * front of — including adding the model to the catalogue when it is not there.
 *
 * Deliberately NOT a <form>. It renders inside the log-a-visit modal's form,
 * and a nested form is invalid HTML that browsers silently flatten, which would
 * make its save button submit the visit instead. FormData is assembled by hand
 * for the same reason.
 *
 * It also saves on its own, before the visit is recorded. logMaintenanceAction
 * runs a transaction that takes an exclusive lock on this unit's row and is
 * wrapped in withDeadlockRetry; folding a catalogue write into it would disturb
 * the lock ordering that comment in src/lib/tech/maintenance-log.ts calls the
 * actual fix for the deadlocks that used to happen here.
 */
export function UnitCataloguePanel({
  airConditionerId,
  currentLabel,
  currentBtu,
  onSaved,
}: UnitCataloguePanelProps) {
  const [brands, setBrands] = useState<CatalogueBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<BrandModelValue>(emptyBrandModel);
  const [btu, setBtu] = useState(currentBtu ? String(currentBtu) : "");
  const [isPending, startTransition] = useTransition();

  async function reloadCatalogue() {
    const data = await getAcMasterDataAction();
    setBrands(data.brands);
    return data.brands;
  }

  // Loaded once when the panel opens: the catalogue is small and the technician
  // is about to change it, so a stale read is refreshed by the picker's own
  // create handlers rather than by polling. The `cancelled` flag is why this is
  // not just reloadCatalogue().finally() — the panel is closed by the same
  // button that opens it, and closing it mid-request would otherwise set state
  // on a component that is already gone.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getAcMasterDataAction();
        if (!cancelled) setBrands(data.brands);
      } catch {
        if (!cancelled) toast.error("โหลดรายการยี่ห้อ/รุ่นไม่สำเร็จ");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSave() {
    if (picked.brandType === "master" && !picked.modelId) {
      toast.error("กรุณาเลือกรุ่นแอร์");
      return;
    }
    if (picked.brandType === "other" && !picked.customBrand.trim()) {
      toast.error("กรุณาระบุยี่ห้อแอร์");
      return;
    }

    const formData = new FormData();
    formData.append("airConditionerId", airConditionerId);
    formData.append("btu", btu);
    appendBrandModel(formData, picked);
    // status and installedAt are left out on purpose — not sent means not
    // touched. This panel has no business resetting either one.

    startTransition(async () => {
      const res = await updateAirConditionerAction(formData);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("บันทึกข้อมูลเครื่องแล้ว");
      onSaved({
        label: describeBrandModel(picked, brands) || currentLabel,
        btu: btu ? Number(btu) : null,
      });
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted py-6 text-[11px] text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        กำลังโหลดรายการยี่ห้อ/รุ่น
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted p-3">
      <p className="text-[10px] text-muted-foreground">
        ข้อมูลในระบบตอนนี้: <span className="font-bold text-foreground">{currentLabel}</span>
      </p>

      <BrandModelPicker
        brands={brands}
        value={picked}
        onChange={setPicked}
        onCatalogueChanged={reloadCatalogue}
        btu={btu}
        onBtuSuggest={setBtu}
      />

      <div>
        <label className="mb-1 block text-[11px] font-bold text-foreground">BTU</label>
        <input
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          value={btu}
          onChange={(e) => setBtu(e.target.value)}
          placeholder="เช่น 18000"
          className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
        />
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        <Save className="h-3.5 w-3.5" />
        {isPending ? "กำลังบันทึก..." : "บันทึกข้อมูลเครื่อง"}
      </button>
    </div>
  );
}

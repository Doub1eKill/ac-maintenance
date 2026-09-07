"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { SearchableSelect, type SearchableOption } from "@/components/shared/searchable-select";
import {
  createAcBrandAction,
  createAcModelAction,
  getAcMasterDataAction,
  updateAirConditionerAction,
} from "@/app/tech/actions";

interface CatalogueModel {
  id: string;
  brandId: string;
  name: string;
  defaultBtu: number | null;
}

interface CatalogueBrand {
  id: string;
  name: string;
  models: CatalogueModel[];
}

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
  const [brandType, setBrandType] = useState<"master" | "other">("master");
  const [brandId, setBrandId] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string | null>(null);
  const [customBrand, setCustomBrand] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [btu, setBtu] = useState(currentBtu ? String(currentBtu) : "");
  const [creating, setCreating] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function loadCatalogue() {
    const data = await getAcMasterDataAction();
    setBrands(data.brands);
    return data.brands;
  }

  // Loaded once when the panel opens: the catalogue is small and the technician
  // is about to change it, so a stale read is refreshed by the create handlers
  // below rather than by polling. The `cancelled` flag is why this is not just
  // loadCatalogue().finally() — the panel is closed by the same button that
  // opens it, and a technician who closes it mid-request would otherwise set
  // state on a component that is already gone.
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

  const selectedBrand = brands.find((b) => b.id === brandId) ?? null;

  const brandOptions: SearchableOption[] = brands.map((b) => ({
    value: b.id,
    label: b.name,
    hint: `${b.models.length} รุ่น`,
  }));

  const modelOptions: SearchableOption[] = (selectedBrand?.models ?? []).map((m) => ({
    value: m.id,
    label: m.name,
    hint: m.defaultBtu ? `${m.defaultBtu.toLocaleString()} BTU` : undefined,
  }));

  async function handleCreateBrand(name: string) {
    setCreating(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      const res = await createAcBrandAction(formData);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      await loadCatalogue();
      if (res.brandId) {
        setBrandId(res.brandId);
        setModelId(null);
      }
      toast.success(`เพิ่มยี่ห้อ "${name}" แล้ว`);
    } finally {
      setCreating(false);
    }
  }

  async function handleCreateModel(name: string) {
    if (!brandId) {
      toast.error("กรุณาเลือกยี่ห้อก่อน");
      return;
    }
    setCreating(true);
    try {
      const formData = new FormData();
      formData.append("brandId", brandId);
      formData.append("name", name);
      // The BTU already typed becomes the model's default, so the next person
      // to pick it does not have to know the number.
      formData.append("defaultBtu", btu);
      const res = await createAcModelAction(formData);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      await loadCatalogue();
      if (res.modelId) setModelId(res.modelId);
      toast.success(`เพิ่มรุ่น "${name}" แล้ว`);
    } finally {
      setCreating(false);
    }
  }

  function handleSave() {
    if (brandType === "master" && !modelId) {
      toast.error("กรุณาเลือกรุ่นแอร์");
      return;
    }
    if (brandType === "other" && !customBrand.trim()) {
      toast.error("กรุณาระบุยี่ห้อแอร์");
      return;
    }

    const formData = new FormData();
    formData.append("airConditionerId", airConditionerId);
    formData.append("brandType", brandType);
    formData.append("btu", btu);
    if (brandType === "master") {
      formData.append("acModelId", modelId!);
    } else {
      formData.append("customBrand", customBrand.trim());
      formData.append("customModel", customModel.trim());
    }
    // status and installedAt are left out on purpose — not sent means not
    // touched. This panel has no business resetting either one.

    startTransition(async () => {
      const res = await updateAirConditionerAction(formData);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("บันทึกข้อมูลเครื่องแล้ว");

      const label =
        brandType === "master"
          ? [selectedBrand?.name, selectedBrand?.models.find((m) => m.id === modelId)?.name]
              .filter(Boolean)
              .join(" ")
          : [customBrand.trim(), customModel.trim()].filter(Boolean).join(" ");

      onSaved({ label: label || currentLabel, btu: btu ? Number(btu) : null });
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

      <div className="flex rounded-lg bg-secondary p-0.5 text-[11px]">
        <button
          type="button"
          onClick={() => setBrandType("master")}
          className={`flex-1 rounded-md py-1.5 font-bold transition-all ${brandType === "master" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          เลือกจากระบบ
        </button>
        <button
          type="button"
          onClick={() => setBrandType("other")}
          className={`flex-1 rounded-md py-1.5 font-bold transition-all ${brandType === "other" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          กำหนดเอง (อื่นๆ)
        </button>
      </div>

      {brandType === "master" ? (
        <>
          <div>
            <label className="mb-1 block text-[11px] font-bold text-foreground">ยี่ห้อ</label>
            <SearchableSelect
              options={brandOptions}
              value={brandId}
              onChange={(next) => {
                setBrandId(next);
                setModelId(null);
              }}
              placeholder="เลือกยี่ห้อ"
              searchPlaceholder="พิมพ์ชื่อยี่ห้อ..."
              onCreate={handleCreateBrand}
              createLabel={(name) => `เพิ่มยี่ห้อ "${name}"`}
              isCreating={creating}
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold text-foreground">รุ่น</label>
            <SearchableSelect
              options={modelOptions}
              value={modelId}
              onChange={(next) => {
                setModelId(next);
                // Filling BTU from the model saves typing, but only when the
                // field is still empty — overwriting a number the technician
                // read off the actual unit would be worse than leaving it.
                const model = selectedBrand?.models.find((m) => m.id === next);
                if (model?.defaultBtu && !btu) setBtu(String(model.defaultBtu));
              }}
              placeholder={brandId ? "เลือกรุ่น" : "เลือกยี่ห้อก่อน"}
              searchPlaceholder="พิมพ์ชื่อรุ่น..."
              disabled={!brandId}
              onCreate={handleCreateModel}
              createLabel={(name) => `เพิ่มรุ่น "${name}" ในยี่ห้อนี้`}
              isCreating={creating}
              emptyLabel="ยี่ห้อนี้ยังไม่มีรุ่นในระบบ"
            />
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-[11px] font-bold text-foreground">ยี่ห้อ</label>
            <input
              type="text"
              value={customBrand}
              onChange={(e) => setCustomBrand(e.target.value)}
              placeholder="เช่น Carrier"
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold text-foreground">รุ่น</label>
            <input
              type="text"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              placeholder="ไม่บังคับ"
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      )}

      <div>
        <label className="mb-1 block text-[11px] font-bold text-foreground">BTU</label>
        <input
          type="number"
          inputMode="numeric"
          value={btu}
          onChange={(e) => setBtu(e.target.value)}
          placeholder="เช่น 18000"
          className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
        />
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending || creating}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        <Save className="h-3.5 w-3.5" />
        {isPending ? "กำลังบันทึก..." : "บันทึกข้อมูลเครื่อง"}
      </button>
    </div>
  );
}

"use client";

import { toast } from "sonner";
import { useState } from "react";
import { FolderInput } from "lucide-react";
import { SearchableSelect, type SearchableOption } from "@/components/shared/searchable-select";
import {
  addCustomBrandModelToCatalogueAction,
  createAcBrandAction,
  createAcModelAction,
} from "@/app/tech/actions";

export interface CatalogueModel {
  id: string;
  name: string;
  defaultBtu: number | null;
}

export interface CatalogueBrand {
  id: string;
  name: string;
  models: CatalogueModel[];
}

export interface BrandModelValue {
  brandType: "master" | "other";
  brandId: string | null;
  modelId: string | null;
  customBrand: string;
  customModel: string;
}

export const emptyBrandModel: BrandModelValue = {
  brandType: "master",
  brandId: null,
  modelId: null,
  customBrand: "",
  customModel: "",
};

interface BrandModelPickerProps {
  brands: CatalogueBrand[];
  value: BrandModelValue;
  onChange: (next: BrandModelValue) => void;
  /** Re-reads the catalogue after this component adds to it. */
  onCatalogueChanged: () => Promise<unknown>;
  /** The BTU currently in the form: seeds a new model's default and gets filled from one. */
  btu: string;
  onBtuSuggest: (btu: string) => void;
}

/**
 * Choosing what a unit is: a catalogue brand and model, or free text.
 *
 * Shared by the panel inside the log-a-visit modal and the register-a-unit
 * form, which ask the same question and previously would have grown two
 * versions of the answer — including two versions of "add the model the
 * technician just typed", which is the part worth having exactly once.
 *
 * Both branches are kept mutually exclusive by the server; this only decides
 * which one the form is currently filling in.
 */
export function BrandModelPicker({
  brands,
  value,
  onChange,
  onCatalogueChanged,
  btu,
  onBtuSuggest,
}: BrandModelPickerProps) {
  const [creating, setCreating] = useState(false);

  const selectedBrand = brands.find((b) => b.id === value.brandId) ?? null;

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
      await onCatalogueChanged();
      if (res.brandId) onChange({ ...value, brandId: res.brandId, modelId: null });
      toast.success(`เพิ่มยี่ห้อ "${name}" แล้ว`);
    } finally {
      setCreating(false);
    }
  }

  async function handleCreateModel(name: string) {
    if (!value.brandId) {
      toast.error("กรุณาเลือกยี่ห้อก่อน");
      return;
    }
    setCreating(true);
    try {
      const formData = new FormData();
      formData.append("brandId", value.brandId);
      formData.append("name", name);
      // Whatever BTU is already in the form becomes the model's default, so the
      // next person to pick it does not have to know the number.
      formData.append("defaultBtu", btu);
      const res = await createAcModelAction(formData);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      await onCatalogueChanged();
      if (res.modelId) onChange({ ...value, modelId: res.modelId });
      toast.success(`เพิ่มรุ่น "${name}" แล้ว`);
    } finally {
      setCreating(false);
    }
  }

  // The typed brand and model become a catalogue entry, and the form switches
  // to it — so the unit is saved against the model, not as text nobody else
  // can pick. An existing entry of the same name is selected instead of
  // duplicated.
  async function handleAddCustomToCatalogue() {
    setCreating(true);
    try {
      const formData = new FormData();
      formData.append("brand", value.customBrand);
      formData.append("model", value.customModel);
      formData.append("defaultBtu", btu);
      const res = await addCustomBrandModelToCatalogueAction(formData);
      if (res.error || !res.brandId || !res.modelId) {
        toast.error(res.error ?? "เพิ่มเข้าระบบไม่สำเร็จ");
        return;
      }
      await onCatalogueChanged();
      onChange({ ...emptyBrandModel, brandId: res.brandId, modelId: res.modelId });
      const label = `${value.customBrand.trim()} ${value.customModel.trim()}`;
      toast.success(res.created ? `เพิ่ม "${label}" เข้าระบบแล้ว` : `"${label}" มีอยู่ในระบบแล้ว เลือกให้แล้ว`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex rounded-lg bg-secondary p-0.5 text-[11px]">
        <button
          type="button"
          onClick={() => onChange({ ...value, brandType: "master" })}
          className={`flex-1 rounded-md py-1.5 font-bold transition-all ${value.brandType === "master" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          เลือกจากระบบ
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...value, brandType: "other" })}
          className={`flex-1 rounded-md py-1.5 font-bold transition-all ${value.brandType === "other" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          กำหนดเอง (อื่นๆ)
        </button>
      </div>

      {value.brandType === "master" ? (
        <>
          <div>
            <label className="mb-1 block text-[11px] font-bold text-foreground">ยี่ห้อ</label>
            <SearchableSelect
              options={brandOptions}
              value={value.brandId}
              onChange={(next) => onChange({ ...value, brandId: next, modelId: null })}
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
              value={value.modelId}
              onChange={(next) => {
                onChange({ ...value, modelId: next });
                // Only when the field is still empty: overwriting a number the
                // technician read off the actual unit would be worse than
                // leaving them to type it.
                const model = selectedBrand?.models.find((m) => m.id === next);
                if (model?.defaultBtu && !btu) onBtuSuggest(String(model.defaultBtu));
              }}
              placeholder={value.brandId ? "เลือกรุ่น" : "เลือกยี่ห้อก่อน"}
              searchPlaceholder="พิมพ์ชื่อรุ่น..."
              disabled={!value.brandId}
              onCreate={handleCreateModel}
              createLabel={(name) => `เพิ่มรุ่น "${name}" ในยี่ห้อนี้`}
              isCreating={creating}
              emptyLabel="ยี่ห้อนี้ยังไม่มีรุ่นในระบบ"
            />
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-foreground">ยี่ห้อ</label>
              <input
                type="text"
                value={value.customBrand}
                onChange={(e) => onChange({ ...value, customBrand: e.target.value })}
                placeholder="เช่น Carrier"
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-foreground">รุ่น</label>
              <input
                type="text"
                value={value.customModel}
                onChange={(e) => onChange({ ...value, customModel: e.target.value })}
                placeholder="ไม่บังคับ"
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddCustomToCatalogue}
            disabled={creating || !value.customBrand.trim() || !value.customModel.trim()}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-primary/5 px-3 py-2 text-[11px] font-bold text-primary hover:bg-primary/10 disabled:opacity-50 transition-colors"
          >
            <FolderInput className="h-3.5 w-3.5" />
            {creating ? "กำลังเพิ่ม..." : "เพิ่มยี่ห้อและรุ่นนี้เข้าระบบ"}
          </button>
          {!value.customModel.trim() && (
            <p className="text-[10px] text-muted-foreground">ระบุรุ่นก่อนจึงจะเพิ่มเข้าระบบได้</p>
          )}
        </div>
      )}
    </div>
  );
}

/** The label a saved unit should now show, for optimistic UI after a write. */
export function describeBrandModel(
  value: BrandModelValue,
  brands: CatalogueBrand[]
): string {
  if (value.brandType === "master") {
    const brand = brands.find((b) => b.id === value.brandId);
    const model = brand?.models.find((m) => m.id === value.modelId);
    return [brand?.name, model?.name].filter(Boolean).join(" ");
  }
  return [value.customBrand.trim(), value.customModel.trim()].filter(Boolean).join(" ");
}

/** Writes the picker's state into the shape both server actions expect. */
export function appendBrandModel(formData: FormData, value: BrandModelValue) {
  formData.append("brandType", value.brandType);
  if (value.brandType === "master") {
    formData.append("acModelId", value.modelId ?? "");
  } else {
    formData.append("customBrand", value.customBrand.trim());
    formData.append("customModel", value.customModel.trim());
  }
}

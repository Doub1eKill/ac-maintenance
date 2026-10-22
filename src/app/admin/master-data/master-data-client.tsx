"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createAcBrandAction,
  createAcModelAction,
  deleteAcBrandAction,
  deleteAcModelAction,
  updateAcBrandAction,
  updateAcModelAction,
  linkCustomUnitsToCatalogueAction,
} from "./actions";
import { Plus, Check, ChevronDown, ChevronRight, Wind, Trash2, Pencil, FolderInput } from "lucide-react";
import type { CustomUnitGroup } from "@/lib/admin/custom-unit-groups";
import { TrashModal } from "./trash-modal";

export type ModelType = {
  id: string;
  brandId: string;
  name: string;
  defaultBtu: number | null;
};

export type BrandType = {
  id: string;
  name: string;
  modelsCount: number;
  acCount: number;
  models: ModelType[];
};

export function MasterDataClient({
  initialBrands,
  customUnitGroups = [],
}: {
  initialBrands: BrandType[];
  customUnitGroups?: CustomUnitGroup[];
}) {
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);
  const [showTrash, setShowTrash] = useState(false);

  return (
    <div className="space-y-6">
      <AddBrandCard />

      {customUnitGroups.length > 0 && <CustomUnitsCard groups={customUnitGroups} />}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h4 className="text-lg font-bold text-foreground">รายชื่อยี่ห้อและรุ่นแอร์</h4>
          <button
            onClick={() => setShowTrash(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:bg-muted transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" /> ถังขยะ
          </button>
        </div>
        {initialBrands.length === 0 ? (
          <div className="text-center p-8 border border-dashed border-border rounded-xl text-muted-foreground bg-card">
            ยังไม่มีข้อมูลยี่ห้อแอร์ในระบบ
          </div>
        ) : (
          <div className="space-y-3">
            {initialBrands.map(brand => (
              <BrandItem
                key={brand.id}
                brand={brand}
                isExpanded={expandedBrand === brand.id}
                onToggle={() => setExpandedBrand(expandedBrand === brand.id ? null : brand.id)}
              />
            ))}
          </div>
        )}
      </div>

      {showTrash && <TrashModal onClose={() => setShowTrash(false)} />}
    </div>
  );
}

function AddBrandCard() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await createAcBrandAction(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(true);
        formRef.current?.reset();
        setTimeout(() => setSuccess(false), 3000);
        router.refresh();
      }
    });
  };

  return (
    <div className="biz-card overflow-hidden bg-card border border-border shadow-sm rounded-2xl">
      <div className="p-5 sm:p-6 border-b border-border">
        <h3 className="text-base font-bold text-foreground">เพิ่มยี่ห้อแอร์ใหม่</h3>
      </div>
      <div className="p-5 sm:p-6">
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-start">
          <div className="flex-1 w-full space-y-1">
            <label htmlFor="name" className="sr-only">ชื่อยี่ห้อ</label>
            <input
              id="name"
              name="name"
              placeholder="เช่น Daikin, Mitsubishi..."
              required
              disabled={isPending}
              className="w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-foreground focus:border-primary focus:outline-none"
            />
            {error && <p className="text-xs text-destructive mt-1 font-bold">{error}</p>}
            {success && <p className="text-xs text-success mt-1 flex items-center gap-1 font-bold"><Check className="h-3 w-3"/> เพิ่มข้อมูลสำเร็จ</p>}
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isPending ? "กำลังบันทึก..." : <><Plus className="h-4 w-4" /> เพิ่มยี่ห้อ</>}
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * Units saved under "กำหนดเอง", grouped by what was typed, each with a button
 * that adds the brand and model to the catalogue and moves the units onto it.
 * Hidden once nothing is left on free text.
 */
function CustomUnitsCard({ groups }: { groups: CustomUnitGroup[] }) {
  const totalUnits = groups.reduce((sum, g) => sum + g.units.length, 0);

  return (
    <div className="biz-card overflow-hidden bg-card border border-border shadow-sm rounded-2xl">
      <div className="p-5 sm:p-6 border-b border-border space-y-1">
        <h3 className="text-base font-bold text-foreground">แอร์ที่ใช้ยี่ห้อ/รุ่นกำหนดเอง</h3>
        <p className="text-xs text-muted-foreground">
          {totalUnits} เครื่องบันทึกยี่ห้อหรือรุ่นแบบพิมพ์เอง กดเพิ่มเข้าระบบเพื่อสร้างยี่ห้อและรุ่นนั้นในรายการ
          แล้วผูกแอร์ทุกเครื่องในกลุ่มเข้ากับรุ่นนั้น ถ้ามียี่ห้อหรือรุ่นชื่อเดียวกันอยู่แล้วจะใช้ตัวเดิม
        </p>
      </div>
      <div className="divide-y divide-border">
        {groups.map((group) => (
          <CustomUnitRow key={group.key} group={group} />
        ))}
      </div>
    </div>
  );
}

function CustomUnitRow({ group }: { group: CustomUnitGroup }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState(group.brand);
  const [model, setModel] = useState(group.model);
  const [btu, setBtu] = useState(group.commonBtu === null ? "" : String(group.commonBtu));

  const shownCodes = group.units.slice(0, 6).map((u) => u.acCode).join(", ");
  const moreCodes = group.units.length - 6;

  function handleLink() {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("groupKey", group.key);
      formData.append("brand", brand);
      formData.append("model", model);
      formData.append("defaultBtu", btu);
      const result = await linkCustomUnitsToCatalogueAction(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`เพิ่ม "${brand.trim()} ${model.trim()}" เข้าระบบ และผูกแอร์ ${result.linked} เครื่องแล้ว`);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="p-4 sm:px-6 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-foreground truncate">
            {group.brand}{" "}
            {group.model ? group.model : <span className="font-normal text-muted-foreground">(ไม่ได้ระบุรุ่น)</span>}
          </p>
          <p className="text-xs text-muted-foreground">
            {group.units.length} เครื่อง: {shownCodes}
            {moreCodes > 0 && ` และอีก ${moreCodes} เครื่อง`}
          </p>
        </div>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <FolderInput className="h-3.5 w-3.5" /> เพิ่มเข้าระบบ
          </button>
        )}
      </div>

      {open && (
        <div className="rounded-xl border border-border bg-muted/50 p-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-foreground">ยี่ห้อ</label>
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                disabled={isPending}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-foreground">รุ่น</label>
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="ต้องระบุรุ่น"
                disabled={isPending}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-foreground">BTU มาตรฐาน</label>
              <input
                value={btu}
                onChange={(e) => setBtu(e.target.value)}
                type="number"
                placeholder="ไม่บังคับ"
                disabled={isPending}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            แก้ชื่อให้ถูกก่อนเพิ่มได้ แอร์แต่ละเครื่องยังใช้ค่า BTU เดิมของตัวเอง เครื่องที่ไม่มีค่า BTU จะได้ค่ามาตรฐานนี้
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleLink}
              disabled={isPending || !brand.trim() || !model.trim()}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isPending ? "กำลังบันทึก..." : `ยืนยัน ผูก ${group.units.length} เครื่อง`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BrandItem({ brand, isExpanded, onToggle }: { brand: BrandType, isExpanded: boolean, onToggle: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmDeleteModelId, setConfirmDeleteModelId] = useState<string | null>(null);
  // Renaming, for the case the trash bin was never the answer to: a name
  // that was simply typed wrong. Technicians correct these from
  // /tech/catalogue, and an admin looking at the same row should not have to
  // go there to do it.
  const [editingBrand, setEditingBrand] = useState(false);
  const [brandDraft, setBrandDraft] = useState("");
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [modelDraft, setModelDraft] = useState("");
  const [modelBtuDraft, setModelBtuDraft] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const handleAddModel = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("brandId", brand.id);
    setError(null);

    startTransition(async () => {
      const result = await createAcModelAction(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        formRef.current?.reset();
        router.refresh();
      }
    });
  };

  function handleRenameBrand() {
    const name = brandDraft.trim();
    if (!name) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append("brandId", brand.id);
      formData.append("name", name);
      const result = await updateAcBrandAction(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`แก้ชื่อยี่ห้อเป็น "${name}" แล้ว`);
      setEditingBrand(false);
      router.refresh();
    });
  }

  function startEditModel(model: ModelType) {
    setEditingModelId(model.id);
    setModelDraft(model.name);
    setModelBtuDraft(model.defaultBtu === null ? "" : String(model.defaultBtu));
    setConfirmDeleteModelId(null);
  }

  function handleRenameModel(modelId: string) {
    const name = modelDraft.trim();
    if (!name) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append("modelId", modelId);
      formData.append("name", name);
      formData.append("defaultBtu", modelBtuDraft);
      const result = await updateAcModelAction(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`แก้ไขรุ่น "${name}" แล้ว`);
      setEditingModelId(null);
      router.refresh();
    });
  }

  function handleDeleteBrand() {
    startTransition(async () => {
      const result = await deleteAcBrandAction(brand.id);
      setShowDeleteConfirm(false);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`ย้ายยี่ห้อ "${brand.name}" ไปถังขยะแล้ว กู้คืนได้จากถังขยะ`);
        router.refresh();
      }
    });
  }

  function handleDeleteModel(model: ModelType) {
    startTransition(async () => {
      const result = await deleteAcModelAction(model.id);
      setConfirmDeleteModelId(null);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`ย้ายรุ่น "${model.name}" ไปถังขยะแล้ว`);
        router.refresh();
      }
    });
  }

  return (
    <div className="biz-card overflow-hidden bg-card border border-border shadow-sm rounded-2xl transition-all duration-200">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isExpanded ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
            <Wind className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">{brand.name}</h3>
            <p className="text-xs font-bold text-muted-foreground">
              {brand.modelsCount} รุ่น • ถูกใช้งาน {brand.acCount} เครื่อง
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setBrandDraft(brand.name);
              setEditingBrand(true);
              setShowDeleteConfirm(false);
            }}
            title="แก้ไขชื่อยี่ห้อนี้"
            aria-label={`แก้ไขชื่อยี่ห้อ ${brand.name}`}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
            title="ลบยี่ห้อนี้ลงถังขยะ"
            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <div className="text-muted-foreground p-2">
            {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </div>
        </div>
      </div>

      {editingBrand && (
        <div className="px-4 pb-4 pt-0 border-t border-border bg-muted/50 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 py-3" onClick={(e) => e.stopPropagation()}>
          <input
            value={brandDraft}
            onChange={(e) => setBrandDraft(e.target.value)}
            placeholder="ชื่อยี่ห้อ"
            autoFocus
            disabled={isPending}
            className="flex-1 rounded-xl border border-border bg-card px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setEditingBrand(false)}
              disabled={isPending}
              className="flex-1 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-50 transition-colors sm:flex-none"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleRenameBrand}
              disabled={isPending || !brandDraft.trim()}
              className="flex-1 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors sm:flex-none"
            >
              {isPending ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="px-4 pb-4 pt-0 border-t border-border bg-destructive/5 flex items-center justify-between gap-3 py-3" onClick={(e) => e.stopPropagation()}>
          <p className="text-xs font-bold text-destructive">
            ย้าย &quot;{brand.name}&quot; ไปถังขยะ? (กู้คืนได้ภายหลัง)
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isPending}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-[11px] font-bold text-foreground hover:bg-muted transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleDeleteBrand}
              disabled={isPending}
              className="rounded-lg bg-destructive px-3 py-1.5 text-[11px] font-bold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition-colors"
            >
              {isPending ? "กำลังลบ..." : "ยืนยันลบ"}
            </button>
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-border bg-muted/50">
          <div className="mt-4 mb-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {brand.models.map(model => (
              <div key={model.id} className="bg-card border border-border rounded-lg p-2.5 text-sm">
                {editingModelId === model.id ? (
                  <div className="space-y-2">
                    <input
                      value={modelDraft}
                      onChange={(e) => setModelDraft(e.target.value)}
                      placeholder="ชื่อรุ่น"
                      autoFocus
                      disabled={isPending}
                      className="w-full rounded-md border border-border bg-muted px-2 py-1 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                    <input
                      value={modelBtuDraft}
                      onChange={(e) => setModelBtuDraft(e.target.value)}
                      type="number"
                      placeholder="BTU มาตรฐาน (ไม่บังคับ)"
                      disabled={isPending}
                      className="w-full rounded-md border border-border bg-muted px-2 py-1 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setEditingModelId(null)}
                        disabled={isPending}
                        className="flex-1 rounded-md border border-border bg-card px-2 py-1 text-[10px] font-bold text-foreground hover:bg-muted transition-colors"
                      >
                        ยกเลิก
                      </button>
                      <button
                        onClick={() => handleRenameModel(model.id)}
                        disabled={isPending || !modelDraft.trim()}
                        className="flex-1 rounded-md bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                      >
                        บันทึก
                      </button>
                    </div>
                  </div>
                ) : confirmDeleteModelId === model.id ? (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-destructive">ลบ &quot;{model.name}&quot; ลงถังขยะ?</p>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setConfirmDeleteModelId(null)}
                        disabled={isPending}
                        className="flex-1 rounded-md border border-border bg-card px-2 py-1 text-[10px] font-bold text-foreground hover:bg-muted transition-colors"
                      >
                        ยกเลิก
                      </button>
                      <button
                        onClick={() => handleDeleteModel(model)}
                        disabled={isPending}
                        className="flex-1 rounded-md bg-destructive px-2 py-1 text-[10px] font-bold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition-colors"
                      >
                        ยืนยัน
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-foreground">{model.name}</span>
                    <div className="flex items-center gap-1.5">
                      {model.defaultBtu && <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border">{model.defaultBtu.toLocaleString()} BTU</span>}
                      <button
                        onClick={() => startEditModel(model)}
                        title="แก้ไขชื่อรุ่น/BTU"
                        aria-label={`แก้ไขรุ่น ${model.name}`}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteModelId(model.id)}
                        title="ลบรุ่นนี้ลงถังขยะ"
                        className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {brand.models.length === 0 && (
              <div className="col-span-full text-xs font-bold text-muted-foreground py-2">
                ยังไม่มีรุ่นในยี่ห้อนี้
              </div>
            )}
          </div>

          <form ref={formRef} onSubmit={handleAddModel} className="flex flex-col sm:flex-row gap-2 mt-2 items-start border-t border-dashed border-border pt-3">
            <div className="flex-1 w-full flex flex-col sm:flex-row gap-2">
              <input
                name="name"
                placeholder="ชื่อรุ่น (เช่น FTKM28SV2S)"
                required
                className="text-sm rounded-xl border border-border bg-muted px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                disabled={isPending}
              />
              <input
                name="defaultBtu"
                type="number"
                placeholder="BTU มาตรฐาน (ไม่บังคับ)"
                className="text-sm rounded-xl border border-border bg-muted px-3 py-2 text-foreground focus:border-primary focus:outline-none sm:w-48"
                disabled={isPending}
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-xl bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground hover:bg-accent disabled:opacity-50 whitespace-nowrap"
              disabled={isPending}
            >
              {isPending ? "บันทึก..." : <><Plus className="h-3.5 w-3.5" /> เพิ่มรุ่น</>}
            </button>
          </form>
          {error && <p className="text-xs text-destructive mt-1 font-bold">{error}</p>}
        </div>
      )}
    </div>
  );
}

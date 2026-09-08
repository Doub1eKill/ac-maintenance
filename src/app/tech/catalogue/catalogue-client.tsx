"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Info, Pencil, Plus, Search, Tag } from "lucide-react";
import { toast } from "sonner";
import {
  createAcBrandAction,
  createAcModelAction,
  updateAcBrandAction,
  updateAcModelAction,
} from "@/app/tech/actions";
import { matchesQuery } from "@/lib/search";

interface CatalogueModel {
  id: string;
  name: string;
  defaultBtu: number | null;
}

interface CatalogueBrand {
  id: string;
  name: string;
  modelsCount: number;
  acCount: number;
  models: CatalogueModel[];
}

/**
 * The technician's view of the AC catalogue: search it, add to it, and correct
 * what is already in it.
 *
 * Built from the admin page's shape but without the retire, restore and trash
 * controls. Adding the wrong model is undone by adding the right one and a
 * misspelled name is undone by typing it again; deleting reaches every unit
 * bound to it and has to come back through a trash bin that only an admin can
 * open, so those stay on /admin/master-data.
 */
export function TechCatalogueClient({ brands }: { brands: CatalogueBrand[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Seeded from ?model=, which a suggestion in the header search box sets when
  // it points here. Read once as the initial value rather than synced in an
  // effect, so it cannot fight what the user types afterwards. A distinct name
  // from the shell's own ?q= keeps the two from consuming each other's param.
  const [query, setQuery] = useState(() => searchParams.get("model") ?? "");
  const [openBrandId, setOpenBrandId] = useState<string | null>(null);
  const [addingBrand, setAddingBrand] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [addingModelFor, setAddingModelFor] = useState<string | null>(null);
  const [modelName, setModelName] = useState("");
  const [modelBtu, setModelBtu] = useState("");
  // Renaming gets its own state rather than borrowing the add form's: the edit
  // fields open seeded with what is already stored, in the row being corrected,
  // so there is never a doubt about which name is being changed.
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);
  const [editBrandName, setEditBrandName] = useState("");
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [editModelName, setEditModelName] = useState("");
  const [editModelBtu, setEditModelBtu] = useState("");
  const [isPending, startTransition] = useTransition();

  // A search that only matched brand names would hide the thing being looked
  // for: technicians know the model on the unit, not who makes it.
  const filtered = useMemo(
    () =>
      brands
        .map((brand) => {
          const models = brand.models.filter((m) => matchesQuery(query, m.name));
          const brandHit = matchesQuery(query, brand.name);
          return { brand, models: brandHit ? brand.models : models, visible: brandHit || models.length > 0 };
        })
        .filter((row) => row.visible),
    [brands, query]
  );

  function handleAddBrand() {
    const name = brandName.trim();
    if (!name) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append("name", name);
      const res = await createAcBrandAction(formData);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`เพิ่มยี่ห้อ "${name}" แล้ว`);
      setBrandName("");
      setAddingBrand(false);
      router.refresh();
    });
  }

  function handleAddModel(brandId: string) {
    const name = modelName.trim();
    if (!name) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append("brandId", brandId);
      formData.append("name", name);
      formData.append("defaultBtu", modelBtu);
      const res = await createAcModelAction(formData);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`เพิ่มรุ่น "${name}" แล้ว`);
      setModelName("");
      setModelBtu("");
      setAddingModelFor(null);
      router.refresh();
    });
  }

  function startEditBrand(brand: CatalogueBrand) {
    setEditingBrandId(brand.id);
    setEditBrandName(brand.name);
    // Two forms open at once on the same card would both look like "the" one
    // being edited, so opening either closes the others.
    setAddingModelFor(null);
    setEditingModelId(null);
  }

  function handleRenameBrand(brandId: string) {
    const name = editBrandName.trim();
    if (!name) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append("brandId", brandId);
      formData.append("name", name);
      const res = await updateAcBrandAction(formData);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`แก้ชื่อยี่ห้อเป็น "${name}" แล้ว`);
      setEditingBrandId(null);
      setEditBrandName("");
      router.refresh();
    });
  }

  function startEditModel(model: CatalogueModel) {
    setEditingModelId(model.id);
    setEditModelName(model.name);
    setEditModelBtu(model.defaultBtu === null ? "" : String(model.defaultBtu));
    setAddingModelFor(null);
    setEditingBrandId(null);
  }

  function handleRenameModel(modelId: string) {
    const name = editModelName.trim();
    if (!name) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append("modelId", modelId);
      formData.append("name", name);
      formData.append("defaultBtu", editModelBtu);
      const res = await updateAcModelAction(formData);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`แก้ไขรุ่น "${name}" แล้ว`);
      setEditingModelId(null);
      setEditModelName("");
      setEditModelBtu("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="biz-card space-y-3 p-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            พื้นที่ปฏิบัติงานช่างเทคนิค
          </p>
          <h1 className="text-lg font-bold text-foreground">ยี่ห้อและรุ่นแอร์ในระบบ</h1>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-border bg-muted p-3">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            เจอแอร์รุ่นที่ยังไม่มีในระบบ เพิ่มเองได้เลยจากหน้านี้ หรือจากปุ่ม
            &quot;แก้ไขรุ่น/BTU&quot; ตอนบันทึกงาน · พิมพ์ชื่อผิดกดปุ่มดินสอแก้เองได้
            ไม่ต้องแจ้งผู้ดูแลระบบ · การลบหรือกู้คืนยังต้องให้ผู้ดูแลระบบทำให้
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="พิมพ์ชื่อยี่ห้อหรือรุ่น..."
              className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setAddingBrand((prev) => !prev)}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" />
            เพิ่มยี่ห้อ
          </button>
        </div>

        {addingBrand && (
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted p-3 sm:flex-row">
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="ชื่อยี่ห้อ เช่น Carrier"
              className="flex-1 rounded-xl border border-border bg-card px-3 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setBrandName("");
                  setAddingBrand(false);
                }}
                disabled={isPending}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-foreground hover:bg-secondary disabled:opacity-50 sm:flex-none"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleAddBrand}
                disabled={isPending || !brandName.trim()}
                className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 sm:flex-none"
              >
                {isPending ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        )}
      </div>

      {filtered.length === 0 && (
        <p className="biz-card p-8 text-center text-xs text-muted-foreground">
          ไม่พบยี่ห้อหรือรุ่นที่ค้นหา
        </p>
      )}

      <div className="space-y-2">
        {filtered.map(({ brand, models }) => {
          const open = openBrandId === brand.id;
          return (
            <div key={brand.id} className="biz-card overflow-hidden">
              {editingBrandId === brand.id ? (
                <div className="flex flex-col gap-2 bg-muted p-3 sm:flex-row">
                  <input
                    type="text"
                    value={editBrandName}
                    onChange={(e) => setEditBrandName(e.target.value)}
                    placeholder="ชื่อยี่ห้อ"
                    autoFocus
                    className="flex-1 rounded-xl border border-border bg-card px-3 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBrandId(null);
                        setEditBrandName("");
                      }}
                      disabled={isPending}
                      className="flex-1 rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-foreground hover:bg-secondary disabled:opacity-50 sm:flex-none"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRenameBrand(brand.id)}
                      disabled={isPending || !editBrandName.trim()}
                      className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 sm:flex-none"
                    >
                      {isPending ? "กำลังบันทึก..." : "บันทึก"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setOpenBrandId(open ? null : brand.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 p-4 text-left hover:bg-secondary"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                      <Tag className="h-4 w-4 text-foreground" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-foreground">{brand.name}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {brand.modelsCount} รุ่น • ใช้อยู่ {brand.acCount} เครื่อง
                      </span>
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                  {/* A sibling of the header button, not a child of it: buttons
                      do not nest, and the header's own job is to expand. */}
                  <button
                    type="button"
                    onClick={() => startEditBrand(brand)}
                    title="แก้ไขชื่อยี่ห้อ"
                    aria-label={`แก้ไขชื่อยี่ห้อ ${brand.name}`}
                    className="mr-2 shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {open && (
                <div className="space-y-1 border-t border-border p-3">
                  {models.map((model) =>
                    editingModelId === model.id ? (
                      <div
                        key={model.id}
                        className="flex flex-col gap-2 rounded-lg border border-border bg-card p-2 sm:flex-row"
                      >
                        <input
                          type="text"
                          value={editModelName}
                          onChange={(e) => setEditModelName(e.target.value)}
                          placeholder="ชื่อรุ่น"
                          autoFocus
                          className="flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                        />
                        <input
                          type="number"
                          inputMode="numeric"
                          value={editModelBtu}
                          onChange={(e) => setEditModelBtu(e.target.value)}
                          placeholder="BTU (ไม่บังคับ)"
                          className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none sm:w-40"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingModelId(null);
                              setEditModelName("");
                              setEditModelBtu("");
                            }}
                            disabled={isPending}
                            className="flex-1 rounded-lg border border-border px-4 py-2 text-xs font-bold text-foreground hover:bg-secondary disabled:opacity-50 sm:flex-none"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRenameModel(model.id)}
                            disabled={isPending || !editModelName.trim()}
                            className="flex-1 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 sm:flex-none"
                          >
                            {isPending ? "..." : "บันทึก"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={model.id}
                        className="flex items-center justify-between gap-2 rounded-lg bg-muted py-2 pl-3 pr-1"
                      >
                        <span className="truncate text-xs font-bold text-foreground">{model.name}</span>
                        <span className="flex shrink-0 items-center gap-1">
                          <span className="text-[11px] text-muted-foreground">
                            {model.defaultBtu ? `${model.defaultBtu.toLocaleString()} BTU` : "ไม่ระบุ BTU"}
                          </span>
                          <button
                            type="button"
                            onClick={() => startEditModel(model)}
                            title="แก้ไขชื่อรุ่น/BTU"
                            aria-label={`แก้ไขรุ่น ${model.name}`}
                            className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      </div>
                    )
                  )}

                  {models.length === 0 && (
                    <p className="py-3 text-center text-[11px] text-muted-foreground">
                      ยี่ห้อนี้ยังไม่มีรุ่นในระบบ
                    </p>
                  )}

                  {addingModelFor === brand.id ? (
                    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-2 sm:flex-row">
                      <input
                        type="text"
                        value={modelName}
                        onChange={(e) => setModelName(e.target.value)}
                        placeholder="ชื่อรุ่น"
                        className="flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        value={modelBtu}
                        onChange={(e) => setModelBtu(e.target.value)}
                        placeholder="BTU (ไม่บังคับ)"
                        className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none sm:w-40"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setModelName("");
                            setModelBtu("");
                            setAddingModelFor(null);
                          }}
                          disabled={isPending}
                          className="flex-1 rounded-lg border border-border px-4 py-2 text-xs font-bold text-foreground hover:bg-secondary disabled:opacity-50 sm:flex-none"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddModel(brand.id)}
                          disabled={isPending || !modelName.trim()}
                          className="flex-1 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 sm:flex-none"
                        >
                          {isPending ? "..." : "บันทึก"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setAddingModelFor(brand.id);
                        setModelName("");
                        setModelBtu("");
                        setEditingModelId(null);
                      }}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2.5 text-[11px] font-bold text-foreground hover:bg-secondary"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      เพิ่มรุ่นในยี่ห้อนี้
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

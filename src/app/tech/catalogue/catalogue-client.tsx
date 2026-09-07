"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Info, Plus, Search, Tag } from "lucide-react";
import { toast } from "sonner";
import { createAcBrandAction, createAcModelAction } from "@/app/tech/actions";
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
 * The technician's view of the AC catalogue: search it, and add to it.
 *
 * Built from the admin page's shape but without the retire, restore and trash
 * controls. Adding the wrong model is undone by adding the right one; deleting
 * reaches every unit bound to it and has to come back through a trash bin that
 * only an admin can open, so those stay on /admin/master-data.
 */
export function TechCatalogueClient({ brands }: { brands: CatalogueBrand[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [openBrandId, setOpenBrandId] = useState<string | null>(null);
  const [addingBrand, setAddingBrand] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [addingModelFor, setAddingModelFor] = useState<string | null>(null);
  const [modelName, setModelName] = useState("");
  const [modelBtu, setModelBtu] = useState("");
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
            &quot;แก้ไขรุ่น/BTU&quot; ตอนบันทึกงาน · การลบหรือกู้คืนยังต้องให้ผู้ดูแลระบบทำให้
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
            <button
              type="button"
              onClick={handleAddBrand}
              disabled={isPending || !brandName.trim()}
              className="rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? "กำลังบันทึก..." : "บันทึก"}
            </button>
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
              <button
                type="button"
                onClick={() => setOpenBrandId(open ? null : brand.id)}
                className="flex w-full items-center gap-3 p-4 text-left hover:bg-secondary"
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

              {open && (
                <div className="space-y-1 border-t border-border p-3">
                  {models.map((model) => (
                    <div
                      key={model.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2"
                    >
                      <span className="truncate text-xs font-bold text-foreground">{model.name}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {model.defaultBtu ? `${model.defaultBtu.toLocaleString()} BTU` : "ไม่ระบุ BTU"}
                      </span>
                    </div>
                  ))}

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
                      <button
                        type="button"
                        onClick={() => handleAddModel(brand.id)}
                        disabled={isPending || !modelName.trim()}
                        className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {isPending ? "..." : "บันทึก"}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setAddingModelFor(brand.id);
                        setModelName("");
                        setModelBtu("");
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

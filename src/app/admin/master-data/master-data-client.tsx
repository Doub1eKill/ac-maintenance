"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAcBrandAction, createAcModelAction } from "./actions";
import { Plus, Check, ChevronDown, ChevronRight, Wind } from "lucide-react";

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

export function MasterDataClient({ initialBrands }: { initialBrands: BrandType[] }) {
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);
  
  return (
    <div className="space-y-6">
      <AddBrandCard />
      
      <div className="space-y-4">
        <h4 className="text-lg font-bold text-slate-950">รายชื่อยี่ห้อและรุ่นแอร์</h4>
        {initialBrands.length === 0 ? (
          <div className="text-center p-8 border border-dashed rounded-xl text-slate-500 bg-white">
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
    <div className="biz-card overflow-hidden bg-white border border-slate-200 shadow-sm rounded-2xl">
      <div className="p-5 sm:p-6 border-b border-slate-100">
        <h3 className="text-base font-bold text-slate-950">เพิ่มยี่ห้อแอร์ใหม่</h3>
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
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-slate-900 focus:border-slate-950 focus:outline-none"
            />
            {error && <p className="text-xs text-red-500 mt-1 font-bold">{error}</p>}
            {success && <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1 font-bold"><Check className="h-3 w-3"/> เพิ่มข้อมูลสำเร็จ</p>}
          </div>
          <button 
            type="submit" 
            disabled={isPending} 
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {isPending ? "กำลังบันทึก..." : <><Plus className="h-4 w-4" /> เพิ่มยี่ห้อ</>}
          </button>
        </form>
      </div>
    </div>
  );
}

function BrandItem({ brand, isExpanded, onToggle }: { brand: BrandType, isExpanded: boolean, onToggle: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
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

  return (
    <div className="biz-card overflow-hidden bg-white border border-slate-200 shadow-sm rounded-2xl transition-all duration-200">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isExpanded ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>
            <Wind className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-950">{brand.name}</h3>
            <p className="text-xs font-bold text-slate-500">
              {brand.modelsCount} รุ่น • ถูกใช้งาน {brand.acCount} เครื่อง
            </p>
          </div>
        </div>
        <div className="text-slate-400">
          {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-slate-100 bg-slate-50/50">
          <div className="mt-4 mb-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {brand.models.map(model => (
              <div key={model.id} className="bg-white border border-slate-200 rounded-lg p-2.5 text-sm flex justify-between items-center">
                <span className="font-bold text-slate-800">{model.name}</span>
                {model.defaultBtu && <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">{model.defaultBtu.toLocaleString()} BTU</span>}
              </div>
            ))}
            {brand.models.length === 0 && (
              <div className="col-span-full text-xs font-bold text-slate-500 py-2">
                ยังไม่มีรุ่นในยี่ห้อนี้
              </div>
            )}
          </div>

          <form ref={formRef} onSubmit={handleAddModel} className="flex flex-col sm:flex-row gap-2 mt-2 items-start border-t border-dashed border-slate-200 pt-3">
            <div className="flex-1 w-full flex flex-col sm:flex-row gap-2">
              <input 
                name="name" 
                placeholder="ชื่อรุ่น (เช่น FTKM28SV2S)" 
                required 
                className="text-sm rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-950 focus:outline-none" 
                disabled={isPending} 
              />
              <input 
                name="defaultBtu" 
                type="number" 
                placeholder="BTU มาตรฐาน (ไม่บังคับ)" 
                className="text-sm rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-950 focus:outline-none sm:w-48" 
                disabled={isPending} 
              />
            </div>
            <button 
              type="submit" 
              className="inline-flex items-center gap-1 rounded-xl bg-slate-200 px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-300 disabled:opacity-50 whitespace-nowrap" 
              disabled={isPending}
            >
              {isPending ? "บันทึก..." : <><Plus className="h-3.5 w-3.5" /> เพิ่มรุ่น</>}
            </button>
          </form>
          {error && <p className="text-xs text-red-500 mt-1 font-bold">{error}</p>}
        </div>
      )}
    </div>
  );
}

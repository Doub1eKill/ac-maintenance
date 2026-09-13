"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, QrCode, X } from "lucide-react";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/shared/searchable-select";
import {
  BrandModelPicker,
  appendBrandModel,
  emptyBrandModel,
  type BrandModelValue,
  type CatalogueBrand,
} from "@/components/shared/brand-model-picker";
import { createAirConditionerAction, getAcMasterDataAction } from "@/app/tech/actions";
import type { RoomOption } from "@/lib/tech/pages";

interface RegisterUnitModalProps {
  rooms: RoomOption[];
  onClose: () => void;
}

/**
 * Registering a unit that is not in the system yet, from the field.
 *
 * The server mints the acCode, the QR uuid and the first maintenance schedule
 * in one transaction — see createAirConditionerAction. Nothing about that is
 * reimplemented here; this only collects the four things it asks for.
 */
export function RegisterUnitModal({ rooms, onClose }: RegisterUnitModalProps) {
  const router = useRouter();
  const [brands, setBrands] = useState<CatalogueBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [picked, setPicked] = useState<BrandModelValue>(emptyBrandModel);
  const [btu, setBtu] = useState("");
  const [installedAt, setInstalledAt] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function reloadCatalogue() {
    const data = await getAcMasterDataAction();
    setBrands(data.brands);
    return data.brands;
  }

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

  function handleSubmit() {
    if (!roomId) {
      toast.error("กรุณาเลือกห้อง");
      return;
    }
    if (picked.brandType === "master" && !picked.modelId) {
      toast.error("กรุณาเลือกรุ่นแอร์");
      return;
    }
    if (picked.brandType === "other" && !picked.customBrand.trim()) {
      toast.error("กรุณาระบุยี่ห้อแอร์");
      return;
    }

    const formData = new FormData();
    formData.append("roomId", roomId);
    formData.append("btu", btu);
    formData.append("installedAt", installedAt);
    appendBrandModel(formData, picked);

    startTransition(async () => {
      const res = await createAirConditionerAction(formData);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      // Held on screen instead of closing: the technician needs the code that
      // was just minted, and the sticker it belongs on does not exist yet.
      setCreatedCode(res.acCode ?? null);
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 backdrop-blur-xs sm:items-center sm:p-4">
      <div className="max-h-[95vh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-3xl border border-border bg-card p-6 pb-10 shadow-2xl animate-in slide-in-from-bottom-full sm:rounded-2xl sm:pb-6 sm:slide-in-from-bottom-0 sm:fade-in">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-sm font-bold text-foreground">ลงทะเบียนแอร์เครื่องใหม่</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {createdCode ? (
          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-2 rounded-xl border border-border bg-muted p-4">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="font-bold text-foreground">ลงทะเบียนสำเร็จ</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  รหัสเครื่องคือ{" "}
                  <span className="font-bold text-foreground">{createdCode}</span>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-4">
              <QrCode className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <p className="text-[11px] leading-relaxed text-warning-foreground">
                ระบบสร้าง QR Code ให้แล้ว แต่ยัง<strong>ไม่มีสติกเกอร์ติดบนเครื่อง</strong> ·
                แจ้งผู้ดูแลระบบให้พิมพ์สติกเกอร์แล้วนำไปติด ไม่งั้นสแกนหน้างานจะยังไม่เจอเครื่องนี้
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-primary py-2.5 font-bold text-primary-foreground hover:bg-primary/90"
            >
              เสร็จสิ้น
            </button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-[11px] text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            กำลังโหลดข้อมูล
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-foreground">
                ห้องที่ติดตั้ง <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={rooms.map((room) => ({ value: room.id, label: room.label }))}
                value={roomId}
                onChange={setRoomId}
                placeholder="เลือกห้อง"
                searchPlaceholder="พิมพ์ชื่ออาคาร ชั้น หรือเลขห้อง..."
                emptyLabel="ไม่พบห้องที่ค้นหา"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                ย้ายห้องทีหลังไม่ได้ เพราะรหัสเครื่องถูกสร้างจากอาคารและห้องนี้
              </p>
            </div>

            <BrandModelPicker
              brands={brands}
              value={picked}
              onChange={setPicked}
              onCatalogueChanged={reloadCatalogue}
              btu={btu}
              onBtuSuggest={setBtu}
            />

            <div className="grid grid-cols-2 gap-2">
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
                  className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-foreground">
                  วันที่ติดตั้ง
                </label>
                <input
                  type="date"
                  value={installedAt}
                  onChange={(e) => setInstalledAt(e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 rounded-xl border border-border py-2.5 font-bold text-foreground hover:bg-secondary"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="w-1/2 rounded-xl bg-primary py-2.5 font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending ? "กำลังบันทึก..." : "ลงทะเบียน"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

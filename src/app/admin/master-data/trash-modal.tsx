"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { X, Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import {
  getAcTrashData,
  restoreAcBrandAction,
  permanentlyDeleteAcBrandAction,
  restoreAcModelAction,
  permanentlyDeleteAcModelAction,
} from "./actions";

type TrashBrand = {
  id: string;
  name: string;
  deletedAt: string | null;
  liveModels: number;
  unitsUsing: number;
  unitsUsingLive: number;
  canPurge: boolean;
};

type TrashModel = {
  id: string;
  name: string;
  defaultBtu: number | null;
  deletedAt: string | null;
  brandId: string;
  brandName: string;
  brandDeleted: boolean;
  unitsUsing: number;
  unitsUsingLive: number;
  canPurge: boolean;
};

interface TrashModalProps {
  onClose: () => void;
}

export function TrashModal({ onClose }: TrashModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [brands, setBrands] = useState<TrashBrand[]>([]);
  const [models, setModels] = useState<TrashModel[]>([]);
  const [isPending, startTransition] = useTransition();
  // Only one purge-confirm row open at a time, tracked as "<kind>:<id>" so a
  // brand and a model can never collide even if their ids happen to match.
  const [confirmPurgeKey, setConfirmPurgeKey] = useState<string | null>(null);

  const loadTrash = () => {
    setIsLoading(true);
    getAcTrashData().then((data) => {
      setBrands(data.brands);
      setModels(data.models);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadTrash();
  }, []);

  function handleRestoreBrand(brand: TrashBrand) {
    startTransition(async () => {
      const result = await restoreAcBrandAction(brand.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`กู้คืนยี่ห้อ "${brand.name}" สำเร็จ`);
        loadTrash();
        router.refresh();
      }
    });
  }

  function handlePurgeBrand(brand: TrashBrand) {
    startTransition(async () => {
      const result = await permanentlyDeleteAcBrandAction(brand.id);
      setConfirmPurgeKey(null);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          result.cascadedModels
            ? `ลบยี่ห้อ "${brand.name}" ถาวรแล้ว (พร้อมรุ่นที่ไม่มีใครใช้ ${result.cascadedModels} รุ่น)`
            : `ลบยี่ห้อ "${brand.name}" ถาวรแล้ว`
        );
        loadTrash();
        router.refresh();
      }
    });
  }

  function handleRestoreModel(model: TrashModel) {
    startTransition(async () => {
      const result = await restoreAcModelAction(model.id);
      if (result.error) {
        toast.error(result.error);
      } else if (result.warning) {
        toast.warning(result.warning);
        loadTrash();
        router.refresh();
      } else {
        toast.success(`กู้คืนรุ่น "${model.name}" สำเร็จ`);
        loadTrash();
        router.refresh();
      }
    });
  }

  function handlePurgeModel(model: TrashModel) {
    startTransition(async () => {
      const result = await permanentlyDeleteAcModelAction(model.id);
      setConfirmPurgeKey(null);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`ลบรุ่น "${model.name}" ถาวรแล้ว`);
        loadTrash();
        router.refresh();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl border border-border bg-card shadow-2xl flex flex-col animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-border p-5 shrink-0">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-muted-foreground" /> ถังขยะยี่ห้อ/รุ่นแอร์
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground bg-secondary p-1.5 rounded-full transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-6">
          {isLoading ? (
            <p className="text-center text-sm text-muted-foreground py-8">กำลังโหลด...</p>
          ) : (
            <>
              <TrashSection title={`ยี่ห้อในถังขยะ (${brands.length})`} emptyText="ไม่มียี่ห้อในถังขยะ">
                {brands.map((brand) => (
                  <TrashRow
                    key={brand.id}
                    title={brand.name}
                    deletedAt={brand.deletedAt}
                    detail={`${brand.liveModels} รุ่นที่ยังใช้อยู่`}
                    canPurge={brand.canPurge}
                    unitsUsing={brand.unitsUsing}
                    isPending={isPending}
                    confirmKey={`brand:${brand.id}`}
                    activeConfirmKey={confirmPurgeKey}
                    onSetConfirm={setConfirmPurgeKey}
                    onRestore={() => handleRestoreBrand(brand)}
                    onPurge={() => handlePurgeBrand(brand)}
                  />
                ))}
              </TrashSection>

              <TrashSection title={`รุ่นในถังขยะ (${models.length})`} emptyText="ไม่มีรุ่นในถังขยะ">
                {models.map((model) => (
                  <TrashRow
                    key={model.id}
                    title={model.name}
                    deletedAt={model.deletedAt}
                    detail={
                      `ยี่ห้อ ${model.brandName}${model.brandDeleted ? " (อยู่ในถังขยะด้วย)" : ""}` +
                      (model.defaultBtu ? ` • ${model.defaultBtu.toLocaleString()} BTU` : "")
                    }
                    canPurge={model.canPurge}
                    unitsUsing={model.unitsUsing}
                    isPending={isPending}
                    confirmKey={`model:${model.id}`}
                    activeConfirmKey={confirmPurgeKey}
                    onSetConfirm={setConfirmPurgeKey}
                    onRestore={() => handleRestoreModel(model)}
                    onPurge={() => handlePurgeModel(model)}
                  />
                ))}
              </TrashSection>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TrashSection({ title, emptyText, children }: { title: string; emptyText: string; children: React.ReactNode }) {
  const isEmpty = Array.isArray(children) ? children.length === 0 : !children;
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-bold text-foreground">{title}</h4>
      {isEmpty ? (
        <p className="text-xs text-muted-foreground py-3 text-center border border-dashed border-border rounded-xl">{emptyText}</p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </div>
  );
}

interface TrashRowProps {
  title: string;
  deletedAt: string | null;
  detail: string;
  canPurge: boolean;
  unitsUsing: number;
  isPending: boolean;
  confirmKey: string;
  activeConfirmKey: string | null;
  onSetConfirm: (key: string | null) => void;
  onRestore: () => void;
  onPurge: () => void;
}

function TrashRow({
  title,
  deletedAt,
  detail,
  canPurge,
  unitsUsing,
  isPending,
  confirmKey,
  activeConfirmKey,
  onSetConfirm,
  onRestore,
  onPurge,
}: TrashRowProps) {
  const isConfirming = activeConfirmKey === confirmKey;

  return (
    <div className="rounded-xl border border-border bg-muted p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-bold text-foreground text-sm">{title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{detail}</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            ลบเมื่อ {deletedAt ? format(new Date(deletedAt), "dd/MM/yyyy HH:mm") : "-"}
          </div>
        </div>
        {!isConfirming && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onRestore}
              disabled={isPending}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-bold text-foreground hover:bg-secondary disabled:opacity-50 transition-colors"
            >
              <RotateCcw className="h-3 w-3" /> กู้คืน
            </button>
            <button
              onClick={() => onSetConfirm(confirmKey)}
              disabled={isPending || !canPurge}
              title={!canPurge ? `ลบถาวรไม่ได้ ยังมี ${unitsUsing} เครื่องใช้อยู่` : undefined}
              className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-[11px] font-bold text-destructive hover:bg-destructive/20 disabled:opacity-40 disabled:hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-3 w-3" /> ลบถาวร
            </button>
          </div>
        )}
      </div>

      {!canPurge && (
        <p className="text-[11px] text-warning-foreground mt-2 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 shrink-0" /> ลบถาวรไม่ได้ ยังมี {unitsUsing} เครื่องใช้อยู่
        </p>
      )}

      {isConfirming && (
        <div className="mt-3 pt-3 border-t border-dashed border-border flex items-center justify-between gap-3">
          <p className="text-xs font-bold text-destructive">ยืนยันลบถาวร? กู้คืนไม่ได้อีก</p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onSetConfirm(null)}
              disabled={isPending}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-[11px] font-bold text-foreground hover:bg-secondary transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={onPurge}
              disabled={isPending}
              className="rounded-lg bg-destructive px-3 py-1.5 text-[11px] font-bold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition-colors"
            >
              {isPending ? "กำลังลบ..." : "ยืนยันลบถาวร"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

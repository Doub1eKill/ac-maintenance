"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { saveMaintenanceScheduleAction } from "@/app/tech/actions";
import type { TechnicianAssetUnit } from "@/lib/maintenance";

interface ScheduleModalProps {
  unit: TechnicianAssetUnit;
  onClose: () => void;
}

/**
 * The cleaning cycle of one unit.
 *
 * A short list of fields on purpose: saveMaintenanceScheduleAction recomputes
 * nextDueDate from the cycle and the last visit, so a technician who shortens
 * the interval does not also have to work out the new due date.
 */
export function ScheduleModal({ unit, onClose }: ScheduleModalProps) {
  const router = useRouter();
  const [value, setValue] = useState(String(unit.schedule?.value ?? 6));
  const [unitOfTime, setUnitOfTime] = useState(unit.schedule?.unit ?? "months");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) {
      toast.error("กรุณาระบุตัวเลขรอบการล้างให้ถูกต้อง");
      return;
    }

    const formData = new FormData();
    formData.append("airConditionerId", unit.id);
    formData.append("frequencyValue", value);
    formData.append("frequencyUnit", unitOfTime);

    startTransition(async () => {
      const res = await saveMaintenanceScheduleAction(formData);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("บันทึกรอบการล้างแอร์แล้ว");
      router.refresh();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 backdrop-blur-xs sm:items-center sm:p-4">
      <div className="w-full max-w-sm space-y-4 rounded-t-3xl border border-border bg-card p-6 pb-10 shadow-2xl animate-in slide-in-from-bottom-full sm:rounded-2xl sm:pb-6 sm:slide-in-from-bottom-0 sm:fade-in">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-sm font-bold text-foreground">รอบการล้างแอร์ ({unit.acCode})</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="mb-1.5 block font-bold text-foreground">ตัวเลข</label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-xl border border-border bg-muted px-3.5 py-3 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block font-bold text-foreground">หน่วย</label>
            <NativeSelect
              value={unitOfTime}
              onChange={(e) => setUnitOfTime(e.target.value)}
              className="h-auto w-full rounded-xl border-border px-3.5 py-3 text-xs text-foreground"
            >
              <NativeSelectOption value="days">วัน</NativeSelectOption>
              <NativeSelectOption value="months">เดือน</NativeSelectOption>
              <NativeSelectOption value="years">ปี</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>

        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="w-1/2 rounded-xl border border-border py-2.5 font-bold text-foreground hover:bg-secondary"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="w-1/2 rounded-xl bg-primary py-2.5 font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}

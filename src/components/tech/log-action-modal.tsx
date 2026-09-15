"use client";

import { useState } from "react";
import { X, Sparkles, Wrench, Droplets, PencilLine } from "lucide-react";
import { PhotoUpload } from "@/components/tech/photo-upload";
import { shrinkImage } from "@/lib/client-image";
import type { FileWithPreview } from "@/hooks/use-file-upload";
import { UnitCataloguePanel } from "@/components/tech/unit-catalogue-panel";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import type { TechJobItem } from "@/components/tech/types";

interface LogActionModalProps {
  job: TechJobItem | null;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
  onValidationError: (message: string) => void;
}

export function LogActionModal({ job, isPending, onClose, onSubmit, onValidationError }: LogActionModalProps) {
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [beforePhotos, setBeforePhotos] = useState<FileWithPreview[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<FileWithPreview[]>([]);
  const [repairDetail, setRepairDetail] = useState("");
  const [editingUnit, setEditingUnit] = useState(false);
  // What the unit says after an in-modal correction. null until one is made,
  // so the job's own values stay the source of truth the rest of the time.
  const [unitOverride, setUnitOverride] = useState<{ label: string; btu: number | null } | null>(null);

  function toggleAction(action: string) {
    setSelectedActions((prev) =>
      prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (selectedActions.length === 0) {
      onValidationError("กรุณาเลือกประเภทการดำเนินการอย่างน้อย 1 รายการ");
      return;
    }

    if (selectedActions.includes("repair") && !repairDetail.trim()) {
      onValidationError("กรุณาระบุรายละเอียดการซ่อม");
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.append("actions", JSON.stringify(selectedActions));

    // A FileWithPreview may wrap stored-file metadata rather than a File;
    // only a real File can travel in the form. Shrunk first: two camera
    // originals in one request is more than a Vercel function will read.
    const before = beforePhotos[0]?.file;
    if (before instanceof File) formData.append("beforePhoto", await shrinkImage(before));
    const after = afterPhotos[0]?.file;
    if (after instanceof File) formData.append("afterPhoto", await shrinkImage(after));

    // Add parts to notes
    const parts = formData.get("parts") as string;
    let notes = formData.get("notes") as string;
    if (parts) {
      notes = `[อะไหล่/น้ำยา: ${parts}]\n${notes}`;
      formData.set("notes", notes);
    }

    onSubmit(formData);
  }

  if (!job) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/40 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-md max-h-[95vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-border bg-card p-6 pb-10 sm:pb-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:fade-in">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-sm font-bold text-foreground">บันทึกประวัติการซ่อม ({job.acCode})</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <input type="hidden" name="workOrderId" value={job.id} />
          <input type="hidden" name="airConditionerId" value={job.airConditionerId || ""} />

          {/* The unit's own record, correctable here. A technician who finds
              that the model on screen is wrong, or missing from the catalogue
              entirely, used to have to abandon the visit and ask an admin. */}
          {job.airConditionerId && (
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="block font-bold text-foreground">เครื่องที่กำลังบันทึก</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {unitOverride?.label ?? job.brand}
                    {(() => {
                      const btu = unitOverride ? unitOverride.btu : job.btu;
                      return btu ? ` · ${btu.toLocaleString()} BTU` : "";
                    })()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingUnit((prev) => !prev)}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-bold text-foreground hover:bg-secondary"
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  {editingUnit ? "ปิด" : "แก้ไขรุ่น/BTU"}
                </button>
              </div>

              {editingUnit && (
                <div className="mt-2">
                  <UnitCataloguePanel
                    airConditionerId={job.airConditionerId}
                    currentLabel={job.brand}
                    currentBtu={job.btu}
                    onSaved={(next) => {
                      setUnitOverride(next);
                      setEditingUnit(false);
                    }}
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <label className="mb-2 block font-bold text-foreground">ประเภทการดำเนินการ <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-3 gap-2">
              <div
                onClick={() => toggleAction("cleaning")}
                className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center cursor-pointer transition-colors ${selectedActions.includes("cleaning") ? "border-foreground bg-secondary ring-1 ring-foreground" : "border-border bg-muted hover:border-muted-foreground"}`}
              >
                <Sparkles className="h-4 w-4 text-foreground mb-1" />
                <span className="font-bold text-foreground">ล้างแอร์</span>
              </div>

              <div
                onClick={() => toggleAction("repair")}
                className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center cursor-pointer transition-colors ${selectedActions.includes("repair") ? "border-foreground bg-secondary ring-1 ring-foreground" : "border-border bg-muted hover:border-muted-foreground"}`}
              >
                <Wrench className="h-4 w-4 text-foreground mb-1" />
                <span className="font-bold text-foreground">ซ่อมแอร์</span>
              </div>

              <div
                onClick={() => toggleAction("refill_refrigerant")}
                className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center cursor-pointer transition-colors ${selectedActions.includes("refill_refrigerant") ? "border-foreground bg-secondary ring-1 ring-foreground" : "border-border bg-muted hover:border-muted-foreground"}`}
              >
                <Droplets className="h-4 w-4 text-foreground mb-1" />
                <span className="font-bold text-foreground">เติมน้ำยาแอร์</span>
              </div>
            </div>
          </div>

          {selectedActions.includes("repair") && (
            <div>
              <label className="mb-1 block font-bold text-foreground">
                ซ่อมอะไรไปบ้าง <span className="text-red-500">*</span>
              </label>
              <textarea
                name="repairDetail"
                value={repairDetail}
                onChange={(e) => setRepairDetail(e.target.value)}
                rows={2}
                placeholder="เช่น เปลี่ยนคาปาซิเตอร์ ล้างคอยล์เย็น..."
                className="w-full rounded-xl border border-border bg-muted px-3.5 py-2 text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="mb-2 block font-bold text-foreground">รูปภาพหลักฐาน (ก่อนทำ/หลังทำ)</label>
            <div className="flex flex-col gap-3">
              <div className="border border-border p-2 rounded-xl bg-muted">
                <div className="text-[10px] font-bold text-muted-foreground mb-1">ภาพก่อนซ่อมบำรุง:</div>
                <PhotoUpload
                  maxFiles={1}
                  multiple={false}
                  className="w-full"
                  onFilesChange={(files) => setBeforePhotos(files)}
                />
              </div>
              <div className="border border-border p-2 rounded-xl bg-muted">
                <div className="text-[10px] font-bold text-muted-foreground mb-1">ภาพหลังซ่อมบำรุง:</div>
                <PhotoUpload
                  maxFiles={1}
                  multiple={false}
                  className="w-full"
                  onFilesChange={(files) => setAfterPhotos(files)}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block font-bold text-foreground">สถานะแอร์หลังซ่อม <span className="text-red-500">*</span></label>
              <NativeSelect name="acStatus" className="w-full h-auto py-2.5 px-3 rounded-xl border-border bg-muted text-xs font-bold text-foreground" required defaultValue="normal">
                <NativeSelectOption value="normal">ใช้งานได้ปกติ</NativeSelectOption>
                <NativeSelectOption value="broken">รออะไหล่/ใช้งานไม่ได้</NativeSelectOption>
                <NativeSelectOption value="needs_cleaning">แอร์ไม่เย็น/รอตรวจสอบ</NativeSelectOption>
              </NativeSelect>
            </div>
            <div>
              <label className="mb-1 block font-bold text-foreground">รายละเอียดอะไหล่/น้ำยาแอร์</label>
              <input
                type="text"
                name="parts"
                placeholder="เช่น R32 10 ปอนด์"
                className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block font-bold text-foreground">บันทึกเพิ่มเติม (ไม่บังคับ)</label>
            <textarea
              name="notes"
              rows={2}
              placeholder="รายละเอียดอาการ หรือปัญหาที่พบ..."
              className="w-full rounded-xl border border-border bg-muted px-3.5 py-2 text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 rounded-xl border border-border py-2.5 font-bold text-foreground hover:bg-secondary"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="w-1/2 rounded-xl bg-primary py-2.5 font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? "กำลังบันทึก..." : "บันทึกและเสร็จสิ้น"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

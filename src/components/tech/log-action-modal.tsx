"use client";

import { useState } from "react";
import { X, Sparkles, Wrench, Droplets } from "lucide-react";
import { Pattern as FileUpload } from "@/components/examples/c-file-upload-4";
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
  const [beforePhotos, setBeforePhotos] = useState<any[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<any[]>([]);
  const [repairDetail, setRepairDetail] = useState("");

  function toggleAction(action: string) {
    setSelectedActions((prev) =>
      prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action]
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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

    if (beforePhotos.length > 0) {
      formData.append("beforePhoto", beforePhotos[0].file);
    }
    if (afterPhotos.length > 0) {
      formData.append("afterPhoto", afterPhotos[0].file);
    }

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
      <div className="w-full max-w-md max-h-[95vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-border bg-white p-6 pb-10 sm:pb-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:fade-in">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-sm font-bold text-foreground">บันทึกประวัติการซ่อม ({job.acCode})</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <input type="hidden" name="workOrderId" value={job.id} />
          <input type="hidden" name="airConditionerId" value={job.airConditionerId || ""} />

          <div>
            <label className="mb-2 block font-bold text-foreground">ประเภทการดำเนินการ <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-3 gap-2">
              <div
                onClick={() => toggleAction("cleaning")}
                className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center cursor-pointer transition-colors ${selectedActions.includes("cleaning") ? "border-slate-950 bg-secondary ring-1 ring-slate-950" : "border-border bg-muted hover:border-slate-400"}`}
              >
                <Sparkles className="h-4 w-4 text-foreground mb-1" />
                <span className="font-bold text-foreground">ล้างแอร์</span>
              </div>

              <div
                onClick={() => toggleAction("repair")}
                className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center cursor-pointer transition-colors ${selectedActions.includes("repair") ? "border-slate-950 bg-secondary ring-1 ring-slate-950" : "border-border bg-muted hover:border-slate-400"}`}
              >
                <Wrench className="h-4 w-4 text-foreground mb-1" />
                <span className="font-bold text-foreground">ซ่อมแอร์</span>
              </div>

              <div
                onClick={() => toggleAction("refill_refrigerant")}
                className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center cursor-pointer transition-colors ${selectedActions.includes("refill_refrigerant") ? "border-slate-950 bg-secondary ring-1 ring-slate-950" : "border-border bg-muted hover:border-slate-400"}`}
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
                <FileUpload
                  maxFiles={1}
                  className="w-full"
                  onFilesChange={(files) => setBeforePhotos(files)}
                />
              </div>
              <div className="border border-border p-2 rounded-xl bg-muted">
                <div className="text-[10px] font-bold text-muted-foreground mb-1">ภาพหลังซ่อมบำรุง:</div>
                <FileUpload
                  maxFiles={1}
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
                <NativeSelectOption value="normal">✅ ใช้งานได้ปกติ</NativeSelectOption>
                <NativeSelectOption value="broken">⚠️ รออะไหล่/ใช้งานไม่ได้</NativeSelectOption>
                <NativeSelectOption value="needs_cleaning">❄️ แอร์ไม่เย็น/รอตรวจสอบ</NativeSelectOption>
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
              className="w-1/2 rounded-xl bg-foreground py-2.5 font-bold text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? "กำลังบันทึก..." : "บันทึกและเสร็จสิ้น"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

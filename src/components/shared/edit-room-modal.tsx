"use client";

import { X } from "lucide-react";
import type { FormEvent } from "react";
import { nativeValidity } from "@/lib/native-validity";

// Renaming a room, or moving it to another floor. Shared by the admin asset
// page and the technician's (technicians may correct rooms, not buildings).
// The form goes back through onSubmit; the caller adds the id and picks the
// server action for its side.

type SubmitHandler = (e: FormEvent<HTMLFormElement>) => void | Promise<void>;

/** Codes already printed stay as they are; this says so where the name is changed. */
export function KeptCodesNote({ unitCount, what }: { unitCount: number; what: string }) {
  if (unitCount === 0) return null;
  return (
    <p className="rounded-xl border border-border bg-muted px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
      แอร์ {unitCount} เครื่องที่ลงทะเบียนแล้วจะใช้รหัสเดิม (ตรงกับสติกเกอร์ QR ที่ติดไว้) เฉพาะแอร์ที่ลงทะเบียนหลังจากนี้จะใช้{what}ใหม่ในรหัส
    </p>
  );
}

/** The room being edited, as the tree has it. */
export type EditRoomTarget = { id: string; name: string; floor: number | null; unitCount: number };

export function EditRoomModal({ target, isPending, onClose, onSubmit }: { target: EditRoomTarget; isPending: boolean; onClose: () => void; onSubmit: SubmitHandler }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-base font-bold text-foreground">แก้ไขห้อง</h3>
          <button onClick={onClose} aria-label="ปิด" className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 text-xs">
          <div>
            <label htmlFor="edit-room-name" className="mb-1.5 block font-bold text-foreground">ชื่อห้อง / หมายเลขห้อง</label>
            <input id="edit-room-name" name="name" required defaultValue={target.name} className="w-full rounded-xl border border-border px-3.5 py-2.5 text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label htmlFor="edit-room-floor" className="mb-1.5 block font-bold text-foreground">ชั้น</label>
            <input
              id="edit-room-floor"
              name="floor"
              type="number"
              min={0}
              required
              {...nativeValidity({
                valueMissing: "กรุณาระบุชั้น",
                rangeUnderflow: "ชั้นต้องเป็น 0 ขึ้นไป",
                stepMismatch: "ชั้นต้องเป็นจำนวนเต็ม",
                badInput: "ชั้นต้องเป็นตัวเลข",
              })}
              defaultValue={target.floor ?? undefined}
              className="w-full rounded-xl border border-border px-3.5 py-2.5 text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <KeptCodesNote unitCount={target.unitCount} what="ชื่อห้อง" />
          <button type="submit" disabled={isPending} className="w-full rounded-xl bg-primary py-2.5 font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {isPending ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
          </button>
        </form>
      </div>
    </div>
  );
}

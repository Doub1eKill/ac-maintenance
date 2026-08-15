"use client";

import { X } from "lucide-react";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import type { PendingUser } from "@/components/admin/types";

interface AssignWorkOrderModalProps {
  open: boolean;
  activeTechnicians: PendingUser[];
  isPending: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function AssignWorkOrderModal({ open, activeTechnicians, isPending, onClose, onSubmit }: AssignWorkOrderModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-base font-bold text-foreground">มอบหมายงานให้ช่างเทคนิค</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs">
          <div>
            <label className="mb-1.5 block font-bold text-foreground">เลือกช่างเทคนิคที่ต้องการมอบหมายงาน</label>
            <NativeSelect name="assignToUserId" required defaultValue="" className="w-full h-auto py-3 px-3.5 rounded-xl border-border bg-muted text-xs text-foreground">
              <NativeSelectOption value="" disabled>-- เลือกช่างเทคนิค --</NativeSelectOption>
              {activeTechnicians.length === 0 ? (
                <NativeSelectOption value="none" disabled>ไม่มีช่างเทคนิคที่พร้อมรับงาน</NativeSelectOption>
              ) : (
                activeTechnicians.map((tech) => (
                  <NativeSelectOption key={tech.id} value={tech.id}>
                    {tech.name}
                  </NativeSelectOption>
                ))
              )}
            </NativeSelect>
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
              {isPending ? "กำลังบันทึก..." : "ยืนยันการมอบหมาย"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

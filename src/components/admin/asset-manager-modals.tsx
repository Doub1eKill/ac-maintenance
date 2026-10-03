"use client";

import { toast } from "sonner";
import { X, QrCode, CalendarClock, Printer, Hash } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { nativeValidity } from "@/lib/native-validity";
import { StickerCard, openStickerSheet, qrTargetUrl } from "@/components/shared/qr-sticker";
import { formatUnitLocation } from "@/lib/location";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { ACUnit, QrModalData } from "@/components/admin/asset-manager-types";
import type { FormEvent } from "react";

// The asset manager's simpler dialogs, lifted out of asset-manager.tsx as they
// were. Each shows what it is given and hands its form back through onSubmit;
// the state that opens it and the submit handlers stay in AssetManager.

type SubmitHandler = (e: FormEvent<HTMLFormElement>) => void | Promise<void>;

/** Which building a room goes into, and the floor when it is already known. */
export type AddRoomTarget = { buildingId: string; floor?: number | null };

export function AddBuildingModal({ isPending, onClose, onSubmit }: { isPending: boolean; onClose: () => void; onSubmit: SubmitHandler }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-base font-bold text-foreground">เพิ่มอาคารใหม่</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 text-xs">
          <div>
            <label className="mb-1.5 block font-bold text-foreground">ชื่ออาคาร</label>
            <input name="name" required placeholder="เช่น อาคารคณะวิทยาศาสตร์" className="w-full rounded-xl border border-border px-3.5 py-2.5 text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-1.5 block font-bold text-foreground">ตัวย่อ (สำหรับรหัสแอร์)</label>
            <input name="abbreviation" required placeholder="เช่น SCI" className="w-full font-mono rounded-xl border border-border px-3.5 py-2.5 text-foreground focus:border-primary focus:outline-none" />
          </div>
          <button type="submit" disabled={isPending} className="w-full rounded-xl bg-primary py-2.5 font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {isPending ? "กำลังบันทึก..." : "บันทึกอาคาร"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function AddRoomModal({ target, isPending, onClose, onSubmit }: { target: AddRoomTarget; isPending: boolean; onClose: () => void; onSubmit: SubmitHandler }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-base font-bold text-foreground">
            {target.floor === undefined
              ? "เพิ่มชั้นใหม่"
              : `เพิ่มห้อง (${target.floor === null ? "ไม่ระบุชั้น" : `ชั้น ${target.floor}`})`}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 text-xs">
          <div>
            <label className="mb-1.5 block font-bold text-foreground">ชื่อห้อง / หมายเลขห้อง</label>
            <input name="name" required placeholder="เช่น 204 หรือ ห้องสมุด" className="w-full rounded-xl border border-border px-3.5 py-2.5 text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-1.5 block font-bold text-foreground">ชั้น</label>
            <input
              name="floor"
              type="number"
              min={0}
              required
              placeholder="เช่น 2"
              {...nativeValidity({
                valueMissing: "กรุณาระบุชั้น",
                rangeUnderflow: "ชั้นต้องเป็น 0 ขึ้นไป",
                stepMismatch: "ชั้นต้องเป็นจำนวนเต็ม",
                badInput: "ชั้นต้องเป็นตัวเลข",
              })}
              // Filled in and read-only when the floor is already known, so
              // the room cannot land on a different floor than the header
              // it was opened from says.
              defaultValue={target.floor ?? undefined}
              readOnly={target.floor !== undefined && target.floor !== null}
              className="w-full rounded-xl border border-border px-3.5 py-2.5 text-foreground focus:border-primary focus:outline-none read-only:bg-muted read-only:text-muted-foreground"
            />
            {target.floor === undefined && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                ชั้นเกิดขึ้นจากห้องที่อยู่บนชั้นนั้น การสร้างชั้นใหม่จึงคือการสร้างห้องแรกของชั้น
              </p>
            )}
          </div>
          <button type="submit" disabled={isPending} className="w-full rounded-xl bg-primary py-2.5 font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {isPending ? "กำลังบันทึก..." : "บันทึกห้อง"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function PmSettingsModal({ unit, isPending, onClose, onSubmit }: { unit: ACUnit; isPending: boolean; onClose: () => void; onSubmit: SubmitHandler }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            รอบบำรุงรักษา ({unit.acCode})
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block font-bold text-foreground">ตัวเลข</label>
              <input 
                name="frequencyValue" 
                type="number"
                required 
                min="1"
                defaultValue={unit.maintenanceSchedule?.frequencyValue || 6}
                className="w-full rounded-xl border border-border px-3.5 py-2.5 text-foreground focus:border-primary focus:outline-none" 
              />
            </div>
            <div>
              <label className="mb-1.5 block font-bold text-foreground">หน่วยเวลา</label>
              <NativeSelect name="frequencyUnit" required defaultValue={unit.maintenanceSchedule?.frequencyUnit || "months"} className="w-full h-auto py-3 px-3.5 rounded-xl border-border text-xs text-foreground">
                <NativeSelectOption value="" disabled>-- เลือกหน่วย --</NativeSelectOption>
                <NativeSelectOption value="days">วัน</NativeSelectOption>
                <NativeSelectOption value="months">เดือน</NativeSelectOption>
                <NativeSelectOption value="years">ปี</NativeSelectOption>
              </NativeSelect>
            </div>
          </div>
          <button type="submit" disabled={isPending} className="w-full rounded-xl bg-primary py-2.5 font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 mt-2">
            {isPending ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function QrCodeModal({ unit, onClose }: { unit: QrModalData; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground bg-secondary p-1.5 rounded-full transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-center space-y-1 pt-2">
          <h3 className="text-lg font-bold text-foreground tracking-tight flex items-center justify-center gap-2">
            <QrCode className="w-5 h-5 text-foreground" />
            ตัวอย่าง QR ประจำเครื่อง
          </h3>
          <p className="text-xs text-muted-foreground font-medium">สแกนเพื่อดูประวัติการซ่อมบำรุง</p>
        </div>

        <div className="flex justify-center">
          {/* force-light: this box is what gets printed/scanned, so it stays
              a plain white card with dark text no matter the dashboard's
              active theme. */}
          <div className="force-light bg-card p-4 rounded-2xl border-2 border-border shadow-sm flex flex-col items-center gap-3">
            <QRCodeSVG
              value={qrTargetUrl(unit.qrCode)}
              size={160}
              level="H"
              includeMargin={true}
              className="rounded-lg"
            />
            <div className="text-center">
              <div className="font-mono font-bold text-foreground text-sm tracking-widest">{unit.acCode}</div>
              <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
                {unit.brand} {unit.model ? `(${unit.model})` : ""}
              </div>
              <div className="text-[10px] text-muted-foreground font-medium">
                {unit.btu ? `${unit.btu.toLocaleString()} BTU` : "ไม่ระบุ BTU"}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-muted px-4 py-3 text-center space-y-1">
          <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-foreground">
            <Hash className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {unit.roomSequence !== null
              ? `เครื่องที่ ${unit.roomSequence} ของห้องนี้`
              : "ไม่ทราบลำดับในห้อง"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {formatUnitLocation(
              {
                name: unit.roomName,
                floor: unit.floor,
                building: { name: unit.buildingName },
              },
              { withFloor: true }
            )}
            {" · "}
            ห้องนี้มีแอร์ในระบบ {unit.roomUnitsCount} เครื่อง
          </p>
        </div>

        {/* Hidden sticker artifact lifted by the print button */}
        <div id="asset-single-sticker-print-area" className="hidden">
          <StickerCard ac={unit} />
        </div>

        <button
          onClick={() => {
            const html = document.getElementById("asset-single-sticker-print-area")?.innerHTML;
            if (!html) {
              toast.error("เตรียมข้อมูลสำหรับพิมพ์ไม่สำเร็จ กรุณาโหลดหน้าใหม่แล้วลองอีกครั้ง");
              return;
            }
            openStickerSheet(html, `พิมพ์ QR Code - ${unit.acCode}`);
          }}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow-md shadow-slate-900/20"
        >
          <Printer className="w-4 h-4" /> พิมพ์ (Print)
        </button>
      </div>
    </div>
  );
}

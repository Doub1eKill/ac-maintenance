"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import { shrinkImage } from "@/lib/client-image";
import { nativeValidity } from "@/lib/native-validity";

interface UnitPhotoFieldProps {
  /** The form field name the server action reads. */
  name?: string;
  /** Registration: a unit cannot be created without its picture. */
  required?: boolean;
  /** The picture already stored, when editing; shown until a new one is picked. */
  currentUrl?: string | null;
  disabled?: boolean;
  /** Visible label. */
  label?: string;
  /** Small print under the field. */
  hint?: string;
  /**
   * The (shrunk) file just picked, or null when the pick was cleared — for
   * callers that assemble their own FormData instead of submitting a <form>.
   */
  onPick?: (file: File | null) => void;
}

/**
 * The one picture of the unit itself — what a visitor sees first after
 * scanning its sticker. One field, used by every form that registers or edits
 * a unit, so the rule about what may be uploaded is written once.
 *
 * A plain <input type="file"> inside the form, so every caller's
 * `new FormData(form)` picks it up with no wiring. The picked file is shrunk
 * in the browser (lib/client-image.ts) and written back into the input
 * through a DataTransfer, the same way the register form handles avatars:
 * what the form submits is the shrunk file.
 */
export function UnitPhotoField({
  name = "photo",
  required = false,
  currentUrl = null,
  disabled = false,
  label = "รูปเครื่องปรับอากาศ",
  hint,
  onPick,
}: UnitPhotoFieldProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  async function handlePick(file: File | null) {
    if (!file) {
      setPreview(null);
      onPick?.(null);
      return;
    }
    setBusy(true);
    try {
      const picked = await shrinkImage(file);
      if (picked !== file && inputRef.current && typeof DataTransfer !== "undefined") {
        const dt = new DataTransfer();
        dt.items.add(picked);
        inputRef.current.files = dt.files;
      }
      setPreview(URL.createObjectURL(picked));
      onPick?.(picked);
    } finally {
      setBusy(false);
    }
  }

  function clearPick() {
    if (inputRef.current) inputRef.current.value = "";
    setPreview(null);
    onPick?.(null);
  }

  const shown = preview ?? currentUrl;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-bold text-foreground">
        {label}
        {required ? " *" : ""}
      </label>
      <div className="flex items-center gap-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
          {shown ? (
            // Plain <img>: a local object URL has no place in next/image, and
            // the stored picture is already the size this thumbnail needs.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Camera className="h-6 w-6" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <label
            htmlFor={id}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:bg-muted ${disabled || busy ? "pointer-events-none opacity-50" : ""}`}
          >
            <ImagePlus className="h-3.5 w-3.5" />
            {busy ? "กำลังเตรียมรูป..." : preview ? "เลือกรูปอื่น" : currentUrl ? "เปลี่ยนรูปเครื่อง" : "เพิ่มรูปเครื่อง"}
          </label>
          {preview && (
            <button
              type="button"
              onClick={clearPick}
              disabled={disabled}
              className="ml-2 inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" /> ยกเลิกรูปที่เลือก
            </button>
          )}
          <p className="text-[11px] text-muted-foreground">
            {hint ?? (required ? "ถ่ายหรือเลือกรูปตัวเครื่อง 1 รูป (ไม่ใช่รูปหลังซ่อม)" : "เว้นว่าง = ใช้รูปเดิม")}
          </p>
        </div>
      </div>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept="image/*"
        // Required only while there is nothing stored: an edit form with a
        // picture already on the unit must not demand a new one.
        required={required && !currentUrl}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => void handlePick(e.target.files?.[0] ?? null)}
        {...nativeValidity({ valueMissing: "กรุณาแนบรูปเครื่องปรับอากาศ 1 รูป" })}
      />
    </div>
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { PhotoSource } from "@/components/shared/photo-source";
import { shrinkImage } from "@/lib/client-image";

interface PhotoPickerFieldProps {
  /** The form field name the server action reads. */
  name?: string;
  /** Registration: a unit cannot be created without its picture. */
  required?: boolean;
  /** The bubble shown when `required` fails. */
  requiredMessage?: string;
  /** The picture already stored, when editing; shown until a new one is picked. */
  currentUrl?: string | null;
  disabled?: boolean;
  /** Visible label. */
  label?: string;
  /** Small print under the buttons. */
  hint?: string;
  /** Which camera "ถ่ายรูป" opens. Units are shot with the back camera. */
  facing?: "environment" | "user";
  /**
   * The (shrunk) file just picked, or null when the pick was cleared — for
   * callers that assemble their own FormData instead of submitting a <form>.
   */
  onPick?: (file: File | null) => void;
}

/**
 * One picture, taken now or chosen from the phone: the unit itself on the
 * register and edit forms, the before/after evidence on a maintenance log.
 * One field for all of them, so the rule about what may be uploaded — and
 * the two ways of getting it — is written once.
 *
 * A plain <input type="file"> inside the form (see PhotoSource), so every
 * caller's `new FormData(form)` picks it up with no wiring. The picked file
 * is shrunk in the browser (lib/client-image.ts) and written back into the
 * input through a DataTransfer: what the form submits is the shrunk file.
 */
export function PhotoPickerField({
  name = "photo",
  required = false,
  requiredMessage = "กรุณาแนบรูปภาพ 1 รูป",
  currentUrl = null,
  disabled = false,
  label = "รูปภาพ",
  hint,
  facing = "environment",
  onPick,
}: PhotoPickerFieldProps) {
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
      <div className="flex items-start gap-3">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
          {shown ? (
            // Plain <img>: a local object URL has no place in next/image, and
            // the stored picture is already the size this thumbnail needs.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Camera className="h-7 w-7" />
            </div>
          )}
          {preview && (
            <button
              type="button"
              onClick={clearPick}
              disabled={disabled}
              aria-label="ลบรูปที่เลือก"
              className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-foreground/70 text-background hover:bg-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <PhotoSource
            id={id}
            name={name}
            // Required only while there is nothing stored: an edit form with a
            // picture already on the unit must not demand a new one.
            required={required && !currentUrl}
            requiredMessage={requiredMessage}
            disabled={disabled || busy}
            facing={facing}
            inputRef={inputRef}
            onFile={(file) => void handlePick(file)}
          />
          <p className="text-[11px] text-muted-foreground">
            {busy
              ? "กำลังเตรียมรูป..."
              : preview
                ? "เลือกรูปใหม่ได้จากปุ่มด้านบน"
                : (hint ?? (required ? "ถ่ายหรือเลือกรูป 1 รูป" : "เว้นว่าง = ใช้รูปเดิม"))}
          </p>
        </div>
      </div>
    </div>
  );
}

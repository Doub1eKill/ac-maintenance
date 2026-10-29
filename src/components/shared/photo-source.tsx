"use client";

import { useRef, useSyncExternalStore, type RefObject } from "react";
import { Camera, Images } from "lucide-react";
import { nativeValidity } from "@/lib/native-validity";

interface PhotoSourceProps {
  /** The form field name the server action reads; omit when the caller keeps the File itself. */
  name?: string;
  id?: string;
  required?: boolean;
  /** The bubble shown when `required` fails, in place of the browser's English. */
  requiredMessage?: string;
  disabled?: boolean;
  /** Which camera "ถ่ายรูป" opens: the back one for a unit, the front one for a face. */
  facing?: "environment" | "user";
  /** The form input — what a `new FormData(form)` reads, and what a caller writes a shrunk file back into. */
  inputRef?: RefObject<HTMLInputElement | null>;
  /** The file just picked from either source, or null when the pick was cleared. */
  onFile: (file: File | null) => void;
  /** The words on the two buttons, when the defaults do not fit the screen. */
  labels?: { camera?: string; gallery?: string };
  className?: string;
  buttonClassName?: string;
}

// Whether this is a touch device — a phone or a tablet — as one hydration-safe
// read. `capture` only means something there: a desktop browser ignores it
// and opens the file dialog, which under a button that says "ถ่ายรูป" is a
// lie, so the button is left out where the pointer is a mouse.
const COARSE = "(pointer: coarse)";
function useCoarsePointer() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(COARSE);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(COARSE).matches,
    () => false
  );
}

/**
 * Two ways in for one picture: the camera, or the pictures already on the
 * phone. One button each, so a technician standing at the unit is not sent
 * through the OS's "camera or files?" sheet first — and, on the camera path,
 * the phone opens straight into its camera app rather than a picker.
 *
 * Two hidden inputs do the work. The first carries the field's name and is
 * the one a form submits and a caller writes back into; it has no `capture`,
 * so it opens the gallery (Android) or the OS sheet (iOS gives no way to ask
 * for the library alone). The second has `capture` and no name: whatever it
 * receives is copied into the first, so the rest of the form never learns
 * which button was pressed. It is rendered second on purpose — a caller (or
 * a test) that reaches for the first `input[type=file]` gets the form one.
 *
 * Native camera by design, not an in-app viewfinder: the phone's own camera
 * brings focus, flash, HDR and orientation for free, and asks for no
 * permission of its own.
 */
export function PhotoSource({
  name,
  id,
  required = false,
  requiredMessage = "กรุณาเลือกรูปภาพ",
  disabled = false,
  facing = "environment",
  inputRef,
  onFile,
  labels,
  className = "",
  buttonClassName = "",
}: PhotoSourceProps) {
  const ownInputRef = useRef<HTMLInputElement>(null);
  // The caller's ref when it brought one (it writes a shrunk file back
  // through it), this component's own otherwise.
  const formInputRef = inputRef ?? ownInputRef;
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const hasCamera = useCoarsePointer();

  function fromCamera(file: File | null) {
    const form = formInputRef.current;
    if (file && form && typeof DataTransfer !== "undefined") {
      const dt = new DataTransfer();
      dt.items.add(file);
      form.files = dt.files;
    }
    // The camera input has done its job; empty it so the same shot can be
    // retaken after a clear.
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    onFile(file);
  }

  const button = `inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 text-xs font-bold text-foreground transition-colors hover:bg-muted ${
    disabled ? "pointer-events-none opacity-50" : ""
  } ${buttonClassName}`;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {hasCamera && (
        <button type="button" onClick={() => cameraInputRef.current?.click()} disabled={disabled} className={button}>
          <Camera className="h-4 w-4" />
          {labels?.camera ?? "ถ่ายรูป"}
        </button>
      )}
      <button type="button" onClick={() => formInputRef.current?.click()} disabled={disabled} className={button}>
        <Images className="h-4 w-4" />
        {labels?.gallery ?? (hasCamera ? "เลือกจากคลัง" : "เลือกรูป")}
      </button>

      <input
        ref={formInputRef}
        id={id}
        name={name}
        type="file"
        accept="image/*"
        aria-label={labels?.gallery ?? (hasCamera ? "เลือกรูปจากคลัง" : "เลือกรูปภาพ")}
        required={required}
        disabled={disabled}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        {...nativeValidity({ valueMissing: requiredMessage })}
      />
      {hasCamera && (
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture={facing}
          disabled={disabled}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => fromCamera(e.target.files?.[0] ?? null)}
        />
      )}
    </div>
  );
}

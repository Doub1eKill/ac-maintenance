"use client";

import { PhotoPickerField } from "@/components/shared/photo-picker-field";

interface UnitPhotoFieldProps {
  /** The form field name the server action reads. */
  name?: string;
  /** Registration: a unit cannot be created without its picture. */
  required?: boolean;
  /** The picture already stored, when editing; shown until a new one is picked. */
  currentUrl?: string | null;
  disabled?: boolean;
  /** Small print under the field. */
  hint?: string;
  /** The (shrunk) file just picked, or null when the pick was cleared. */
  onPick?: (file: File | null) => void;
}

/**
 * The one picture of the unit itself — what a visitor sees first after
 * scanning its sticker. PhotoPickerField with the unit's wording, used by
 * every form that registers or edits a unit, so the words are written once.
 */
export function UnitPhotoField({ name = "photo", required = false, currentUrl = null, disabled = false, hint, onPick }: UnitPhotoFieldProps) {
  return (
    <PhotoPickerField
      name={name}
      required={required}
      requiredMessage="กรุณาแนบรูปเครื่องปรับอากาศ 1 รูป"
      currentUrl={currentUrl}
      disabled={disabled}
      label="รูปเครื่องปรับอากาศ"
      hint={hint ?? (required ? "ถ่ายหรือเลือกรูปตัวเครื่อง 1 รูป (ไม่ใช่รูปหลังซ่อม)" : undefined)}
      facing="environment"
      onPick={onPick}
    />
  );
}

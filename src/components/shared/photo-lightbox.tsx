"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface LightboxPhoto {
  src: string;
  /** What the picture is of — "ก่อนซ่อม", "หลังซ่อม" — shown under it. */
  label: string;
}

interface PhotoLightboxProps {
  photos: LightboxPhoto[];
  /** Which photo is open; null keeps the lightbox closed. */
  index: number | null;
  onClose: () => void;
}

/**
 * One picture at a time, as large as the screen allows, with arrows between
 * the pictures of one set. Built on the shared Dialog so it closes the way
 * every other overlay here does — Escape, the close button, a tap outside.
 *
 * `index` is the caller's; a step here is kept locally so the arrows work
 * without the caller tracking them, and reset whenever a different picture is
 * opened.
 */
export function PhotoLightbox({ photos, index, onClose }: PhotoLightboxProps) {
  const [step, setStep] = useState(0);
  const [openedAt, setOpenedAt] = useState(index);
  if (openedAt !== index) {
    setOpenedAt(index);
    setStep(0);
  }

  const open = index !== null && photos.length > 0;
  const current = open ? (index + step + photos.length) % photos.length : 0;
  const photo = photos[current];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className="max-w-[calc(100%-1rem)] gap-3 bg-card p-3 sm:max-w-3xl sm:p-4 [&_[data-slot=dialog-close]]:top-2 [&_[data-slot=dialog-close]]:right-2 sm:[&_[data-slot=dialog-close]]:top-3 sm:[&_[data-slot=dialog-close]]:right-3"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{photo?.label ?? "รูปภาพ"}</DialogTitle>
          <DialogDescription>รูปภาพขยาย</DialogDescription>
        </DialogHeader>
        {photo && (
          <>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted">
              {/* The stored picture is already capped at 1600px on the way
                  in, so it goes straight through; `sizes` keeps it to the
                  dialog's width. */}
              <Image src={photo.src} alt={photo.label} fill sizes="(max-width: 768px) 100vw, 768px" className="object-contain" priority />
            </div>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                disabled={photos.length < 2}
                aria-label="รูปก่อนหน้า"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-muted disabled:invisible"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-xs font-bold text-foreground">
                {photo.label}
                {photos.length > 1 && <span className="ml-1.5 font-normal text-muted-foreground">{current + 1}/{photos.length}</span>}
              </span>
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={photos.length < 2}
                aria-label="รูปถัดไป"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-muted disabled:invisible"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

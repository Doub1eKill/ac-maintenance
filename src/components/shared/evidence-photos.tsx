"use client";

import { useState } from "react";
import Image from "next/image";
import { ZoomIn } from "lucide-react";
import { PhotoLightbox, type LightboxPhoto } from "@/components/shared/photo-lightbox";

interface EvidencePhotosProps {
  before: string | null | undefined;
  after: string | null | undefined;
  /** Thumbnail edge; the phone lists use the default, dense tables "sm". */
  size?: "sm" | "md";
}

const BOX = { sm: "h-16 w-16", md: "h-24 w-24" } as const;
const PX = { sm: 64, md: 96 } as const;

/**
 * A maintenance log's before/after pictures as a pair of thumbnails, each
 * tapping open into the lightbox with the other one an arrow away.
 *
 * These used to be two text links that opened the raw file in a new tab —
 * the one thing the technician took a picture for, shown as the word
 * "รูปก่อนซ่อม". Renders nothing when the log has no pictures, so callers can
 * drop it into a list without their own guard.
 */
export function EvidencePhotos({ before, after, size = "md" }: EvidencePhotosProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const photos: LightboxPhoto[] = [];
  if (before) photos.push({ src: before, label: "ก่อนซ่อมบำรุง" });
  if (after) photos.push({ src: after, label: "หลังซ่อมบำรุง" });
  if (photos.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {photos.map((photo, i) => (
          <button
            key={photo.label}
            type="button"
            onClick={() => setOpenIndex(i)}
            aria-label={`ดูรูป${photo.label}`}
            className="group relative overflow-hidden rounded-xl border border-border bg-muted text-left"
          >
            <div className={`relative ${BOX[size]}`}>
              <Image src={photo.src} alt={photo.label} fill sizes={`${PX[size]}px`} className="object-cover transition-transform group-hover:scale-105" />
            </div>
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-foreground/60 px-1.5 py-0.5 text-[10px] font-bold text-background">
              {photo.label.replace("ซ่อมบำรุง", "")}
              <ZoomIn className="h-3 w-3" />
            </span>
          </button>
        ))}
      </div>
      <PhotoLightbox photos={photos} index={openIndex} onClose={() => setOpenIndex(null)} />
    </>
  );
}

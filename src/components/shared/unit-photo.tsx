"use client";

import { useState } from "react";
import { UnitThumb } from "@/components/shared/unit-thumb";
import { PhotoLightbox } from "@/components/shared/photo-lightbox";

type Size = "sm" | "md" | "lg";

/**
 * The unit's thumbnail, and a tap on it opens the picture full size
 * (PhotoLightbox, the same viewer as the before/after evidence). Without a
 * picture it is the plain placeholder — nothing to open.
 *
 * Separate from UnitThumb because that one renders on the server and inside
 * cards that are themselves buttons (a button cannot hold another); use this
 * wherever the thumbnail is not already inside something clickable.
 */
export function UnitPhoto({
  src,
  acCode,
  size = "md",
  className = "",
}: {
  src: string | null | undefined;
  acCode: string;
  size?: Size;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const alt = `เครื่อง ${acCode}`;

  if (!src) return <UnitThumb src={null} alt={alt} size={size} className={className} />;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          // Thumbnails sit in rows and headers that react to clicks of their own.
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={`ดูรูปเครื่อง ${acCode}`}
        className={`shrink-0 cursor-zoom-in rounded-xl transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
      >
        <UnitThumb src={src} alt={alt} size={size} />
      </button>
      <PhotoLightbox photos={[{ src, label: `รูปเครื่อง ${acCode}` }]} index={open ? 0 : null} onClose={() => setOpen(false)} />
    </>
  );
}

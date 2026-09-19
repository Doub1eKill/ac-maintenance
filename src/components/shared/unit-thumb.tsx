import Image from "next/image";
import { AirVent } from "lucide-react";

type Size = "sm" | "md" | "lg";

// Pixel sizes, so `sizes` tells next/image exactly what to serve.
const PX: Record<Size, number> = { sm: 40, md: 56, lg: 80 };
const BOX: Record<Size, string> = { sm: "h-10 w-10", md: "h-14 w-14", lg: "h-20 w-20" };
const ICON: Record<Size, string> = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-7 w-7" };

/**
 * The unit's own picture at thumbnail size, or the placeholder that says
 * there is none yet. One component for every list, card and header that
 * names a unit, so "which machine is this" looks the same everywhere and a
 * missing picture is the same quiet vent icon rather than a broken image.
 *
 * No client directive: it renders on the server as happily as on the client.
 */
export function UnitThumb({
  src,
  alt = "",
  size = "md",
  className = "",
}: {
  src: string | null | undefined;
  alt?: string;
  size?: Size;
  className?: string;
}) {
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-xl border border-border bg-muted ${BOX[size]} ${className}`}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={`${PX[size]}px`} className="object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <AirVent className={ICON[size]} />
        </div>
      )}
    </div>
  );
}

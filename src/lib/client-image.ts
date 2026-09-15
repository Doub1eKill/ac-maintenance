// Shrinks a photo in the browser before it is sent to a server action.
//
// The server already resizes to 1600px and re-encodes as JPEG (lib/upload.ts),
// so nothing here is about what gets stored. It is about what crosses the
// wire: a phone camera hands over a 3–5 MB file, and a Vercel function stops
// reading a request body at 4.5 MB — the evidence photos on a maintenance log
// travel two to a form, so that limit was reachable with a single visit. The
// same downscale also cuts a technician's upload over 4G by a factor of ten.
//
// Best effort, never a gate. Anything the browser cannot decode — an odd
// format, a file that only claims to be an image — is handed back untouched
// and the server decides, exactly as it did before this existed. That keeps
// the one real check (sharp refusing bytes it cannot read) where it was.

// Match the server's cap so the two never disagree about what "small" means.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

// Below this the file already fits comfortably and the re-encode would only
// cost time on a slow phone. The server still resizes it if its pixels are big.
const SKIP_BELOW_BYTES = 400 * 1024;

/**
 * The same picture at no more than 1600px on its longest side, as a JPEG, or
 * the original file when it is already small or cannot be decoded here.
 */
export async function shrinkImage(file: File): Promise<File> {
  if (typeof window === "undefined") return file;
  if (!file.type.startsWith("image/") || file.size < SKIP_BELOW_BYTES) return file;
  if (typeof createImageBitmap !== "function") return file;

  let bitmap: ImageBitmap;
  try {
    // from-image applies the EXIF orientation, so a portrait shot stays
    // portrait after it goes through a canvas that knows nothing about EXIF.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }

  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob) return file;
    // A re-encode that came out bigger (a tiny PNG, say) is not worth sending.
    if (blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified });
  } catch {
    return file;
  } finally {
    bitmap.close();
  }
}

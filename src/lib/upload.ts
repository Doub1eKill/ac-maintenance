import { promises as fs } from "fs";
import path from "path";

// Evidence photos come straight off a technician's phone camera, which means
// 3-5 MB files at 4000px+ — far more than the UI ever displays, and paid for
// twice: once on the tech's mobile upload, again on every admin who views the
// work order. Downscale and re-encode before writing to disk.
const MAX_IMAGE_DIMENSION = 1600;
const IMAGE_QUALITY = 80;

// Everything this module writes lives here, and nothing outside it may be
// deleted — see deleteUpload().
const UPLOAD_URL_PREFIX = "/uploads/";

function uploadDir() {
  return path.join(process.cwd(), "public/uploads");
}

/**
 * Writes an uploaded file to public/uploads and returns its public path.
 *
 * Lived in tech/actions.ts until profile pictures needed it from admin/
 * actions.ts too; moved here rather than copied so both callers keep the same
 * resizing and EXIF behaviour. Returns null instead of throwing — a failed
 * photo should not take the maintenance log it belongs to down with it.
 *
 * Do not call this inside a database transaction: it does file I/O, and a
 * transaction held open across a multi-megabyte write keeps its row locks the
 * whole time.
 */
export async function saveUpload(file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const dir = uploadDir();
    await fs.mkdir(dir, { recursive: true });

    if (file.type?.startsWith("image/")) {
      try {
        const { default: sharp } = await import("sharp");
        const processed = await sharp(buffer)
          // withoutEnlargement: a photo already smaller than the cap is left
          // at its own size rather than being upscaled into a bigger file.
          .rotate() // honour EXIF orientation before stripping metadata
          .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ quality: IMAGE_QUALITY, mozjpeg: true })
          .toBuffer();

        const filename = `${Date.now()}-${safeName.replace(/\.[^.]+$/, "")}.jpg`;
        await fs.writeFile(path.join(dir, filename), processed);
        return `${UPLOAD_URL_PREFIX}${filename}`;
      } catch (imageError) {
        // Corrupt/unsupported image, or sharp unavailable on this platform —
        // fall through and store the original rather than losing the evidence.
        console.error("Image processing failed, storing original:", imageError);
      }
    }

    const filename = `${Date.now()}-${safeName}`;
    await fs.writeFile(path.join(dir, filename), buffer);
    return `${UPLOAD_URL_PREFIX}${filename}`;
  } catch (error) {
    console.error("Failed to save file:", error);
    return null;
  }
}

/**
 * Removes a file previously returned by saveUpload().
 *
 * Only for uploads that nothing references any more — a replaced profile
 * picture. Never call it for maintenance log photos: those are evidence that
 * work was performed, and the log rows outlive the work orders they close.
 *
 * Deliberately narrow about what it will delete. The stored path is the only
 * input, and it reaches this function from a database column, so it is treated
 * as untrusted: anything that isn't a plain filename directly under /uploads/
 * is ignored rather than resolved, which is what stops a crafted value like
 * "/uploads/../../.env" from naming a file outside the upload directory.
 *
 * Failure is logged, never thrown. The database row has already been updated
 * by the time this runs; a leftover file on disk is untidy, whereas failing
 * the whole action over it would lose the user's actual change.
 */
export async function deleteUpload(url: string | null | undefined): Promise<void> {
  if (!url || !url.startsWith(UPLOAD_URL_PREFIX)) return;

  const filename = url.slice(UPLOAD_URL_PREFIX.length);
  // basename strips any traversal; comparing back catches the cases where it
  // changed something, which means the input was not a plain filename.
  if (!filename || filename !== path.basename(filename)) return;

  try {
    await fs.unlink(path.join(uploadDir(), filename));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    // Already gone is the outcome we wanted anyway.
    if (code === "ENOENT") return;
    console.error("Failed to delete old upload:", error);
  }
}

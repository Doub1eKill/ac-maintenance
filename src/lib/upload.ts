import { promises as fs } from "fs";
import path from "path";

// Evidence photos come straight off a technician's phone camera, which means
// 3-5 MB files at 4000px+ — far more than the UI ever displays, and paid for
// twice: once on the tech's mobile upload, again on every admin who views the
// work order. Downscale and re-encode before writing to disk.
const MAX_IMAGE_DIMENSION = 1600;
const IMAGE_QUALITY = 80;
// The most pixels sharp will decode. Its own default is 16384² (~268 M): a
// few-kilobyte file declaring dimensions like that is decoded in full before
// the resize, and can take the function's memory with it. 100 M still clears
// any phone camera — a 48 MP iPhone frame is 8064 x 6048 (~48.8 M) — and a
// larger one is refused like any file sharp cannot read.
const MAX_INPUT_PIXELS = 100_000_000;

// Everything this module writes lives in one of two places, and nothing
// outside them may be deleted — see deleteUpload().
//
// Locally, public/uploads: the dev server serves it, the QA harness knows to
// clear it, a phone on the LAN reaches it. On Vercel the filesystem a function
// sees is read-only and gone with the function, so there the same bytes go to
// a Vercel Blob store and the stored URL is the blob's public address. The
// switch is the token: set (Vercel adds it when the store is connected, or
// .env.local carries it for a local trial) means Blob, absent means disk.
const UPLOAD_URL_PREFIX = "/uploads/";
const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

function blobToken() {
  return process.env.BLOB_READ_WRITE_TOKEN || null;
}

function isBlobUrl(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && hostname.endsWith(BLOB_HOST_SUFFIX);
  } catch {
    return false;
  }
}

function uploadDir() {
  return path.join(process.cwd(), "public/uploads");
}

/**
 * Stores an uploaded image and returns its public URL: a /uploads/ path on
 * disk, or an https:// address on Vercel Blob when a token is configured.
 *
 * Lived in tech/actions.ts until profile pictures needed it from admin/
 * actions.ts too; moved here rather than copied so both callers keep the same
 * resizing and EXIF behaviour. Returns null instead of throwing; callers
 * decide what a missing picture means for the record it belongs to.
 *
 * Only what sharp can decode is stored, and always re-encoded as JPEG. It used
 * to fall back to writing the original bytes under the original name when
 * decoding failed, "rather than losing the evidence" — but bytes sharp cannot
 * read are not evidence of anything, and public/uploads is served by
 * extension: a file called photo.html with a claimed image/* type would have
 * come back as a page (QA 20260913-1742, BUG-012). The one thing the
 * re-encode guarantees is that whatever sits in that folder is a picture.
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
    if (!blobToken()) await fs.mkdir(dir, { recursive: true });

    // The claimed MIME type is the browser's guess from the extension and is
    // not checked here: sharp reads the bytes, and a file it cannot decode is
    // refused whatever it was called.
    const { default: sharp } = await import("sharp");
    const processed = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
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

    const token = blobToken();
    if (token) {
      const { put } = await import("@vercel/blob");
      // No random suffix: the timestamp already makes the name unique, and a
      // predictable key is what lets deleteUpload() and a human find it again.
      const blob = await put(`uploads/${filename}`, processed, {
        access: "public",
        contentType: "image/jpeg",
        addRandomSuffix: false,
        token,
      });
      return blob.url;
    }

    await fs.writeFile(path.join(dir, filename), processed);
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
  if (!url) return;

  // A blob is named by its full URL and deleted by it; the host check is the
  // whole guard, since nothing else this module wrote lives on that host.
  if (isBlobUrl(url)) {
    const token = blobToken();
    if (!token) {
      console.error("Cannot delete old upload: BLOB_READ_WRITE_TOKEN is not set");
      return;
    }
    try {
      const { del } = await import("@vercel/blob");
      await del(url, { token });
    } catch (error) {
      console.error("Failed to delete old upload:", error);
    }
    return;
  }

  if (!url.startsWith(UPLOAD_URL_PREFIX)) return;

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

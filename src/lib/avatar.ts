/**
 * The one rule for what may be uploaded as a profile picture.
 *
 * The limit and the message it produces were written out separately — the
 * size in the server action, the wording in the client check beside it — and
 * registration would have made a third copy. Three copies of a limit is three
 * chances for the client to accept a file the server then refuses, which
 * reads to the user as the upload silently doing nothing.
 *
 * Plain constants and a pure function, so both sides can import it: the
 * client to refuse an obviously wrong file before several megabytes cross the
 * wire, the server because that client check is a courtesy and not a guard.
 */
export const AVATAR_MAX_BYTES = 8 * 1024 * 1024;

/** The reason this file cannot be a profile picture, or null if it can. */
export function avatarRejectionReason(file: File): string | null {
  if (!file.type?.startsWith("image/")) {
    return "รูปโปรไฟล์ต้องเป็นไฟล์รูปภาพเท่านั้น";
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return "รูปโปรไฟล์ต้องมีขนาดไม่เกิน 8 MB";
  }
  return null;
}

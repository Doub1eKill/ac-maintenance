import { promises as fs } from "fs";
import path from "path";

// Serves pictures that lib/upload.ts wrote to public/uploads AFTER the app was
// built. `next start` only serves public/ files that existed at build time, so
// on a production build run locally (the QA harness, since 14 Oct 2026) every
// avatar and unit photo uploaded during the run came back 400 from the image
// optimizer. `next dev` and files present at build time are served from
// public/ before this route is reached.
//
// Only without a Blob token: with one (Vercel), uploads live on Blob and this
// answers 404, so production has no disk path to read through here.
//
// The name is one path segment of the shape saveUpload produces; anything else
// is refused, so there is no way out of the uploads folder.
const NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(jpe?g|png|webp)$/i;
const TYPE: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  if (process.env.BLOB_READ_WRITE_TOKEN) return new Response(null, { status: 404 });

  const { name } = await params;
  if (!NAME.test(name) || name.includes("..")) return new Response(null, { status: 404 });

  try {
    const bytes = await fs.readFile(path.join(process.cwd(), "public", "uploads", name));
    const ext = name.split(".").pop()!.toLowerCase();
    return new Response(new Uint8Array(bytes), {
      headers: { "Content-Type": TYPE[ext], "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}

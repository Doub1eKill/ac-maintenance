import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sessionWithRole } from "@/lib/auth-guards";
import { onlineUserIds, touchPresence } from "@/lib/presence-store";

// The Online/Offline badge's two requests (see src/lib/presence.ts).
//
// POST is the heartbeat every open dashboard sends. auth() runs the jwt
// callback, which re-reads the account, so a suspended or expired session is
// refused here and stops counting as Online on the spot.
//
// GET is the team page asking who is Online, org_admin only. Not cached:
// Route Handlers are dynamic by default, and no-store keeps any proxy honest.
const noStore = { "Cache-Control": "no-store" };

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "active") {
    return new NextResponse(null, { status: 401, headers: noStore });
  }
  await touchPresence(session.user.id);
  return new NextResponse(null, { status: 204, headers: noStore });
}

export async function GET() {
  const session = await sessionWithRole("org_admin");
  if (!session) {
    return new NextResponse(null, { status: 401, headers: noStore });
  }
  try {
    return NextResponse.json({ online: await onlineUserIds() }, { headers: noStore });
  } catch (error) {
    console.error("Failed to read presence:", error);
    return new NextResponse(null, { status: 500, headers: noStore });
  }
}

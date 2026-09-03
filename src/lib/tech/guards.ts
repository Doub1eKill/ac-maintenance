import { auth } from "@/lib/auth";

/**
 * Every technician entry point starts here. Kept beside the technician modules
 * rather than in lib/auth-guards.ts next to verifyOrgAdmin, because that one
 * throws for anyone who is not an org admin and this one for anyone who is not
 * a technician — putting them in one file invites reaching for the wrong guard.
 */
export async function verifyTechnician() {
  const session = await auth();
  if (!session?.user || session.user.role !== "technician") {
    throw new Error("Unauthorized: Technician access required");
  }
  return session;
}

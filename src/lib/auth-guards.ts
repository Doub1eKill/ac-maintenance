// Role guards shared by the admin server action modules.
//
// Not a "use server" file on purpose: exporting this from one would publish it
// as a callable server action, and a guard is not something a client should be
// able to invoke on its own.
import { auth } from "@/lib/auth";

export async function verifyOrgAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "org_admin") {
    throw new Error("Unauthorized: Org Admin access required");
  }
  return session;
}

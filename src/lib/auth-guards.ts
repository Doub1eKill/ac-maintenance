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

/**
 * For the asset catalogue and the units themselves, which technicians maintain
 * alongside admins.
 *
 * A technician who finds a model that is not in the catalogue used to have to
 * leave the job, ask an admin to add it, and come back. These are the writes
 * that unblock that: adding a brand or model, registering a unit, correcting a
 * unit's own record, and setting its cleaning cycle.
 *
 * NOT a looser stand-in for verifyOrgAdmin. Deleting, restoring and purging
 * stay admin-only: adding the wrong thing is undone by adding another one,
 * while deleting the wrong thing reaches every unit bound to it and has to be
 * recovered through the trash. Anything destructive keeps the stricter guard.
 */
export async function verifyAssetEditor() {
  const session = await auth();
  if (!session?.user || !["org_admin", "technician"].includes(session.user.role)) {
    throw new Error("Unauthorized: Org Admin or Technician access required");
  }
  return session;
}

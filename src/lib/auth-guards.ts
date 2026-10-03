// Role guards shared by the admin server action modules.
//
// Not a "use server" file on purpose: exporting this from one would publish it
// as a callable server action, and a guard is not something a client should be
// able to invoke on its own.
import { auth } from "@/lib/auth";
import type { UserRole } from "@/generated/prisma/enums";

/**
 * The signed-in session if its role is one of `roles`, otherwise null. The one
 * place a role is checked: the guards below throw on null for server actions
 * and pages, and the API routes answer 401 on it. (An account that is no
 * longer active never gets this far — auth.ts ends its session.)
 */
export async function sessionWithRole(...roles: UserRole[]) {
  const session = await auth();
  return session?.user && roles.includes(session.user.role) ? session : null;
}

export async function verifyOrgAdmin() {
  const session = await sessionWithRole("org_admin");
  if (!session) {
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
  const session = await sessionWithRole("org_admin", "technician");
  if (!session) {
    throw new Error("Unauthorized: Org Admin or Technician access required");
  }
  return session;
}

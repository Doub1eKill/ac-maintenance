import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Sends a signed-in user to their own dashboard.
 *
 * A technician lands on the unit list rather than on the job pool at /tech.
 * That is where the sidebar starts, and it is the screen a technician standing
 * in front of a machine actually wants — the pool is one click away and carries
 * its own badge when there is something waiting in it.
 */
export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "org_admin") {
    redirect("/admin");
  }
  if (session.user.role === "technician") {
    redirect("/tech/assets");
  }

  redirect("/login");
}

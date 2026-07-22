import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Defense in depth: proxy.ts already gates /admin/* by role, but Server
// Components re-check per the security skill's guidance — Proxy can be
// bypassed by anything calling a Server Function directly, so nothing here
// should assume "I was let in, therefore I'm authorized."
export default async function AdminHomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "org_admin") {
    redirect("/");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
      <p className="mt-2 text-gray-600">
        Signed in as {session.user.name} (org_admin, university #{session.user.universityId})
      </p>
    </main>
  );
}

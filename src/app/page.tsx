import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Mirrors the old Laravel shared /dashboard route: one landing URL for
// every role, branching by role rather than three separate post-login
// destinations to remember.
export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "org_admin") {
    redirect("/admin");
  }
  if (session.user.role === "technician") {
    redirect("/tech");
  }

  // super_admin has no dedicated area yet in this migration (matches the
  // original Laravel decision — see AirConditionerStatsService's history).
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-gray-900">Signed in</h1>
      <p className="mt-2 text-gray-600">
        {session.user.name} ({session.user.role})
      </p>
    </main>
  );
}

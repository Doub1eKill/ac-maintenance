import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function TechHomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "technician") {
    redirect("/");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-gray-900">Technician Dashboard</h1>
      <p className="mt-2 text-gray-600">
        Signed in as {session.user.name} (technician, university #{session.user.universityId})
      </p>
    </main>
  );
}

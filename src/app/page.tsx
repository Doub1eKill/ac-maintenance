import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "super_admin") {
    redirect("/super-admin");
  }
  if (session.user.role === "org_admin") {
    redirect("/admin");
  }
  if (session.user.role === "technician") {
    redirect("/tech");
  }

  redirect("/login");
}

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTechnicianData } from "./actions";
import { TechMobileView } from "@/components/tech/tech-mobile-view";

export const metadata = {
  title: "Technician Workspace | AC Maintenance System",
  description: "พื้นที่ปฏิบัติงานช่างเทคนิคสำหรับรับงาน สแกน QR Code และบันทึกประวัติการซ่อมบำรุง",
};

export default async function TechHomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "technician") {
    redirect("/");
  }

  const { dbError, universityName, jobPool, myJobs, completedJobs, buildings, assetList, assetSummary } =
    await getTechnicianData();

  return (
    <TechMobileView
      user={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      }}
      dbError={dbError}
      universityName={universityName}
      jobPool={jobPool}
      myJobs={myJobs}
      completedJobs={completedJobs}
      buildings={buildings}
      assetList={assetList}
      assetSummary={assetSummary}
    />
  );
}

import { getHistoryPageData } from "@/lib/tech/pages";
import { HistoryClient } from "./history-client";

export const metadata = { title: "ประวัติการทำงาน | AC Maintenance System" };

export default async function TechHistoryPage() {
  const { completedJobs } = await getHistoryPageData();
  return <HistoryClient completedJobs={completedJobs} />;
}

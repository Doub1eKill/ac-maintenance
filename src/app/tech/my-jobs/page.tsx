import { getMyJobsPageData } from "@/lib/tech/pages";
import { MyJobsClient } from "./my-jobs-client";

export const metadata = { title: "งานของฉัน | AC Maintenance System" };

export default async function MyJobsPage() {
  const { myJobs } = await getMyJobsPageData();
  return <MyJobsClient myJobs={myJobs} />;
}

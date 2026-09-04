import { getJobPoolPageData } from "@/lib/tech/pages";
import { JobPoolClient } from "./job-pool-client";

export default async function TechJobPoolPage() {
  const { jobPool } = await getJobPoolPageData();
  return <JobPoolClient jobPool={jobPool} />;
}

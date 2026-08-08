import { DashboardLoading } from "@/components/layout/dashboard-loading";

export default function TechLoading() {
  // The technician workspace leads with the job-type summary, not the wider
  // admin metric row.
  return <DashboardLoading metricCount={3} />;
}

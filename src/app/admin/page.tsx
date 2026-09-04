import { getAdminOverviewData } from "@/lib/admin/pages";
import { OverviewClient } from "./overview-client";

export default async function AdminOverviewPage() {
  const { metrics, weeklyActivity, urgentUnits, buildings, workOrders, activeTechnicians } =
    await getAdminOverviewData();

  return (
    <OverviewClient
      metrics={metrics}
      weeklyActivity={weeklyActivity}
      urgentUnits={urgentUnits}
      buildings={buildings}
      workOrders={workOrders}
      activeTechnicians={activeTechnicians}
    />
  );
}

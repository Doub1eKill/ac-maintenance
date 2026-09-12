import { getAdminOverviewData } from "@/lib/admin/pages";
import { OverviewClient } from "./overview-client";

export default async function AdminOverviewPage() {
  const { metrics, urgentUnits, buildings, workOrders, activeTechnicians } =
    await getAdminOverviewData();

  return (
    <OverviewClient
      metrics={metrics}
      urgentUnits={urgentUnits}
      buildings={buildings}
      workOrders={workOrders}
      activeTechnicians={activeTechnicians}
    />
  );
}

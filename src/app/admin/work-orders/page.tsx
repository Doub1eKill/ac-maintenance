import { getWorkOrdersPageData } from "@/lib/admin/pages";
import { WorkOrdersClient } from "./work-orders-client";

export const metadata = { title: "กระดานใบงาน | AC Maintenance System" };

export default async function WorkOrdersPage() {
  const { workOrders, workOrderPage, activeTechnicians } = await getWorkOrdersPageData();

  return (
    <WorkOrdersClient
      workOrders={workOrders}
      workOrderPage={workOrderPage}
      activeTechnicians={activeTechnicians}
    />
  );
}

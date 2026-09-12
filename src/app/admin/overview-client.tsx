"use client";

import { useRouter } from "next/navigation";
import { OverviewPanel } from "@/components/admin/overview-panel";
import { AssignWorkOrderModal } from "@/components/admin/assign-work-order-modal";
import { useCreateWorkOrder } from "@/components/admin/create-work-order-provider";
import { useWorkOrderAssignment } from "@/components/admin/use-admin-actions";
import type { BuildingItem, PendingUser, WorkOrderItem } from "@/components/admin/types";
import type { UrgentMaintenanceAC } from "@/components/admin/upcoming-maintenance-table";

export function OverviewClient({
  metrics,
  urgentUnits,
  buildings,
  workOrders,
  activeTechnicians,
}: {
  metrics: React.ComponentProps<typeof OverviewPanel>["metrics"];
  urgentUnits: UrgentMaintenanceAC[];
  buildings: BuildingItem[];
  workOrders: WorkOrderItem[];
  activeTechnicians: PendingUser[];
}) {
  const router = useRouter();
  const createWorkOrder = useCreateWorkOrder();
  const assignment = useWorkOrderAssignment();

  return (
    <>
      <OverviewPanel
        metrics={metrics}
        urgentUnits={urgentUnits}
        buildings={buildings}
        workOrders={workOrders}
        // The drill-down used to flip a tab and stuff the code into the shared
        // search box. It is a link to another page now, with the term in the
        // URL, so it survives a refresh and can be shared.
        onViewDetails={(acCode) => router.push(`/admin/assets?q=${encodeURIComponent(acCode)}`)}
        onCreateWorkOrder={createWorkOrder.openForUnit}
        onBulkAssignWorkOrder={assignment.assignMany}
      />

      <AssignWorkOrderModal
        open={assignment.assignTarget !== null}
        count={assignment.assignCount}
        activeTechnicians={activeTechnicians}
        isPending={assignment.isPending}
        onClose={assignment.closeAssign}
        onSubmit={assignment.submitAssign}
      />
    </>
  );
}

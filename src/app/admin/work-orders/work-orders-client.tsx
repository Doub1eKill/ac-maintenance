"use client";

import { WorkOrderBoard } from "@/components/admin/work-order-board";
import { AssignWorkOrderModal } from "@/components/admin/assign-work-order-modal";
import { WorkOrderDetailDialog } from "@/components/admin/work-order-detail-dialog";
import { useDashboardSearch } from "@/components/layout/dashboard-search";
import { useWorkOrderAssignment } from "@/components/admin/use-admin-actions";
import type { BuildingItem, PendingUser, WorkOrderItem, WorkOrderPageInfo } from "@/components/admin/types";

export function WorkOrdersClient({
  workOrders,
  workOrderPage,
  buildings,
  activeTechnicians,
}: {
  workOrders: WorkOrderItem[];
  workOrderPage: WorkOrderPageInfo;
  buildings: BuildingItem[];
  activeTechnicians: PendingUser[];
}) {
  const search = useDashboardSearch();
  const assignment = useWorkOrderAssignment();

  return (
    <>
      <WorkOrderBoard
        workOrders={workOrders}
        workOrderPage={workOrderPage}
        buildings={buildings}
        globalSearch={search}
        onOpenDetails={assignment.openDetail}
        onAssign={assignment.assignOne}
      />

      <AssignWorkOrderModal
        open={assignment.assignTarget !== null}
        count={assignment.assignCount}
        activeTechnicians={activeTechnicians}
        isPending={assignment.isPending}
        onClose={assignment.closeAssign}
        onSubmit={assignment.submitAssign}
      />

      <WorkOrderDetailDialog
        workOrder={assignment.detail}
        isPending={assignment.isPending}
        onClose={assignment.closeDetail}
        onCancelWorkOrder={assignment.cancelWorkOrder}
      />
    </>
  );
}

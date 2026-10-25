"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  updateUserStatusByOrgAdminAction,
  deleteUserByOrgAdminAction,
  assignWorkOrderAction,
  bulkAssignWorkOrdersAction,
  cancelWorkOrderAction,
  recallWorkOrderAction,
} from "@/app/admin/actions";
import type { WorkOrderItem } from "@/components/admin/types";

/**
 * The handlers that more than one admin page needs, so that splitting the
 * dashboard into nine routes did not mean copying them into several of them.
 * They were all methods on admin-dashboard-view.tsx when it was the one
 * component rendering everything.
 */

function releasedNote(count: number) {
  return count > 0 ? ` และคืนงาน ${count} งานเข้ากองกลางแล้ว` : "";
}

/**
 * Approving, suspending and removing an account: the approvals page, the team
 * page and the technician panel.
 */
export function useUserStatus() {
  const [isPending, startTransition] = useTransition();

  function setUserStatus(userId: string, newStatus: "active" | "suspended") {
    startTransition(async () => {
      const res = await updateUserStatusByOrgAdminAction(userId, newStatus);
      if ("error" in res) {
        toast.error(res.error);
      } else {
        toast.success(
          newStatus === "active"
            ? "อนุมัติสิทธิ์เข้าใช้งานสำเร็จ"
            : `ระงับสิทธิ์เข้าใช้งานสำเร็จ${releasedNote(res.releasedCount)}`
        );
      }
    });
  }

  function deleteUser(userId: string) {
    startTransition(async () => {
      const res = await deleteUserByOrgAdminAction(userId);
      if ("error" in res) {
        toast.error(res.error);
      } else {
        toast.success(`ลบผู้ใช้ออกจากระบบแล้ว${releasedNote(res.releasedCount)}`);
      }
    });
  }

  return { isPending, setUserStatus, deleteUser };
}

/**
 * Assigning a job to a technician and cancelling one: the overview's urgent
 * table (which assigns in bulk) and the work order board (one row at a time).
 */
export function useWorkOrderAssignment() {
  const [isPending, startTransition] = useTransition();
  // A single id for the per-row flow, or an array for the bulk toolbar button —
  // submit branches on which one it is holding.
  const [target, setTarget] = useState<string | string[] | null>(null);
  const [detail, setDetail] = useState<WorkOrderItem | null>(null);

  function assignOne(workOrderId: string) {
    setTarget(workOrderId);
  }

  function assignMany(workOrderIds: string[]) {
    if (workOrderIds.length === 0) return;
    setTarget(workOrderIds);
  }

  function close() {
    setTarget(null);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!target) return;
    const assignToUserId = new FormData(e.currentTarget).get("assignToUserId") as string;
    if (!assignToUserId) {
      toast.error("กรุณาเลือกช่างเทคนิค");
      return;
    }

    startTransition(async () => {
      if (Array.isArray(target)) {
        const res = await bulkAssignWorkOrdersAction(target, assignToUserId);
        if (res.error) {
          toast.error(res.error);
          return;
        }
        // "สำเร็จ" alone would hide that some rows were skipped — a ticked
        // unit's job can get claimed by someone else between the tick and the
        // submit, and the admin needs to know that happened.
        const skippedCount = res.skippedCount ?? 0;
        toast.success(
          skippedCount > 0
            ? `มอบหมาย ${res.assignedCount} ใบ · ข้าม ${skippedCount} ใบ (ถูกรับไปแล้ว)`
            : `มอบหมายงานเรียบร้อยแล้ว ${res.assignedCount} ใบ`
        );
      } else {
        const res = await assignWorkOrderAction(target, assignToUserId);
        if (res.error) {
          toast.error(res.error);
          return;
        }
        toast.success("มอบหมายงานเรียบร้อยแล้ว");
      }
      setTarget(null);
    });
  }

  function cancelWorkOrder(workOrderId: string, reason: string) {
    startTransition(async () => {
      const res = await cancelWorkOrderAction(workOrderId, reason);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(
          res.statusReset
            ? "ยกเลิกใบงานสำเร็จ สถานะเครื่องกลับเป็นปกติแล้ว"
            : "ยกเลิกใบงานสำเร็จ"
        );
        setDetail(null);
      }
    });
  }

  function recallWorkOrder(workOrderId: string) {
    startTransition(async () => {
      const res = await recallWorkOrderAction(workOrderId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("เรียกงานคืนแล้ว ใบงานกลับไปรอรับงาน");
        setDetail(null);
      }
    });
  }

  return {
    isPending,
    assignTarget: target,
    assignCount: Array.isArray(target) ? target.length : undefined,
    assignOne,
    assignMany,
    closeAssign: close,
    submitAssign: submit,
    detail,
    openDetail: setDetail,
    closeDetail: () => setDetail(null),
    cancelWorkOrder,
    recallWorkOrder,
  };
}

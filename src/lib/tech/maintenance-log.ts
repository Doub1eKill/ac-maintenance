import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { withDeadlockRetry } from "@/lib/db-retry";
import { saveUpload } from "@/lib/upload";
import { businessDateToday, addMaintenanceInterval } from "@/lib/maintenance";
import { MaintenanceAction } from "@/generated/prisma/client";
import { verifyTechnician } from "@/lib/tech/guards";

// Recording a visit: the longest write in the app, and the one whose lock
// ordering must not be rearranged — see the comments inside.
const logActionSchema = z.object({
  // Optional: a technician who walks up to a unit and fixes it on the spot has
  // no work order to close. One is created for them (see below) so the visit
  // is still attached to a job rather than floating loose.
  workOrderId: z.string().optional(),
  airConditionerId: z.string().min(1),
  actions: z.string().min(1), // JSON stringified array of actions
  notes: z.string().optional(),
  repairDetail: z.string().trim().optional(),
  acStatus: z.enum(["normal", "broken", "needs_cleaning"]),
});

export async function logMaintenanceAction(formData: FormData) {
  const session = await verifyTechnician();
  const techId = BigInt(session.user.id!);

  const raw = {
    workOrderId: formData.get("workOrderId") || undefined,
    airConditionerId: formData.get("airConditionerId"),
    actions: formData.get("actions"),
    notes: formData.get("notes") || undefined,
    repairDetail: formData.get("repairDetail") || undefined,
    acStatus: formData.get("acStatus") || "normal",
  };

  const parsed = logActionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" };
  }

  const { workOrderId, airConditionerId, actions, notes, repairDetail, acStatus } = parsed.data;

  try {
    const acId = BigInt(airConditionerId);

    // Parse actions JSON
    let actionsArray: MaintenanceAction[] = [];
    try {
      actionsArray = JSON.parse(actions);
      if (!Array.isArray(actionsArray) || actionsArray.length === 0) {
        throw new Error("Invalid actions format");
      }
    } catch (e) {
      return { error: "รูปแบบประเภทงานไม่ถูกต้อง" };
    }

    // A repair has to say what was repaired — the whole point of recording it
    // is so the next technician can see what was already done to this unit.
    if (actionsArray.includes("repair") && !repairDetail) {
      return { error: "กรุณาระบุรายละเอียดการซ่อม" };
    }

    // Process File Uploads
    const beforePhotoFile = formData.get("beforePhoto") as File | null;
    const afterPhotoFile = formData.get("afterPhoto") as File | null;

    const beforePhotoUrl = await saveUpload(beforePhotoFile);
    const afterPhotoUrl = await saveUpload(afterPhotoFile);

    const performedAt = new Date();

    const { workOrderId: closedWorkOrderId, wasAutoCreated } = await withDeadlockRetry(
      "logMaintenanceAction",
      () => prisma.$transaction(async (tx) => {
      // The two parent rows this transaction ends up owning — the work order
      // and the unit — are locked exclusively first, before the log rows that
      // reference them are inserted. Insert first and InnoDB takes a shared
      // lock on each parent for the foreign-key check, so the updates below
      // become S->X upgrades; an admin cancelling the same job, or the overdue
      // check touching the same unit, holds the matching lock and neither side
      // can move. Both cases were reproducible deadlocks (error 1213) before
      // this order was imposed. Locking X up front leaves the FK checks to
      // find a lock this transaction already holds.

      // 1. Walk-up work: no job was raised in advance, so one is opened and
      //    closed in the same breath. Every log row points at a work order,
      //    and the admin board shows the visit rather than silently missing
      //    it. Created inside the transaction so a later failure can't leave
      //    a completed job with nothing recorded against it. A row this
      //    transaction just inserted is nobody else's to lock, so the
      //    ordering above has nothing to say about this branch.
      let wId: bigint;
      if (workOrderId) {
        wId = BigInt(workOrderId);

        // Closing the existing job — this is the exclusive lock that has to
        // be taken before the log insert below.
        await tx.workOrder.update({
          where: { id: wId },
          data: { status: "completed", completedAt: performedAt },
        });
      } else {
        const created = await tx.workOrder.create({
          data: {
            airConditionerId: acId,
            status: "completed",
            // The job is opened and closed in the same breath, so what the
            // technician just recorded is the best possible description of what
            // it was for — no inference needed.
            type: actionsArray.includes("repair") ? "repair" : "cleaning",
            priority: "low",
            issueDescription: "ช่างเข้าปฏิบัติงานหน้างานโดยไม่มีใบงานล่วงหน้า (ระบบสร้างอัตโนมัติ)",
            reportedById: techId,
            claimedBy: techId,
            claimedAt: performedAt,
            completedAt: performedAt,
          },
          select: { id: true },
        });
        wId = created.id;
      }

      // 2. Update Air Conditioner status — likewise before the insert.
      await tx.airConditioner.update({
        where: { id: acId },
        data: { status: acStatus as any },
      });

      // 3. Create Multiple Maintenance Logs (one for each action checked)
      await tx.maintenanceLog.createMany({
        data: actionsArray.map((action) => ({
          airConditionerId: acId,
          workOrderId: wId,
          userId: techId,
          action: action as MaintenanceAction,
          notes,
          // Only the repair row carries it; a cleaning row in the same visit
          // has nothing to say about what was fixed.
          repairDetail: action === "repair" ? repairDetail : null,
          beforePhotoUrl,
          afterPhotoUrl,
          performedAt,
        })),
      });

      // 4. Roll the maintenance schedule forward so the calendar reflects
      // the work that was just done, instead of staying stuck on the old
      // due date until an admin edits it by hand.
      const schedule = await tx.maintenanceSchedule.findFirst({
        where: { airConditionerId: acId, isActive: true },
      });

      if (schedule) {
        // Both columns are @db.Date (a calendar day), so they're derived from
        // today's date in the operating timezone rather than from performedAt,
        // which is a UTC instant: a job closed after midnight local time would
        // otherwise be filed under yesterday and re-scheduled a day early.
        const performedOn = businessDateToday();
        const nextDueDate = addMaintenanceInterval(
          performedOn,
          schedule.frequencyValue,
          schedule.frequencyUnit
        );

        await tx.maintenanceSchedule.update({
          where: { id: schedule.id },
          data: { lastPerformedAt: performedOn, nextDueDate },
        });
      }

      return { workOrderId: wId, wasAutoCreated: !workOrderId };
      })
    );

    await logAudit({
      userId: techId,
      action: "COMPLETE_WORKORDER",
      entityType: "workOrder",
      entityId: closedWorkOrderId,
      newValues: {
        status: "completed",
        actions: actionsArray,
        acStatus,
        // Distinguishes a job the technician was assigned from one the system
        // opened for them on the spot, which is otherwise invisible later.
        autoCreatedWorkOrder: wasAutoCreated,
      },
      ipAddress: "server_action",
    });

    revalidatePath("/tech", "layout");
    revalidatePath("/admin", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to log maintenance action:", error);
    return { error: "ไม่สามารถบันทึกประวัติการซ่อมได้" };
  }
}

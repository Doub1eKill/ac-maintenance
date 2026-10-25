"use client";

import { useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  ClipboardList,
  ImageOff,
  Images,
  MapPin,
  Snowflake,
  Undo2,
  UserCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import type { WorkOrderItem } from "@/components/admin/types";
import { CatalogueMark } from "@/components/shared/catalogue-mark";
import { UnitPhoto } from "@/components/shared/unit-photo";
import { EvidencePhotos } from "@/components/shared/evidence-photos";
import {
  WorkOrderPriorityBadge,
  WorkOrderStatusBadge,
  WorkOrderTypeBadge,
} from "@/components/shared/work-order-badges";

interface WorkOrderDetailDialogProps {
  workOrder: WorkOrderItem | null;
  isPending?: boolean;
  onClose: () => void;
  onCancelWorkOrder?: (workOrderId: string, reason: string) => void;
  /** Takes a claimed job back from its technician into the pool. */
  onRecallWorkOrder?: (workOrderId: string) => void;
}

function normalizeWorkOrderImages(images: unknown): string[] {
  if (Array.isArray(images)) return images;
  if (typeof images === "string" && images.trim()) {
    if (images.trim().startsWith("[")) {
      try {
        const parsed = JSON.parse(images);
        return Array.isArray(parsed) ? parsed : [images];
      } catch {
        return [images];
      }
    }
    return [images];
  }
  return [];
}

// "19 ก.ค. 2569 23:26" — date and time on one line, the way the timeline
// reads them. Client-side, so the browser's own zone is the right one.
function formatThaiDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * One step of the order's history. The dot takes the colour of the step it
 * marks; the line between dots is drawn by the list.
 */
function TimelineStep({
  tone,
  title,
  when,
  who,
  last = false,
}: {
  tone: "muted" | "primary" | "success";
  title: string;
  when: string;
  who?: string | null;
  last?: boolean;
}) {
  const dot =
    tone === "success" ? "bg-success" : tone === "primary" ? "bg-primary" : "bg-muted-foreground";
  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      {!last && <span aria-hidden className="absolute left-[7px] top-4 bottom-0 w-px bg-border" />}
      <span className={`relative mt-1 h-[15px] w-[15px] shrink-0 rounded-full ring-4 ring-card ${dot}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <span className="text-sm font-bold text-foreground">{title}</span>
          <span className="text-xs tabular-nums text-muted-foreground">{when}</span>
        </div>
        {who && (
          <div className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            <UserCheck className="h-3 w-3" />
            {who}
          </div>
        )}
      </div>
    </li>
  );
}

export function WorkOrderDetailDialog({ workOrder, isPending, onClose, onCancelWorkOrder, onRecallWorkOrder }: WorkOrderDetailDialogProps) {
  const [brokenEvidenceImages, setBrokenEvidenceImages] = useState<Record<string, boolean>>({});
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showRecallConfirm, setShowRecallConfirm] = useState(false);

  // Per-order scratch state is dropped the moment a different order (or
  // none) is shown, in the same render, rather than a frame later.
  const [shownId, setShownId] = useState(workOrder?.id ?? null);
  if (shownId !== (workOrder?.id ?? null)) {
    setShownId(workOrder?.id ?? null);
    setBrokenEvidenceImages({});
    setShowCancelForm(false);
    setCancelReason("");
    setShowRecallConfirm(false);
  }

  const canCancel = !!workOrder && (workOrder.status === "pending" || workOrder.status === "claimed");
  const canRecall = !!workOrder && workOrder.status === "claimed";
  const evidenceImages = workOrder ? normalizeWorkOrderImages(workOrder.images) : [];
  // What the technician photographed when closing the order.
  const logPhotos = workOrder?.logPhotos ?? null;
  const hasLogPhotos = Boolean(logPhotos?.before || logPhotos?.after);

  return (
    <Dialog open={!!workOrder} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto p-0 border-0 rounded-2xl">
        {workOrder && (
          <div className="flex flex-col bg-muted">
            {/* Header: what this is and where it stands. */}
            <div className="bg-card px-6 py-5 border-b border-border sticky top-0 z-10">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <ClipboardList className="h-6 w-6 shrink-0 text-primary" />
                    <span className="min-w-0 break-all">ใบงานซ่อมบำรุง <span className="font-mono">{workOrder.acCode}</span></span>
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">
                    รายละเอียดการแจ้งซ่อมและประวัติการทำงาน (Audit Trail)
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <WorkOrderTypeBadge type={workOrder.type} size="lg" />
                  <WorkOrderPriorityBadge priority={workOrder.priority} size="lg" />
                  <WorkOrderStatusBadge status={workOrder.status} size="lg" />
                </div>
              </div>

              {/* The unit, in one line under the title rather than a card of
                  key/value pairs: three facts an admin reads once, and the
                  right-aligned values used to wrap the code mid-way. */}
              <dl className="mt-4 flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
                <UnitPhoto src={workOrder.photoUrl} acCode={workOrder.acCode} size="sm" />
                <div className="inline-flex items-center gap-1.5">
                  <dt className="sr-only">ยี่ห้อ</dt>
                  <Snowflake className="h-4 w-4 text-primary" aria-hidden />
                  <dd className="font-medium text-foreground">
                    {workOrder.brand} {workOrder.btu ? `(${workOrder.btu} BTU)` : ""}
                    <CatalogueMark
                      brandDeleted={workOrder.brandDeleted}
                      modelDeleted={workOrder.modelDeleted}
                      className="ml-1"
                    />
                  </dd>
                </div>
                <div className="flex min-w-0 max-w-full items-start gap-1.5">
                  <dt className="sr-only">สถานที่</dt>
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <dd className="min-w-0 break-words text-foreground">{workOrder.location}</dd>
                </div>
              </dl>
            </div>

            {/* Body: the history takes the wide column — it is the part that
                always has something in it. The report's own text and photos,
                empty on most orders, sit beside it and stay small when empty. */}
            <div className="grid grid-cols-1 gap-4 p-4 sm:p-6 md:grid-cols-5">
              <section className="md:col-span-3 rounded-xl border border-border bg-card p-5">
                <h3 className="mb-5 flex items-center gap-2 text-sm font-bold text-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  ประวัติการดำเนินการ
                </h3>
                <ol>
                  <TimelineStep
                    tone="muted"
                    title="แจ้งเรื่อง"
                    when={formatThaiDateTime(workOrder.createdAt)}
                    who={workOrder.reportedByName}
                    last={!workOrder.assignedToName && !workOrder.claimedAt && !workOrder.completedAt}
                  />
                  {workOrder.assignedToName && (
                    <TimelineStep
                      tone="primary"
                      title="มอบหมายงาน"
                      when={formatThaiDateTime(workOrder.assignedAt)}
                      who={`ให้ช่าง ${workOrder.assignedToName}`}
                      last={!workOrder.claimedAt && !workOrder.completedAt}
                    />
                  )}
                  {workOrder.claimedAt && (
                    <TimelineStep
                      tone="primary"
                      title={workOrder.type === "repair" ? "เริ่มดำเนินการซ่อม" : "เริ่มดำเนินการล้าง"}
                      when={formatThaiDateTime(workOrder.claimedAt)}
                      who={`ดำเนินการโดย ${workOrder.claimedByName || workOrder.assignedToName || "-"}`}
                      last={!workOrder.completedAt}
                    />
                  )}
                  {workOrder.completedAt && (
                    <TimelineStep
                      tone="success"
                      title="เสร็จสิ้นสมบูรณ์"
                      when={formatThaiDateTime(workOrder.completedAt)}
                      last
                    />
                  )}
                </ol>

                {workOrder.status === "completed" && (
                  <div className="mt-5 rounded-lg border border-success/20 bg-success/10 p-4">
                    <div className="mb-1 flex items-center gap-2 text-xs font-bold text-success-foreground">
                      <CheckCircle2 className="h-4 w-4" />
                      บันทึกการซ่อม
                    </div>
                    <p className="text-sm leading-relaxed text-success-foreground">
                      {workOrder.resolutionNotes || "ไม่มีการระบุบันทึกการซ่อม"}
                    </p>
                  </div>
                )}
              </section>

              <aside className="md:col-span-2 divide-y divide-border rounded-xl border border-border bg-card">
                <section className="p-5">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    รายละเอียดปัญหา
                  </h3>
                  {workOrder.issueDescription ? (
                    <p className="text-sm leading-relaxed text-foreground">{workOrder.issueDescription}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">ไม่มีการระบุรายละเอียด</p>
                  )}
                </section>

                <section className="p-5">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
                    <Images className="h-4 w-4 text-muted-foreground" />
                    รูปภาพประกอบ
                    {evidenceImages.length > 0 && (
                      <span className="text-xs font-medium text-muted-foreground">({evidenceImages.length})</span>
                    )}
                  </h3>
                  {/* The closing log's before/after first: for a finished
                      order that is the evidence an admin opens this for. */}
                  {hasLogPhotos && (
                    <div className={evidenceImages.length > 0 ? "mb-3" : ""}>
                      <EvidencePhotos before={logPhotos?.before} after={logPhotos?.after} size="md" />
                    </div>
                  )}
                  {evidenceImages.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {evidenceImages.map((img) => (
                        <div key={img} className="relative aspect-square overflow-hidden rounded-lg border border-border bg-secondary">
                          {brokenEvidenceImages[img] ? (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-1 text-center text-muted-foreground">
                              <ImageOff className="h-4 w-4" />
                              <span className="text-[10px] leading-tight">โหลดรูปไม่สำเร็จ</span>
                            </div>
                          ) : (
                            <Image
                              src={img}
                              alt="รูปประกอบใบงาน"
                              fill
                              sizes="120px"
                              className="object-cover"
                              onError={() => setBrokenEvidenceImages((prev) => ({ ...prev, [img]: true }))}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : hasLogPhotos ? null : (
                    <p className="text-sm text-muted-foreground">ไม่มีรูปภาพประกอบ</p>
                  )}
                </section>
              </aside>
            </div>

            {/* Footer: the one destructive action, away from the information
                and confirmed in place. Only while the order is still open. */}
            {/* Taking a job back from its technician, short of cancelling it:
                the work still needs doing, by someone else or later. */}
            {canRecall && onRecallWorkOrder && (
              <div className="border-t border-border bg-card px-6 py-4">
                {!showRecallConfirm ? (
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs text-muted-foreground">
                      ช่าง {workOrder.claimedByName || "-"} ถืองานนี้อยู่ เรียกคืนให้กลับไปรอรับงานได้ — ใบงานยังอยู่ ไม่ถูกยกเลิก
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowRecallConfirm(true)}
                      className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground hover:bg-secondary transition-colors"
                    >
                      <Undo2 className="h-3.5 w-3.5" /> เรียกงานคืน
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-sm font-bold text-foreground">
                      เรียกงาน {workOrder.acCode} คืนจากช่าง {workOrder.claimedByName || "-"}?
                    </p>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowRecallConfirm(false)}
                        disabled={isPending}
                        className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-foreground hover:bg-secondary disabled:opacity-50"
                      >
                        ไม่เรียกคืน
                      </button>
                      <button
                        type="button"
                        onClick={() => onRecallWorkOrder(workOrder.id)}
                        disabled={isPending}
                        className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {isPending ? "กำลังเรียกคืน..." : "ยืนยันเรียกคืน"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {canCancel && onCancelWorkOrder && (
              <div className="border-t border-border bg-card px-6 py-4">
                {!showCancelForm ? (
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs text-muted-foreground">
                      แจ้งผิดเครื่องหรือแจ้งซ้ำ ยกเลิกใบงานนี้ได้ — เครื่องยังคงสถานะเดิม
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowCancelForm(true)}
                      className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors"
                    >
                      <Ban className="h-3.5 w-3.5" /> ยกเลิกใบงาน
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <Ban className="h-4 w-4 text-red-600" />
                      ยืนยันการยกเลิกใบงาน {workOrder.acCode}
                    </h3>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      rows={2}
                      placeholder="เหตุผล (ไม่บังคับ)"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => { setShowCancelForm(false); setCancelReason(""); }}
                        disabled={isPending}
                        className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-foreground hover:bg-secondary disabled:opacity-50"
                      >
                        ไม่ยกเลิก
                      </button>
                      <button
                        type="button"
                        onClick={() => onCancelWorkOrder(workOrder.id, cancelReason)}
                        disabled={isPending}
                        className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {isPending ? "กำลังยกเลิก..." : "ยืนยันยกเลิก"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

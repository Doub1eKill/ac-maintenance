"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  ClipboardList,
  ImageOff,
  MessageSquare,
  Snowflake,
  UserCheck,
  Wrench,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import type { WorkOrderItem } from "@/components/admin/types";

interface WorkOrderDetailDialogProps {
  workOrder: WorkOrderItem | null;
  isPending?: boolean;
  onClose: () => void;
  onCancelWorkOrder?: (workOrderId: string, reason: string) => void;
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

export function WorkOrderDetailDialog({ workOrder, isPending, onClose, onCancelWorkOrder }: WorkOrderDetailDialogProps) {
  const [brokenEvidenceImages, setBrokenEvidenceImages] = useState<Record<string, boolean>>({});
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    setBrokenEvidenceImages({});
    setShowCancelForm(false);
    setCancelReason("");
  }, [workOrder?.id]);

  const canCancel = workOrder && (workOrder.status === "pending" || workOrder.status === "claimed");

  return (
    <Dialog open={!!workOrder} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto p-0 border-0 rounded-2xl">
        {workOrder && (
          <div className="flex flex-col h-full bg-muted">
            {/* Header */}
            <div className="bg-card px-6 py-5 border-b border-border sticky top-0 z-10">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <ClipboardList className="h-6 w-6 text-primary" />
                    ใบงานซ่อมบำรุง {workOrder.acCode}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">
                    รายละเอียดการแจ้งซ่อมและประวัติการทำงาน (Audit Trail)
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {workOrder.priority === 'critical' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                      <AlertTriangle className="h-3.5 w-3.5" /> ด่วนที่สุด (Critical)
                    </span>
                  )}
                  {workOrder.priority === 'high' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
                      <AlertTriangle className="h-3.5 w-3.5" /> ด่วน (High)
                    </span>
                  )}
                  {workOrder.status === "pending" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-warning/20 text-warning-foreground border border-warning/30">
                      <Clock className="h-3.5 w-3.5" /> รอดำเนินการ
                    </span>
                  )}
                  {workOrder.status === "claimed" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/20 text-primary border border-primary/30">
                      <Wrench className="h-3.5 w-3.5" /> กำลังดำเนินการ
                    </span>
                  )}
                  {workOrder.status === "completed" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-success/20 text-success-foreground border border-success/30">
                      <CheckCircle2 className="h-3.5 w-3.5" /> เสร็จสิ้น
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Left Column: Asset & Issue Details */}
              <div className="md:col-span-2 space-y-6">
                {/* Issue Section */}
                <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    รายละเอียดปัญหา (Issue Description)
                  </h3>
                  <div className="bg-muted p-4 rounded-lg border border-border text-sm text-foreground leading-relaxed min-h-[80px]">
                    {workOrder.issueDescription || "ไม่มีการระบุรายละเอียด"}
                  </div>
                </div>

                {/* Resolution Section (If completed) */}
                {workOrder.status === "completed" && (
                  <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      บันทึกการซ่อม (Resolution Notes)
                    </h3>
                    <div className="bg-success/10 p-4 rounded-lg border border-success/20 text-sm text-success-foreground leading-relaxed min-h-[80px]">
                      {workOrder.resolutionNotes || "ไม่มีการระบุบันทึกการซ่อม"}
                    </div>
                  </div>
                )}

                {/* Media / Images Section */}
                <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    รูปภาพประกอบ (Media/Evidence)
                  </h3>
                  {(() => {
                    const evidenceImages = normalizeWorkOrderImages(workOrder.images);
                    return evidenceImages.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {evidenceImages.map((img, idx) => (
                          <div key={idx} className="aspect-square rounded-lg border border-border overflow-hidden bg-secondary relative group cursor-pointer">
                            {brokenEvidenceImages[img] ? (
                              <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-muted-foreground px-2 text-center">
                                <ImageOff className="h-5 w-5" />
                                <span className="text-[11px] leading-tight">โหลดรูปไม่สำเร็จ</span>
                              </div>
                            ) : (
                              <Image
                                src={img}
                                alt="Work Order Evidence"
                                fill
                                sizes="(max-width: 640px) 50vw, 33vw"
                                className="object-cover transition-transform group-hover:scale-105"
                                onError={() => setBrokenEvidenceImages((prev) => ({ ...prev, [img]: true }))}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-sm text-muted-foreground bg-muted rounded-lg border border-dashed border-border">
                        ไม่มีรูปภาพประกอบ
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Right Column: Audit Trail */}
              <div className="space-y-6">

                {/* Cancel Work Order */}
                {canCancel && onCancelWorkOrder && (
                  <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                    {!showCancelForm ? (
                      <button
                        type="button"
                        onClick={() => setShowCancelForm(true)}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors"
                      >
                        <Ban className="h-3.5 w-3.5" /> ยกเลิกใบงาน
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <Ban className="h-4 w-4 text-red-600" />
                          ยืนยันการยกเลิกใบงาน
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          ใช้สำหรับกรณีแจ้งซ่อมผิดเครื่องหรือแจ้งซ้ำ — สถานะเครื่องจะกลับเป็นปกติอัตโนมัติถ้าไม่มีใบงานอื่นค้างอยู่
                        </p>
                        <textarea
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          rows={2}
                          placeholder="เหตุผล (ไม่บังคับ)"
                          className="w-full rounded-lg border border-border px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => { setShowCancelForm(false); setCancelReason(""); }}
                            disabled={isPending}
                            className="flex-1 rounded-lg border border-border py-2 text-xs font-bold text-foreground hover:bg-secondary disabled:opacity-50"
                          >
                            ไม่ยกเลิก
                          </button>
                          <button
                            type="button"
                            onClick={() => onCancelWorkOrder(workOrder.id, cancelReason)}
                            disabled={isPending}
                            className="flex-1 rounded-lg bg-red-600 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            {isPending ? "กำลังยกเลิก..." : "ยืนยันยกเลิก"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Asset Info */}
                <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4 pb-3 border-b border-border">
                    <Snowflake className="h-4 w-4 text-primary" />
                    ข้อมูลเครื่องปรับอากาศ
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">รหัสครุภัณฑ์:</span>
                      <span className="font-mono font-bold text-foreground">{workOrder.acCode}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">ยี่ห้อ:</span>
                      <span className="font-medium text-foreground">
                        {workOrder.brand} {workOrder.btu ? `(${workOrder.btu} BTU)` : ""}
                      </span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-muted-foreground">สถานที่:</span>
                      <span className="font-medium text-foreground text-right break-words">{workOrder.location}</span>
                    </div>
                  </div>
                </div>

                {/* Audit Trail Timeline */}
                <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-5 pb-3 border-b border-border">
                    <Clock className="h-4 w-4 text-primary" />
                    ประวัติการดำเนินการ (Audit Trail)
                  </h3>

                  <div className="relative pl-6 space-y-6 before:absolute before:inset-y-2 before:left-[11px] before:w-[2px] before:bg-border">

                    {/* Created */}
                    <div className="relative">
                      <div className="absolute -left-[30px] p-1 bg-card rounded-full">
                        <div className="w-2.5 h-2.5 bg-muted-foreground rounded-full ring-4 ring-slate-50" />
                      </div>
                      <div className="text-xs font-bold text-foreground">แจ้งเรื่อง</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {workOrder.createdAt ? new Date(workOrder.createdAt).toLocaleString("th-TH") : "-"}
                      </div>
                      {workOrder.reportedByName && (
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                          <UserCheck className="w-3 h-3 text-muted-foreground" /> {workOrder.reportedByName}
                        </div>
                      )}
                    </div>

                    {/* Assigned */}
                    {workOrder.assignedToName && (
                      <div className="relative">
                        <div className="absolute -left-[30px] p-1 bg-card rounded-full">
                          <div className="w-2.5 h-2.5 bg-primary rounded-full ring-4 ring-primary/10" />
                        </div>
                        <div className="text-xs font-bold text-foreground">มอบหมายงาน</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {workOrder.assignedAt ? new Date(workOrder.assignedAt).toLocaleString("th-TH") : "-"}
                        </div>
                        <div className="text-xs text-primary bg-primary/10 px-2 py-1 rounded inline-flex items-center gap-1.5 mt-1.5">
                          <Wrench className="w-3 h-3" /> ให้ช่าง {workOrder.assignedToName}
                        </div>
                      </div>
                    )}

                    {/* Claimed/Started */}
                    {workOrder.claimedAt && (
                      <div className="relative">
                        <div className="absolute -left-[30px] p-1 bg-card rounded-full">
                          <div className="w-2.5 h-2.5 bg-primary rounded-full ring-4 ring-sky-50" />
                        </div>
                        <div className="text-xs font-bold text-foreground">เริ่มดำเนินการซ่อม</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(workOrder.claimedAt).toLocaleString("th-TH")}
                        </div>
                        <div className="text-xs text-primary bg-primary/10 px-2 py-1 rounded inline-flex items-center gap-1.5 mt-1.5">
                          <Wrench className="w-3 h-3" /> ดำเนินการโดย {workOrder.claimedByName || workOrder.assignedToName}
                        </div>
                      </div>
                    )}

                    {/* Completed */}
                    {workOrder.completedAt && (
                      <div className="relative">
                        <div className="absolute -left-[30px] p-1 bg-card rounded-full">
                          <div className="w-2.5 h-2.5 bg-success rounded-full ring-4 ring-success/10" />
                        </div>
                        <div className="text-xs font-bold text-success-foreground">เสร็จสิ้นสมบูรณ์</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(workOrder.completedAt).toLocaleString("th-TH")}
                        </div>
                      </div>
                    )}

                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { getHeldWorkOrders } from "@/app/admin/actions";
import type { HeldWorkOrder } from "@/lib/admin/users";
import { WORK_ORDER_TYPE_LABEL } from "@/lib/labels";

// The two account dialogs the team page and the technician panel share, so the
// warning about held jobs and the wording of removal read the same in both.

interface Target {
  id: string;
  name: string;
}

/** How many held jobs to list by name before summarising the rest. */
const LISTED_JOBS = 5;

type HeldCheck = { forId: string; jobs: HeldWorkOrder[] | null; error?: string };

/**
 * Confirms a suspension. Opens by asking which jobs the person is holding:
 * none, and it is the plain confirmation it always was; some, and it lists
 * them and the button becomes "คืนงานและระงับสิทธิ์", because suspending hands
 * them back to the pool (updateUserStatusByOrgAdminAction does that whether or
 * not this check got an answer).
 */
export function SuspendUserDialog({
  target,
  onOpenChange,
  onConfirm,
  isProcessing = false,
}: {
  target: Target | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isProcessing?: boolean;
}) {
  const [check, setCheck] = useState<HeldCheck | null>(null);
  const targetId = target?.id ?? null;

  useEffect(() => {
    if (!targetId) return;
    let cancelled = false;
    getHeldWorkOrders(targetId)
      .then((res) => {
        if (cancelled) return;
        setCheck("error" in res ? { forId: targetId, jobs: null, error: res.error } : { forId: targetId, jobs: res.workOrders });
      })
      .catch(() => {
        if (!cancelled) setCheck({ forId: targetId, jobs: null, error: "ไม่สามารถตรวจสอบงานที่ค้างอยู่ได้" });
      });
    return () => {
      cancelled = true;
    };
  }, [targetId]);

  // Anything recorded for a different person is stale.
  const current = check && check.forId === targetId ? check : null;
  const loading = !!target && !current;
  const jobs = current?.jobs ?? [];
  const holding = jobs.length > 0;

  return (
    <AlertDialog open={!!target} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {holding && <AlertTriangle className="h-5 w-5 text-warning-foreground" />}
            {holding ? "ช่างคนนี้มีงานค้างอยู่" : "ยืนยันการระงับสิทธิ์"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {holding
              ? `${target?.name} กำลังถืองานที่ยังไม่เสร็จ ${jobs.length} งาน หากระงับสิทธิ์ งานเหล่านี้จะถูกคืนเข้ากองกลางเพื่อให้ช่างคนอื่นรับต่อ`
              : `ต้องการระงับสิทธิ์เข้าใช้งานของ ${target?.name ?? ""} หรือไม่? ผู้ใช้จะไม่สามารถเข้าสู่ระบบได้จนกว่าจะเปิดใช้งานอีกครั้ง`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {loading && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            กำลังตรวจสอบงานที่ค้างอยู่
          </p>
        )}

        {current?.error && (
          <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
            {current.error} — หากมีงานค้าง ระบบจะคืนเข้ากองกลางให้อัตโนมัติเมื่อระงับสิทธิ์
          </p>
        )}

        {holding && (
          <ul className="space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-xs">
            {jobs.slice(0, LISTED_JOBS).map((job) => (
              <li key={job.id} className="min-w-0">
                <p className="flex items-center gap-2">
                  <span className="whitespace-nowrap font-bold text-foreground">{job.acCode}</span>
                  <span className="whitespace-nowrap rounded border border-border bg-background px-1.5 text-[10px] text-muted-foreground">
                    {WORK_ORDER_TYPE_LABEL[job.type]}
                  </span>
                </p>
                <p className="truncate text-muted-foreground">{job.location}</p>
              </li>
            ))}
            {jobs.length > LISTED_JOBS && (
              <li className="text-muted-foreground">และอีก {jobs.length - LISTED_JOBS} งาน</li>
            )}
          </ul>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>ยกเลิก</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isProcessing || loading}
          >
            {isProcessing ? "กำลังดำเนินการ..." : holding ? "คืนงานและระงับสิทธิ์" : "ระงับสิทธิ์"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Confirms removing a suspended account (deleteUserByOrgAdminAction). Spells
 * out what goes and what stays, since it cannot be undone.
 */
export function DeleteUserDialog({
  target,
  onOpenChange,
  onConfirm,
  isProcessing = false,
}: {
  target: Target | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isProcessing?: boolean;
}) {
  return (
    <AlertDialog open={!!target} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            ลบ {target?.name} ออกจากระบบ
          </AlertDialogTitle>
          <AlertDialogDescription>
            บัญชีนี้จะเข้าสู่ระบบไม่ได้อีก และการ์ดจะหายไปจากหน้าเจ้าหน้าที่ การลบนี้ย้อนกลับไม่ได้
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-2 text-xs sm:grid-cols-2">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="mb-1 font-bold text-destructive">สิ่งที่ถูกลบ</p>
            <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
              <li>รหัสผ่านและสิทธิ์เข้าสู่ระบบ</li>
              <li>อีเมลที่ใช้เข้าสู่ระบบ (สมัครใหม่ด้วยอีเมลเดิมได้)</li>
              <li>เบอร์โทรศัพท์</li>
            </ul>
          </div>
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="mb-1 font-bold text-foreground">สิ่งที่เก็บไว้</p>
            <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
              <li>ชื่อและรูปโปรไฟล์</li>
              <li>ประวัติการซ่อมและใบงานที่เคยทำ</li>
            </ul>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>ยกเลิก</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isProcessing}
          >
            {isProcessing ? "กำลังลบ..." : "ลบออกจากระบบ"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

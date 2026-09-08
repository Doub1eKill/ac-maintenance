"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Building2, KeyRound, ShieldOff, ShieldCheck, Users, Wrench } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ConfirmActionDialog } from "@/components/ui/thai-alert-dialogs";
import { adminResetUserPasswordAction } from "@/app/admin/actions";
import type { PendingUser } from "@/components/admin/types";

interface TeamPanelProps {
  allUsers: PendingUser[];
  globalSearch: string;
  isPending: boolean;
  onUserStatus: (userId: string, status: "active" | "suspended") => void;
  currentUserId?: string | null;
  /** Opens the detail panel for one person. */
  onOpenDetail?: (user: PendingUser) => void;
}

// Divides by three, so the last row of the grid is never a single stranded
// card the way ten items were.
const ITEMS_PER_PAGE = 9;

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "US";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const STATUS_LABELS: Record<string, string> = {
  active: "ใช้งานอยู่",
  pending: "รออนุมัติ",
  suspended: "ถูกระงับ",
};

function statusClasses(status: string) {
  if (status === "active") return "bg-success/20 text-success-foreground border-success/30";
  if (status === "pending") return "bg-warning/20 text-warning-foreground border-warning/30";
  return "bg-destructive/10 text-destructive border-destructive/30";
}

export function TeamPanel({
  allUsers,
  globalSearch,
  isPending,
  onUserStatus,
  currentUserId,
  onOpenDetail,
}: TeamPanelProps) {
  const [teamPage, setTeamPage] = useState(1);
  const [resetTarget, setResetTarget] = useState<PendingUser | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<PendingUser | null>(null);
  const [isResetting, startResetTransition] = useTransition();

  function handleConfirmSuspend() {
    if (!suspendTarget) return;
    onUserStatus(suspendTarget.id, "suspended");
    setSuspendTarget(null);
  }

  function handleConfirmReset() {
    if (!resetTarget) return;
    const targetId = resetTarget.id;
    startResetTransition(async () => {
      const res = await adminResetUserPasswordAction(targetId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("รีเซ็ตรหัสผ่านสำเร็จ ผู้ใช้ต้องตั้งรหัสผ่านใหม่ก่อนเข้าใช้งานครั้งถัดไป");
      setResetTarget(null);
    });
  }

  useEffect(() => {
    setTeamPage(1);
  }, [globalSearch]);

  const filteredAllUsers = allUsers
    .filter(
      (u) =>
        u.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(globalSearch.toLowerCase())
    )
    // Sorted by name rather than by when the account was made. A grid gives no
    // column to scan, so the only way to guess where someone is is alphabetical
    // — and "newest first" put the same person in a different place each week.
    .sort((a, b) => a.name.localeCompare(b.name, "th"));

  const totalTeamPages = Math.ceil(filteredAllUsers.length / ITEMS_PER_PAGE);
  const paginatedTeam = filteredAllUsers.slice(
    (teamPage - 1) * ITEMS_PER_PAGE,
    teamPage * ITEMS_PER_PAGE
  );

  return (
    <div className="biz-card animate-in space-y-5 p-6 fade-in">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
          <Users className="h-5 w-5 text-foreground" />
          <span>ทำเนียบเจ้าหน้าที่และช่างซ่อมบำรุง ({allUsers.length})</span>
        </h2>
      </div>

      {paginatedTeam.length === 0 && (
        <p className="py-12 text-center text-xs text-muted-foreground">
          ไม่พบผู้ใช้งานที่ตรงกับคำค้นนี้
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {paginatedTeam.map((u) => {
          const isSelf = u.id === currentUserId;
          const RoleIcon = u.role === "technician" ? Wrench : Building2;

          return (
            <div
              key={u.id}
              role={onOpenDetail ? "button" : undefined}
              tabIndex={onOpenDetail ? 0 : undefined}
              onClick={() => onOpenDetail?.(u)}
              onKeyDown={(event) => {
                if (!onOpenDetail) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpenDetail(u);
                }
              }}
              className={`overflow-hidden rounded-2xl border bg-card text-left transition-colors ${
                u.status === "pending" ? "border-warning/40" : "border-border"
              } ${onOpenDetail ? "cursor-pointer hover:border-muted-foreground" : ""}`}
            >
              {/* 4:3 rather than the portrait the sketch showed: it still leads
                  with the photo, but three rows fit on a screen instead of two,
                  which matters once there are forty of these. */}
              <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-primary text-primary-foreground">
                {u.avatarUrl ? (
                  <Image
                    src={u.avatarUrl}
                    // The name is directly below, so describing the picture
                    // would only make a screen reader say it twice.
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    className="object-cover"
                  />
                ) : (
                  <>
                    {/* Every seeded account has no picture, and registration
                        only started requiring one recently — so the fallback is
                        the common case here, not the exception, and is worth
                        looking deliberate rather than empty. */}
                    <RoleIcon className="absolute h-24 w-24 opacity-10" />
                    <span className="relative text-3xl font-bold">{initialsOf(u.name)}</span>
                  </>
                )}
              </div>

              <div className="space-y-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{u.name}</p>
                  {/* The login identity, and what the header search matches on —
                      without it a search that hits nothing visible looks broken. */}
                  <p className="truncate font-mono text-[11px] text-muted-foreground">{u.email}</p>
                </div>

                <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-foreground">
                    <RoleIcon className="h-3 w-3" />
                    {u.role === "technician" ? "ช่างเทคนิค" : "ผู้ดูแลระบบ"}
                  </span>
                  <span className={`rounded-md border px-2 py-0.5 ${statusClasses(u.status)}`}>
                    {STATUS_LABELS[u.status] ?? u.status}
                  </span>
                </div>

                {/* Every button stops the click here. The card itself opens the
                    detail panel, and without this, suspending someone would pop
                    that panel open behind the confirmation dialog. */}
                <div className="flex gap-2">
                  {u.status === "active" ? (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setSuspendTarget(u);
                      }}
                      disabled={isPending || isSelf}
                      title={isSelf ? "ระงับสิทธิ์บัญชีตัวเองไม่ได้" : undefined}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-[11px] font-bold text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-40"
                    >
                      <ShieldOff className="h-3 w-3" />
                      ระงับสิทธิ์
                    </button>
                  ) : (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        onUserStatus(u.id, "active");
                      }}
                      disabled={isPending}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-success/30 bg-success/10 px-2.5 py-1.5 text-[11px] font-bold text-success-foreground transition-colors hover:bg-success/20 disabled:opacity-40"
                    >
                      <ShieldCheck className="h-3 w-3" />
                      เปิดใช้งาน
                    </button>
                  )}
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setResetTarget(u);
                    }}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-border bg-muted px-2.5 py-1.5 text-[11px] font-bold text-foreground transition-colors hover:bg-secondary"
                  >
                    <KeyRound className="h-3 w-3" />
                    รีเซ็ตรหัสผ่าน
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {totalTeamPages > 1 && (
        <div className="border-t border-border py-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setTeamPage((p) => Math.max(1, p - 1));
                  }}
                  className={teamPage === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="px-4 text-xs font-medium text-muted-foreground">
                  หน้า {teamPage} จาก {totalTeamPages}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setTeamPage((p) => Math.min(totalTeamPages, p + 1));
                  }}
                  className={teamPage === totalTeamPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <ConfirmActionDialog
        isOpen={resetTarget !== null}
        onOpenChange={(open) => !open && setResetTarget(null)}
        title="ยืนยันการรีเซ็ตรหัสผ่าน"
        description={
          resetTarget
            ? `ต้องการรีเซ็ตรหัสผ่านของ ${resetTarget.name} หรือไม่? ผู้ใช้จะต้องตั้งรหัสผ่านใหม่ก่อนเข้าใช้งานครั้งถัดไป`
            : ""
        }
        confirmText="รีเซ็ตรหัสผ่าน"
        onConfirm={handleConfirmReset}
        isProcessing={isResetting}
      />

      <ConfirmActionDialog
        isOpen={suspendTarget !== null}
        onOpenChange={(open) => !open && setSuspendTarget(null)}
        title="ยืนยันการระงับสิทธิ์"
        description={
          suspendTarget
            ? `ต้องการระงับสิทธิ์เข้าใช้งานของ ${suspendTarget.name} หรือไม่? ผู้ใช้จะไม่สามารถเข้าสู่ระบบได้จนกว่าจะเปิดใช้งานอีกครั้ง`
            : ""
        }
        confirmText="ระงับสิทธิ์"
        onConfirm={handleConfirmSuspend}
        isProcessing={isPending}
      />
    </div>
  );
}

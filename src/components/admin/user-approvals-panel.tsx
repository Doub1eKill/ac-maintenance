"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarClock, Clock, Phone, UserCheck, UserX } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ConfirmActionDialog } from "@/components/ui/thai-alert-dialogs";
import { UserCard } from "@/components/admin/user-card";
import type { PendingUserWithContact } from "@/components/admin/types";

interface UserApprovalsPanelProps {
  pendingUsers: PendingUserWithContact[];
  globalSearch: string;
  universityName: string;
  isPending: boolean;
  onUserStatus: (userId: string, status: "active" | "suspended") => void;
}

// Divides by three, so the last row is never a single stranded card.
const ITEMS_PER_PAGE = 9;

/**
 * The queue of people waiting to be let in, laid out like the team directory.
 *
 * Cards rather than a table because approving somebody means looking at what
 * they sent — the photo above all, which a row of text cannot show. The card is
 * not clickable here: a pending account has no work history to open, and the
 * actions that matter are already on it.
 */
export function UserApprovalsPanel({
  pendingUsers,
  globalSearch,
  universityName,
  isPending,
  onUserStatus,
}: UserApprovalsPanelProps) {
  const [approvalsPage, setApprovalsPage] = useState(1);
  const [rejectTarget, setRejectTarget] = useState<PendingUserWithContact | null>(null);

  function handleConfirmReject() {
    if (!rejectTarget) return;
    onUserStatus(rejectTarget.id, "suspended");
    setRejectTarget(null);
  }

  // Back to page 1 the moment the search changes, in the same render.
  const [searchForPage, setSearchForPage] = useState(globalSearch);
  if (searchForPage !== globalSearch) {
    setSearchForPage(globalSearch);
    setApprovalsPage(1);
  }

  const filteredPendingUsers = pendingUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(globalSearch.toLowerCase())
  );

  const totalApprovalsPages = Math.ceil(filteredPendingUsers.length / ITEMS_PER_PAGE);
  const paginatedApprovals = filteredPendingUsers.slice(
    (approvalsPage - 1) * ITEMS_PER_PAGE,
    approvalsPage * ITEMS_PER_PAGE
  );

  return (
    <div className="biz-card animate-in space-y-5 p-6 fade-in">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
          <Clock className="h-5 w-5 text-warning" />
          <span>
            คำขออนุมัติผู้ใช้งานใหม่สำหรับ {universityName} ({pendingUsers.length})
          </span>
        </h2>
      </div>

      {filteredPendingUsers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center text-xs text-muted-foreground">
          {pendingUsers.length === 0
            ? "ยังไม่มีคำขอลงทะเบียนผู้ใช้งานสำหรับองค์กรนี้"
            : "ไม่พบคำขอที่ตรงกับคำค้นนี้"}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {paginatedApprovals.map((u) => (
            <UserCard
              key={u.id}
              user={u}
              // Everything the person filled in at registration, so the decision
              // can be made from the card without opening anything.
              meta={
                <div className="space-y-1 text-[11px] text-muted-foreground">
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3 shrink-0" />
                    {u.phone ?? "ยังไม่ได้ระบุ"}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <CalendarClock className="h-3 w-3 shrink-0" />
                    ขอเมื่อ{" "}
                    {u.createdAt ? format(new Date(u.createdAt), "dd/MM/yyyy HH:mm") : "ไม่ทราบ"}
                  </p>
                </div>
              }
              actions={
                <>
                  <button
                    type="button"
                    onClick={() => onUserStatus(u.id, "active")}
                    disabled={isPending}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-success/30 bg-success/10 px-2.5 py-1.5 text-[11px] font-bold text-success-foreground transition-colors hover:bg-success/20 disabled:opacity-40"
                  >
                    <UserCheck className="h-3 w-3" />
                    อนุมัติ
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejectTarget(u)}
                    disabled={isPending}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-[11px] font-bold text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-40"
                  >
                    <UserX className="h-3 w-3" />
                    ปฏิเสธ
                  </button>
                </>
              }
            />
          ))}
        </div>
      )}

      {totalApprovalsPages > 1 && (
        <div className="border-t border-border py-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setApprovalsPage((p) => Math.max(1, p - 1));
                  }}
                  className={approvalsPage === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="px-4 text-xs font-medium text-muted-foreground">
                  หน้า {approvalsPage} จาก {totalApprovalsPages}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setApprovalsPage((p) => Math.min(totalApprovalsPages, p + 1));
                  }}
                  className={approvalsPage === totalApprovalsPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <ConfirmActionDialog
        isOpen={rejectTarget !== null}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        title="ยืนยันการปฏิเสธคำขอ"
        description={
          rejectTarget
            ? `ต้องการปฏิเสธคำขอลงทะเบียนของ ${rejectTarget.name} หรือไม่? ผู้ใช้จะไม่สามารถเข้าสู่ระบบได้`
            : ""
        }
        confirmText="ปฏิเสธคำขอ"
        onConfirm={handleConfirmReject}
        isProcessing={isPending}
      />
    </div>
  );
}

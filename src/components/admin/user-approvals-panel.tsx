"use client";

import { useEffect, useState } from "react";
import { Clock, UserCheck, UserX } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { PendingUser } from "@/components/admin/types";

interface UserApprovalsPanelProps {
  pendingUsers: PendingUser[];
  globalSearch: string;
  universityName: string;
  isPending: boolean;
  onUserStatus: (userId: string, status: "active" | "suspended") => void;
}

const ITEMS_PER_PAGE = 10;

export function UserApprovalsPanel({ pendingUsers, globalSearch, universityName, isPending, onUserStatus }: UserApprovalsPanelProps) {
  const [approvalsPage, setApprovalsPage] = useState(1);

  useEffect(() => {
    setApprovalsPage(1);
  }, [globalSearch]);

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
    <div className="biz-card p-6 space-y-5 animate-in fade-in">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Clock className="h-5 w-5 text-warning" />
          <span>คำขออนุมัติผู้ใช้งานใหม่สำหรับ {universityName} ({pendingUsers.length})</span>
        </h2>
      </div>

      {filteredPendingUsers.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
          ยังไม่มีคำขอลงทะเบียนผู้ใช้งานสำหรับองค์กรนี้
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-foreground">
            <thead className="border-b border-border bg-muted text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 rounded-l-xl">ชื่อผู้ใช้</th>
                <th className="py-3 px-4">อีเมล</th>
                <th className="py-3 px-4">บทบาท</th>
                <th className="py-3 px-4">วันที่ขอ</th>
                <th className="py-3 px-4 text-right rounded-r-xl">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedApprovals.map((u) => (
                <tr key={u.id} className="hover:bg-muted transition-colors">
                  <td className="py-3.5 px-4 font-bold text-foreground">{u.name}</td>
                  <td className="py-3.5 px-4 font-mono">{u.email}</td>
                  <td className="py-3.5 px-4 font-bold text-foreground uppercase">{u.role}</td>
                  <td className="py-3.5 px-4 font-mono">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}</td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    <button
                      onClick={() => onUserStatus(u.id, "active")}
                      disabled={isPending}
                      className="rounded-lg bg-success px-3 py-1.5 font-bold text-white hover:bg-success/90 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      อนุมัติ
                    </button>
                    <button
                      onClick={() => onUserStatus(u.id, "suspended")}
                      disabled={isPending}
                      className="rounded-lg bg-red-600 px-3 py-1.5 font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                    >
                      <UserX className="h-3.5 w-3.5" />
                      ปฏิเสธ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalApprovalsPages > 1 && (
            <div className="py-4 border-t border-border">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => { e.preventDefault(); setApprovalsPage((p) => Math.max(1, p - 1)); }}
                      className={approvalsPage === 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="text-xs font-medium text-muted-foreground px-4">
                      หน้า {approvalsPage} จาก {totalApprovalsPages}
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => { e.preventDefault(); setApprovalsPage((p) => Math.min(totalApprovalsPages, p + 1)); }}
                      className={approvalsPage === totalApprovalsPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

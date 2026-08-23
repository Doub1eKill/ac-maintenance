"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Users } from "lucide-react";
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
}

const ITEMS_PER_PAGE = 10;

export function TeamPanel({ allUsers, globalSearch, isPending, onUserStatus }: TeamPanelProps) {
  const [teamPage, setTeamPage] = useState(1);
  const [resetTarget, setResetTarget] = useState<PendingUser | null>(null);
  const [isResetting, startResetTransition] = useTransition();

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

  const filteredAllUsers = allUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(globalSearch.toLowerCase())
  );

  const totalTeamPages = Math.ceil(filteredAllUsers.length / ITEMS_PER_PAGE);
  const paginatedTeam = filteredAllUsers.slice((teamPage - 1) * ITEMS_PER_PAGE, teamPage * ITEMS_PER_PAGE);

  return (
    <div className="biz-card p-6 space-y-5 animate-in fade-in">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Users className="h-5 w-5 text-foreground" />
          <span>ทำเนียบเจ้าหน้าที่และช่างซ่อมบำรุง ({allUsers.length})</span>
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-foreground">
          <thead className="border-b border-border bg-muted text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4 rounded-l-xl">ชื่อผู้ใช้</th>
              <th className="py-3 px-4">อีเมล</th>
              <th className="py-3 px-4">บทบาท</th>
              <th className="py-3 px-4">สถานะ</th>
              <th className="py-3 px-4 text-right rounded-r-xl">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedTeam.map((u) => (
              <tr key={u.id} className="hover:bg-muted transition-colors">
                <td className="py-3.5 px-4 font-bold text-foreground">{u.name}</td>
                <td className="py-3.5 px-4 font-mono">{u.email}</td>
                <td className="py-3.5 px-4 font-bold text-foreground uppercase">{u.role}</td>
                <td className="py-3.5 px-4">
                  <span
                    className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                      u.status === "active"
                        ? "bg-success/20 text-success-foreground border border-success/30"
                        : u.status === "pending"
                        ? "bg-warning/20 text-warning-foreground border border-warning/30"
                        : "bg-red-100 text-red-800 border border-red-200"
                    }`}
                  >
                    {u.status}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right space-x-2">
                  {u.status === "active" ? (
                    <button
                      onClick={() => onUserStatus(u.id, "suspended")}
                      disabled={isPending}
                      className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-40"
                    >
                      ระงับสิทธิ์
                    </button>
                  ) : (
                    <button
                      onClick={() => onUserStatus(u.id, "active")}
                      disabled={isPending}
                      className="rounded-lg border border-success/30 bg-success/10 px-2.5 py-1 text-[11px] font-bold text-success-foreground hover:bg-success/20 transition-colors disabled:opacity-40"
                    >
                      เปิดใช้งาน
                    </button>
                  )}
                  <button
                    onClick={() => setResetTarget(u)}
                    className="rounded-lg border border-border bg-muted px-2.5 py-1 text-[11px] font-bold text-foreground hover:bg-secondary transition-colors"
                  >
                    รีเซ็ตรหัสผ่าน
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalTeamPages > 1 && (
          <div className="py-4 border-t border-border">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => { e.preventDefault(); setTeamPage((p) => Math.max(1, p - 1)); }}
                    className={teamPage === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="text-xs font-medium text-muted-foreground px-4">
                    หน้า {teamPage} จาก {totalTeamPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => { e.preventDefault(); setTeamPage((p) => Math.min(totalTeamPages, p + 1)); }}
                    className={teamPage === totalTeamPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

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
    </div>
  );
}

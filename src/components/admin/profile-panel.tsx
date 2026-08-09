"use client";

import { useState, useActionState } from "react";
import { User, Mail, Building2, KeyRound, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { requestPasswordReset, type RequestResetState } from "@/app/request-password-reset/actions";

interface ProfilePanelProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
  universityName: string;
}

const ROLE_LABEL: Record<string, string> = {
  super_admin: "ผู้ดูแลระบบสูงสุด",
  org_admin: "ผู้บริหารองค์กร",
  technician: "ช่างซ่อมบำรุง",
};

export function ProfilePanel({ user, universityName }: ProfilePanelProps) {
  const [name, setName] = useState(user.name ?? "");
  const [showBackendPendingNotice, setShowBackendPendingNotice] = useState(false);
  const [resetState, resetFormAction, isResetPending] = useActionState<RequestResetState, FormData>(
    requestPasswordReset,
    null
  );

  const initials = user.name ? user.name.slice(0, 2).toUpperCase() : "US";
  const roleLabel = user.role ? ROLE_LABEL[user.role] ?? user.role : "-";

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Card 1: Personal Info */}
      <div className="biz-card p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-xl shadow-xs">
            {initials}
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              {user.name || "-"}
            </h3>
            <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/20 text-primary border border-primary/30">
              {roleLabel}
            </span>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" /> {universityName}
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-2 border-t border-border">
          <div>
            <label htmlFor="profile-name" className="mb-1.5 block text-xs font-bold text-foreground">
              ชื่อ-นามสกุล
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
            />
          </div>

          <div>
            <label htmlFor="profile-email" className="mb-1.5 block text-xs font-bold text-foreground">
              อีเมล
            </label>
            <div
              id="profile-email"
              className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3.5 py-2.5 text-sm text-muted-foreground"
            >
              <Mail className="h-4 w-4 shrink-0" />
              {user.email || "-"}
            </div>
          </div>
        </div>

        {showBackendPendingNotice && (
          <Alert className="border-warning/30 bg-warning/10">
            <AlertTriangle className="text-warning" />
            <AlertTitle>ยังบันทึกไม่ได้ในตอนนี้</AlertTitle>
            <AlertDescription>
              ฟีเจอร์นี้ยังไม่เชื่อมต่อกับระบบหลังบ้าน — มีการฝากคำขอไว้ให้ทีม Backend แล้ว
            </AlertDescription>
          </Alert>
        )}

        <button
          type="button"
          onClick={() => setShowBackendPendingNotice(true)}
          className="w-full sm:w-auto rounded-xl bg-foreground px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90 transition-colors"
        >
          บันทึกการเปลี่ยนแปลง
        </button>
      </div>

      {/* Card 2: Account Security */}
      <div className="biz-card p-6 space-y-4">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          ความปลอดภัยของบัญชี
        </h3>

        <div className="flex items-center justify-between rounded-xl border border-border bg-muted px-3.5 py-2.5 text-sm">
          <span className="text-muted-foreground">รหัสผ่าน</span>
          <span className="font-mono font-bold text-foreground">••••••••</span>
        </div>

        {resetState?.message && (
          <Alert className="border-primary/30 bg-primary/10">
            <CheckCircle2 className="text-primary" />
            <AlertTitle>ส่งคำขอแล้ว</AlertTitle>
            <AlertDescription>
              หากอีเมลนี้มีอยู่ในระบบ ลิงก์สำหรับตั้งรหัสผ่านใหม่จะถูกส่งไปที่อีเมลนี้
            </AlertDescription>
          </Alert>
        )}

        <form action={resetFormAction}>
          <input type="hidden" name="email" value={user.email ?? ""} />
          <p className="text-xs text-muted-foreground mb-3">
            ลิงก์สำหรับตั้งรหัสผ่านใหม่จะถูกส่งไปที่{" "}
            <span className="font-bold text-foreground">{user.email || "-"}</span>
          </p>
          <button
            type="submit"
            disabled={isResetPending || !user.email}
            className="w-full sm:w-auto rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-bold text-foreground hover:bg-secondary disabled:opacity-50 transition-colors"
          >
            {isResetPending ? "กำลังส่งคำขอ..." : "ส่งลิงก์เปลี่ยนรหัสผ่าน"}
          </button>
        </form>
      </div>
    </div>
  );
}

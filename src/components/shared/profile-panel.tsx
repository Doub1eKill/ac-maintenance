"use client";

import { useEffect, useState, useTransition, useActionState } from "react";
import { useTheme } from "next-themes";
import { User, Mail, Phone, Building2, KeyRound, AlertTriangle, CheckCircle2, Sun, Moon, Monitor } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { requestPasswordReset, type RequestResetState } from "@/app/request-password-reset/actions";
import { updateProfileAction } from "@/app/admin/actions";

interface ProfilePanelProps {
  profile: {
    name: string;
    email: string;
    role?: string | null;
    phone: string | null;
  };
  universityName: string;
  // Technician data doesn't carry a phone number yet (backend request
  // pending — see HANDOFF.md F5) — showing an empty field would let a
  // save silently clear a real phone number the day the field does exist,
  // since updateProfileAction treats an empty string as "clear it". Hiding
  // the field entirely (and not sending phone at all, which the action
  // treats as "leave it untouched") avoids that until the data is real.
  showPhone?: boolean;
}

const ROLE_LABEL: Record<string, string> = {
  org_admin: "ผู้บริหารองค์กร",
  technician: "ช่างซ่อมบำรุง",
};

export function ProfilePanel({ profile, universityName, showPhone = true }: ProfilePanelProps) {
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [saveResult, setSaveResult] = useState<{ success?: boolean; error?: string } | null>(null);
  const [isSaving, startSaveTransition] = useTransition();

  const [resetState, resetFormAction, isResetPending] = useActionState<RequestResetState, FormData>(
    requestPasswordReset,
    null
  );

  const initials = profile.name ? profile.name.slice(0, 2).toUpperCase() : "US";
  const roleLabel = profile.role ? ROLE_LABEL[profile.role] ?? profile.role : "-";

  const handleSave = () => {
    setSaveResult(null);
    startSaveTransition(async () => {
      const result = showPhone ? await updateProfileAction(name, phone) : await updateProfileAction(name);
      setSaveResult(result);
    });
  };

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
              {profile.name || "-"}
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

          {showPhone && (
            <div>
              <label htmlFor="profile-phone" className="mb-1.5 block text-xs font-bold text-foreground">
                เบอร์โทรศัพท์
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="profile-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="081-234-5678"
                  className="w-full rounded-xl border border-border bg-muted pl-10 pr-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="profile-email" className="mb-1.5 block text-xs font-bold text-foreground">
              อีเมล
            </label>
            <div
              id="profile-email"
              className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3.5 py-2.5 text-sm text-muted-foreground"
            >
              <Mail className="h-4 w-4 shrink-0" />
              {profile.email || "-"}
            </div>
          </div>
        </div>

        {saveResult?.success && (
          <Alert className="border-primary/30 bg-primary/10">
            <CheckCircle2 className="text-primary" />
            <AlertTitle>บันทึกแล้ว</AlertTitle>
            <AlertDescription>ข้อมูลโปรไฟล์ของคุณถูกอัปเดตเรียบร้อย</AlertDescription>
          </Alert>
        )}

        {saveResult?.error && (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>บันทึกไม่สำเร็จ</AlertTitle>
            <AlertDescription>{saveResult.error}</AlertDescription>
          </Alert>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full sm:w-auto rounded-xl bg-foreground px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isSaving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
        </button>
      </div>

      {/* Card 2: Appearance */}
      <ThemeCard />

      {/* Card 3: Account Security */}
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
          <input type="hidden" name="email" value={profile.email ?? ""} />
          <p className="text-xs text-muted-foreground mb-3">
            ลิงก์สำหรับตั้งรหัสผ่านใหม่จะถูกส่งไปที่{" "}
            <span className="font-bold text-foreground">{profile.email || "-"}</span>
          </p>
          <button
            type="submit"
            disabled={isResetPending || !profile.email}
            className="w-full sm:w-auto rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-bold text-foreground hover:bg-secondary disabled:opacity-50 transition-colors"
          >
            {isResetPending ? "กำลังส่งคำขอ..." : "ส่งลิงก์เปลี่ยนรหัสผ่าน"}
          </button>
        </form>
      </div>
    </div>
  );
}

const THEME_OPTIONS = [
  { value: "light", label: "สว่าง", icon: Sun },
  { value: "dark", label: "มืด", icon: Moon },
  { value: "system", label: "ตามระบบ", icon: Monitor },
] as const;

function ThemeCard() {
  // next-themes only knows the real theme after mounting on the client —
  // rendering the active option before that would read the server's guess
  // (always "system") and flip a frame later, which shows up as every
  // button briefly looking unselected/selected wrong on first paint.
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="biz-card p-6 space-y-4">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <Sun className="h-4 w-4 text-primary" />
        ธีมการแสดงผล
      </h3>
      <p className="text-xs text-muted-foreground">
        เป็นการตั้งค่าส่วนตัว มีผลเฉพาะอุปกรณ์นี้ ไม่กระทบผู้ใช้งานคนอื่น
      </p>
      <div className="grid grid-cols-3 gap-2">
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
          const isActive = mounted && theme === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border py-3 text-xs font-bold transition-colors ${
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

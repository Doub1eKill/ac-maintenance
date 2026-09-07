"use client";

import { useEffect, useRef, useState, useTransition, useActionState } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { User, Mail, Phone, Building2, KeyRound, AlertTriangle, CheckCircle2, Sun, Moon, Monitor, Camera, Pencil } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { requestPasswordReset, type RequestResetState } from "@/app/request-password-reset/actions";
import { updateProfileAction } from "@/app/admin/actions";

interface ProfilePanelProps {
  profile: {
    name: string;
    email: string;
    role?: string | null;
    phone: string | null;
    // null means this account has never set a picture — the card falls back to
    // the user's initials, which is a real state rather than missing data.
    avatarUrl: string | null;
  };
  universityName: string;
}

const ROLE_LABEL: Record<string, string> = {
  org_admin: "ผู้บริหารองค์กร",
  technician: "ช่างซ่อมบำรุง",
};

// Mirrors the ceiling updateProfileAction enforces, so an oversized file is
// refused here instead of after several megabytes have crossed the wire. The
// server still checks — this is a courtesy, not the guard.
const AVATAR_MAX_BYTES = 8 * 1024 * 1024;

// Both dashboards render this, and both now feed it a real phone number.
// The technician page used to pass showPhone={false}: its data did not carry
// one, and an empty field would have let a save clear a number the user could
// not see, since updateProfileAction reads "" as "clear it". getTechShellData
// selects the primary phone now, so the flag is gone rather than flipped —
// leaving it would only be a switch nobody may use.
export function ProfilePanel({ profile, universityName }: ProfilePanelProps) {
  // Read-only until the user asks to edit. A profile page is opened far more
  // often to look something up than to change something, and fields that are
  // always live invite a stray keystroke into a name nobody meant to touch.
  // The picture is the deliberate exception — see the note on the save button.
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [saveResult, setSaveResult] = useState<{ success?: boolean; error?: string } | null>(null);
  const [isSaving, startSaveTransition] = useTransition();

  // The chosen file and the blob: URL showing it. The picture is not uploaded
  // on selection: updateProfileAction writes name, phone and avatar in one
  // call, so it goes up with everything else when the user saves. That is why
  // the notice below spells out that a save is still needed — a preview that
  // changed on screen otherwise reads as "done".
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // A blob: URL is held by the browser until it is revoked. Cleaning up as the
  // value changes releases the one just replaced, so picking five pictures in
  // a row stops pinning five images in memory for the life of the page.
  useEffect(() => {
    if (!avatarPreview) return;
    return () => URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  const [resetState, resetFormAction, isResetPending] = useActionState<RequestResetState, FormData>(
    requestPasswordReset,
    null
  );

  const initials = profile.name ? profile.name.slice(0, 2).toUpperCase() : "US";
  const roleLabel = profile.role ? ROLE_LABEL[profile.role] ?? profile.role : "-";
  // The pending pick wins over what is stored: after a save it is the same
  // image anyway, and it keeps the avatar from flicking back to the old one
  // while the refreshed server data is still on its way.
  const avatarSrc = avatarPreview ?? profile.avatarUrl;

  const handlePickAvatar = (file: File | null) => {
    if (!file) return;
    setSaveResult(null);
    if (!file.type.startsWith("image/")) {
      setAvatarError("รูปโปรไฟล์ต้องเป็นไฟล์รูปภาพเท่านั้น");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarError("รูปโปรไฟล์ต้องมีขนาดไม่เกิน 8 MB");
      return;
    }
    setAvatarError(null);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const cancelAvatarPick = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarError(null);
    // Without this the same file cannot be chosen again: the input keeps its
    // value, so re-selecting it fires no change event.
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startEditing = () => {
    // Seed the inputs from the server data rather than from whatever the last
    // edit left in state, so reopening the form always starts from what is
    // actually stored.
    setName(profile.name);
    setPhone(profile.phone ?? "");
    setSaveResult(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setName(profile.name);
    setPhone(profile.phone ?? "");
    setSaveResult(null);
    // A pending picture is deliberately left alone: it can be chosen without
    // entering the form at all, so cancelling the form must not silently throw
    // away a pick made before the form was even opened. It has its own
    // "ยกเลิกรูปที่เลือก" beside the preview.
  };

  const handleSave = () => {
    setSaveResult(null);
    // Outside the form the only thing that can have changed is the picture, so
    // the name and phone sent are the stored ones, not the local state. That
    // state was seeded at mount and would otherwise write a stale name back
    // over a newer one on a picture-only save.
    const nextName = isEditing ? name : profile.name;
    const nextPhone = isEditing ? phone : profile.phone ?? "";

    startSaveTransition(async () => {
      const result = await updateProfileAction(nextName, nextPhone, avatarFile);
      setSaveResult(result);
      if (result?.success) {
        setIsEditing(false);
        // Only the pending state is cleared. The preview stays on screen — it
        // is the picture that was just saved, and profile.avatarUrl catches up
        // a moment later when the revalidated data arrives.
        setAvatarFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  };

  // Named after the button it points at, because the button is not always the
  // same one: inside the form it saves everything, outside it there is only
  // ever a picture to save.
  const saveLabel = isEditing ? "บันทึกการเปลี่ยนแปลง" : "บันทึกรูปโปรไฟล์";
  // Nothing to save outside the form until a picture is waiting.
  const canSave = isEditing || avatarFile !== null;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Card 1: Personal Info */}
      <div className="biz-card p-6 space-y-6">
        <div className="flex items-start gap-4">
          <div className="flex shrink-0 flex-col items-center gap-2">
            <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-xs">
              {avatarSrc ? (
                <Image
                  src={avatarSrc}
                  // The name is right beside it, so describing the picture too
                  // would only make a screen reader say it twice.
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                  // A blob: URL has no path through the image optimiser.
                  // Stored pictures do, and saveUpload() has already capped
                  // them at 1600px on the way in.
                  unoptimized={avatarSrc.startsWith("blob:")}
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xl font-bold">
                  {initials}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 whitespace-nowrap rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-bold text-foreground hover:bg-secondary transition-colors"
            >
              <Camera className="h-3 w-3" />
              เปลี่ยนรูป
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handlePickAvatar(e.target.files?.[0] ?? null)}
            />
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

        {avatarError && <p className="text-xs font-bold text-destructive">{avatarError}</p>}

        {avatarFile && !avatarError && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-2.5 text-xs text-foreground">
            <span>เลือกรูปใหม่แล้ว — กด &quot;{saveLabel}&quot; ด้านล่างเพื่อยืนยัน</span>
            <button
              type="button"
              onClick={cancelAvatarPick}
              className="font-bold underline underline-offset-2 hover:text-primary"
            >
              ยกเลิกรูปที่เลือก
            </button>
          </div>
        )}

        <div className="space-y-4 pt-2 border-t border-border">
          {/* Read-only rows borrow the email field's treatment, which has always
              been display-only here — so "cannot be edited right now" and
              "cannot be edited at all" look the same, which is the truth from
              where the user is standing. */}
          <div>
            <label htmlFor="profile-name" className="mb-1.5 block text-xs font-bold text-foreground">
              ชื่อ-นามสกุล
            </label>
            {isEditing ? (
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              />
            ) : (
              <div
                id="profile-name"
                className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3.5 py-2.5 text-sm text-muted-foreground"
              >
                <User className="h-4 w-4 shrink-0" />
                {profile.name || "-"}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="profile-phone" className="mb-1.5 block text-xs font-bold text-foreground">
              เบอร์โทรศัพท์
            </label>
            {isEditing ? (
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
            ) : (
              <div
                id="profile-phone"
                className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3.5 py-2.5 text-sm text-muted-foreground"
              >
                <Phone className="h-4 w-4 shrink-0" />
                {profile.phone || "ยังไม่ได้ระบุ"}
              </div>
            )}
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

        <div className="flex flex-wrap items-center gap-2">
          {!isEditing && (
            <button
              type="button"
              onClick={startEditing}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-bold text-foreground hover:bg-secondary transition-colors sm:w-auto"
            >
              <Pencil className="h-3.5 w-3.5" />
              แก้ไขข้อมูล
            </button>
          )}

          {/* Shown outside the form too, because a picture can be changed
              without opening it and would otherwise have no way to be saved. */}
          {canSave && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="w-full sm:w-auto rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isSaving ? "กำลังบันทึก..." : saveLabel}
            </button>
          )}

          {isEditing && (
            <button
              type="button"
              onClick={cancelEditing}
              disabled={isSaving}
              className="w-full sm:w-auto rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-bold text-foreground hover:bg-secondary disabled:opacity-50 transition-colors"
            >
              ยกเลิก
            </button>
          )}
        </div>
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
            className="w-full sm:w-auto rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-bold text-foreground hover:bg-secondary disabled:opacity-50 transition-colors"
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

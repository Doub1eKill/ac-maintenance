"use client";

import { useEffect, useRef, useState, useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { registerUser, type RegisterState } from "@/app/register/actions";
import { avatarRejectionReason } from "@/lib/avatar";
import { Wrench, Building2, Eye, EyeOff, AlertTriangle, Clock, CheckCircle2, ArrowLeft, UserPlus, Camera, Phone, User } from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";
export function RegisterForm() {
  const [state, formAction, isPending] = useActionState<RegisterState, FormData>(
    registerUser,
    null
  );

  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"technician" | "org_admin">("technician");

  // The picture rides along in the form's own FormData — the input keeps its
  // name and stays uncontrolled, and this is only here to show what was
  // picked and to know whether anything was.
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // A blob: URL is held until revoked; cleaning up as the value changes
  // releases the one just replaced.
  useEffect(() => {
    if (!avatarPreview) return;
    return () => URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  const handlePickAvatar = (file: File | null) => {
    if (!file) return;
    const rejection = avatarRejectionReason(file);
    if (rejection) {
      // Clear the input as well, or the file the server would refuse is still
      // sitting in the form waiting to be submitted.
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      setAvatarPreview(null);
      setAvatarError(rejection);
      return;
    }
    setAvatarError(null);
    setAvatarPreview(URL.createObjectURL(file));
  };

  // The hidden input cannot carry `required` — the browser will not submit a
  // form whose invalid control it cannot focus, and shows nothing to explain
  // why. So the rule is enforced here, next to the field it is about, rather
  // than by a round trip that comes back with the message at the top of the
  // page. The action checks again regardless; this only saves the trip.
  //
  // Asks the input what it is actually holding rather than trusting the
  // preview: React resets this form's uncontrolled fields when the action
  // returns, and that empties the file input — but not avatarPreview, which
  // is state and survives. Trusting the preview would wave through a submit
  // carrying no file at all, and the server would then refuse a picture the
  // user can plainly see on screen. Clearing the preview here is what keeps
  // the two from disagreeing.
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if ((avatarInputRef.current?.files?.length ?? 0) > 0) return;
    event.preventDefault();
    setAvatarPreview(null);
    setAvatarError("กรุณาเลือกรูปโปรไฟล์");
    avatarInputRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  if (state?.success) {
    // An institutional address is active the moment it is registered; a
    // public one waits for an admin. The screen has to say which, because
    // the message underneath already does, and a heading that always read
    // "(Pending)" contradicted it for every .ac.th sign-up.
    const activeNow = state.status === "active";
    return (
      <div className="space-y-6 text-center">
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border shadow-2xs ${
            activeNow
              ? "bg-emerald-50 border-emerald-200 text-emerald-600"
              : "bg-amber-50 border-amber-200 text-amber-600"
          }`}
        >
          {activeNow ? <CheckCircle2 className="h-7 w-7" /> : <Clock className="h-7 w-7" />}
        </div>

        <div className="space-y-1">
          <h3 className="text-xl font-extrabold text-slate-950">
            {activeNow ? "ลงทะเบียนสำเร็จ" : "ลงทะเบียนสำเร็จ (รออนุมัติ)"}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
            {state.message}
          </p>
        </div>

        {activeNow ? (
          <Alert className="border-emerald-200 bg-emerald-50">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertTitle className="font-bold text-emerald-950">
              สถานะบัญชี: เปิดใช้งานแล้ว (Active)
            </AlertTitle>
            <AlertDescription className="text-slate-700 text-[11px] leading-relaxed">
              อีเมลสถาบันได้รับการอนุมัติอัตโนมัติ เข้าสู่ระบบด้วยอีเมลและรหัสผ่านที่ตั้งไว้ได้ทันที
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-amber-200 bg-amber-50">
            <Clock className="h-4 w-4 text-amber-600" />
            <AlertTitle className="font-bold text-amber-950">
              สถานะบัญชี: รอการอนุมัติสิทธิ์ (Pending Approval)
            </AlertTitle>
            <AlertDescription className="text-slate-700 text-[11px] leading-relaxed">
              ผู้ดูแลระบบสถาบัน (Org Admin) จะทำการตรวจสอบและอนุมัติสิทธิ์เข้าใช้งานของคุณก่อนเริ่มใช้งานระบบ
            </AlertDescription>
          </Alert>
        )}

        <div className="pt-2">
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 font-bold text-xs text-white hover:bg-slate-800 transition-all shadow-md"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับสู่หน้าเข้าสู่ระบบ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
      {state?.error && (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-900">{state.error}</AlertDescription>
        </Alert>
      )}

      {/* Profile picture — required, and first because it is the one field
          that says who this is rather than what they may do. */}
      <div className="flex flex-col items-center gap-2 pb-1">
        <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-2xs">
          {avatarPreview ? (
            <Image
              src={avatarPreview}
              alt=""
              fill
              sizes="80px"
              className="object-cover"
              // A blob: URL has no path through the image optimiser.
              unoptimized
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-slate-400">
              <User className="h-8 w-8" />
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => avatarInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs"
        >
          <Camera className="h-3 w-3" />
          {avatarPreview ? "เปลี่ยนรูปโปรไฟล์" : "เลือกรูปโปรไฟล์"}
        </button>
        <input
          ref={avatarInputRef}
          id="avatar"
          name="avatar"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handlePickAvatar(e.target.files?.[0] ?? null)}
        />
        <span className="text-[10px] text-slate-400">
          จำเป็นต้องใส่ · ไฟล์รูปภาพ ขนาดไม่เกิน 8 MB
        </span>
        {avatarError && (
          <p className="text-[11px] font-bold text-red-600">{avatarError}</p>
        )}
      </div>

      {/* Role Selector Tabs */}
      <div>
        <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-wider">
          ประเภทบทบาทที่ต้องการสมัคร (Role)
        </label>
        <input type="hidden" name="role" value={selectedRole} />
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            type="button"
            onClick={() => setSelectedRole("technician")}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
              selectedRole === "technician"
                ? "bg-white text-slate-950 shadow-2xs"
                : "text-slate-500 hover:text-slate-950"
            }`}
          >
            <Wrench className="h-3.5 w-3.5" />
            <span>ช่างเทคนิคซ่อมบำรุง</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole("org_admin")}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
              selectedRole === "org_admin"
                ? "bg-white text-slate-950 shadow-2xs"
                : "text-slate-500 hover:text-slate-950"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>แอดมินสถาบัน</span>
          </button>
        </div>
      </div>

      {/* Name Input */}
      <div>
        <label htmlFor="name" className="mb-1.5 block text-xs font-bold text-slate-800">
          ชื่อ-นามสกุล (Full Name)
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="เช่น นายสมชาย ใจดี"
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-950 focus:outline-none shadow-2xs"
        />
      </div>

      {/* Phone Input — sits with the name because the two together are "who
          you are"; the credentials follow. */}
      <div>
        <label htmlFor="phone" className="mb-1.5 block text-xs font-bold text-slate-800">
          เบอร์โทรศัพท์ (Phone)
        </label>
        <div className="relative">
          <Phone className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            placeholder="081-234-5678"
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-950 focus:outline-none shadow-2xs"
          />
        </div>
      </div>

      {/* Email Input */}
      <div>
        <label htmlFor="email" className="mb-1.5 block text-xs font-bold text-slate-800">
          อีเมล (Email Address)
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="somchai@pkru.ac.th"
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-950 focus:outline-none shadow-2xs"
        />
      </div>

      {/* Password Input */}
      <div>
        <label htmlFor="password" className="mb-1.5 block text-xs font-bold text-slate-800">
          รหัสผ่าน (Password)
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            placeholder="รหัสผ่านอย่างน้อย 8 ตัวอักษร"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-950 focus:outline-none shadow-2xs"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-950"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 font-bold text-xs text-white hover:bg-slate-800 disabled:opacity-50 transition-all shadow-md active:scale-[0.99] mt-2"
      >
        <UserPlus className="h-4 w-4" />
        <span>{isPending ? "กำลังบันทึกข้อมูล..." : "ยืนยันลงทะเบียน (Register)"}</span>
      </button>

      {/* Back to Login */}
      <div className="pt-3 text-center text-xs text-slate-500 border-t border-slate-100">
        มีบัญชีผู้ใช้งานอยู่แล้ว?{" "}
        <Link href="/login" className="font-bold text-slate-950 hover:underline">
          เข้าสู่ระบบที่นี่
        </Link>
      </div>
    </form>
  );
}

"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { registerUser, type RegisterState } from "@/app/register/actions";
import { Wrench, Building2, Eye, EyeOff, AlertTriangle, Clock, ArrowLeft } from "lucide-react";

interface UniversityOption {
  id: string;
  name: string;
  abbreviation: string;
}

export function RegisterForm({ universities }: { universities: UniversityOption[] }) {
  const [state, formAction, isPending] = useActionState<RegisterState, FormData>(
    registerUser,
    null
  );

  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"technician" | "org_admin">("technician");

  if (state?.success) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
          <Clock className="h-8 w-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white">ลงทะเบียนสำเร็จ (Pending)</h3>
          <p className="text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
            {state.message}
          </p>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300 text-left space-y-1.5">
          <div className="font-semibold flex items-center gap-1.5 text-amber-200">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            สถานะบัญชี: รอการอนุมัติ (Pending Approval)
          </div>
          <p className="text-slate-300">
            ผู้ดูแลระบบระดับมหาวิทยาลัย (Org Admin) จะทำการตรวจสอบและอนุมัติสิทธิ์เข้าใช้งานของคุณก่อนเริ่มใช้งานระบบ
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 py-3 font-semibold text-slate-950 hover:bg-sky-400 transition-colors shadow-lg shadow-sky-500/20"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับสู่หน้าเข้าสู่ระบบ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs sm:text-sm text-red-400 flex items-start gap-2.5">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
          <div>{state.error}</div>
        </div>
      )}

      {/* Role Selector Tabs */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-300 uppercase tracking-wider">
          ประเภทบัญชี (Role)
        </label>
        <input type="hidden" name="role" value={selectedRole} />
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-950 p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => setSelectedRole("technician")}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
              selectedRole === "technician"
                ? "bg-sky-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Wrench className="h-3.5 w-3.5" />
            <span>ช่างเทคนิค (Tech)</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole("org_admin")}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
              selectedRole === "org_admin"
                ? "bg-sky-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>แอดมินมหาวิทยาลัย</span>
          </button>
        </div>
      </div>

      {/* Full Name */}
      <div>
        <label htmlFor="name" className="mb-1.5 block text-xs font-medium text-slate-300">
          ชื่อ - นามสกุล
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="เช่น สมชาย ใจดี"
          className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-slate-300">
          อีเมล (Email)
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="name@university.ac.th"
          className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
        />
      </div>

      {/* University Selection Dropdown */}
      <div>
        <label htmlFor="universityId" className="mb-1.5 block text-xs font-medium text-slate-300">
          มหาวิทยาลัย / สถาบันสังกัด
        </label>
        <select
          id="universityId"
          name="universityId"
          required
          defaultValue=""
          className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-sm text-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
        >
          <option value="" disabled className="bg-slate-900 text-slate-400">
            -- กรุณาเลือกมหาวิทยาลัย --
          </option>
          {universities.map((u) => (
            <option key={u.id} value={u.id} className="bg-slate-900 text-white">
              {u.name} ({u.abbreviation})
            </option>
          ))}
        </select>
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-slate-300">
          รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            placeholder="••••••••"
            className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 pr-10 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 py-3 font-bold text-slate-950 hover:from-sky-400 hover:to-cyan-300 disabled:opacity-50 transition-all shadow-lg shadow-sky-500/20 active:scale-[0.99] mt-2"
      >
        {isPending ? "กำลังส่งข้อมูล..." : "ส่งคำขอลงทะเบียน"}
      </button>

      {/* Link back to login */}
      <div className="pt-3 text-center text-xs text-slate-400">
        มีบัญชีผู้ใช้งานอยู่แล้ว?{" "}
        <Link href="/login" className="font-semibold text-sky-400 hover:text-sky-300 underline underline-offset-4">
          เข้าสู่ระบบที่นี่
        </Link>
      </div>
    </form>
  );
}

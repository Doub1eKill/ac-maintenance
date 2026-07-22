"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { registerUser, type RegisterState } from "@/app/register/actions";
import { Wrench, Building2, Eye, EyeOff, AlertTriangle, Clock, ArrowLeft, UserPlus } from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";

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
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 shadow-2xs">
          <Clock className="h-7 w-7 text-amber-600" />
        </div>

        <div className="space-y-1">
          <h3 className="text-xl font-extrabold text-slate-950">ลงทะเบียนสำเร็จ (Pending)</h3>
          <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
            {state.message}
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 text-left space-y-1 shadow-2xs">
          <div className="font-bold text-amber-950 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            สถานะบัญชี: รอการอนุมัติสิทธิ์ (Pending Approval)
          </div>
          <p className="text-slate-700 text-[11px] leading-relaxed">
            ผู้ดูแลระบบสถาบัน (Org Admin) จะทำการตรวจสอบและอนุมัติสิทธิ์เข้าใช้งานของคุณก่อนเริ่มใช้งานระบบ
          </p>
        </div>

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
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-900 flex items-start gap-2.5 shadow-2xs">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <div>{state.error}</div>
        </div>
      )}

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

      {/* University Selector */}
      <div>
        <label htmlFor="universityId" className="mb-1.5 block text-xs font-bold text-slate-800">
          เลือกมหาวิทยาลัย / สถาบันการศึกษาสังกัด
        </label>
        <select
          id="universityId"
          name="universityId"
          required
          defaultValue=""
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-slate-950 focus:outline-none shadow-2xs"
        >
          <option value="" disabled className="text-slate-400">
            -- กรุณาเลือกสถาบันการศึกษา --
          </option>
          {universities.map((uni) => (
            <option key={uni.id} value={uni.id}>
              {uni.name} ({uni.abbreviation})
            </option>
          ))}
        </select>
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

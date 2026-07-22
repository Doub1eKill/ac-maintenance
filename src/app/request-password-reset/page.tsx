"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/auth-layout";
import { requestPasswordReset, type RequestResetState } from "./actions";

export default function RequestPasswordResetPage() {
  const [state, formAction, isPending] = useActionState<RequestResetState, FormData>(
    requestPasswordReset,
    null
  );

  return (
    <AuthLayout
      title="ลืมรหัสผ่าน?"
      subtitle="ระบุอีเมลที่ลงทะเบียนไว้ในระบบ เพื่อรับลิงก์สำหรับตั้งรหัสผ่านใหม่"
    >
      {state?.message ? (
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-xs text-sky-300 text-left leading-relaxed">
            {state.message}
          </div>
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-xl bg-slate-800 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
          >
            กลับสู่หน้าเข้าสู่ระบบ
          </Link>
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
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

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 py-3 font-bold text-slate-950 hover:from-sky-400 hover:to-cyan-300 disabled:opacity-50 transition-all shadow-lg shadow-sky-500/20 mt-2"
          >
            {isPending ? "กำลังส่งข้อมูล..." : "ส่งลิงก์ตั้งรหัสผ่านใหม่"}
          </button>

          <div className="pt-2 text-center text-xs text-slate-400">
            จำรหัสผ่านได้แล้ว?{" "}
            <Link href="/login" className="font-semibold text-sky-400 hover:text-sky-300 underline underline-offset-4">
              เข้าสู่ระบบที่นี่
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}

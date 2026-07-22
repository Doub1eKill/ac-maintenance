"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { resetPassword, type ResetPasswordState } from "./actions";
import { Eye, EyeOff, AlertTriangle, CheckCircle2, KeyRound } from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState<ResetPasswordState, FormData>(
    resetPassword,
    null
  );
  const [showPassword, setShowPassword] = useState(false);

  if (state?.success) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-2xs">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-extrabold text-slate-950">ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว</h3>
          <p className="text-xs text-slate-600">
            คุณสามารถใช้รหัสผ่านใหม่เพื่อเข้าสู่ระบบบริหารจัดการได้ทันที
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 font-bold text-xs text-white hover:bg-slate-800 transition-all shadow-md"
        >
          <KeyRound className="h-4 w-4" />
          เข้าสู่ระบบเลย
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      {state?.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-900 flex items-start gap-2.5 shadow-2xs">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <div>{state.error}</div>
        </div>
      )}

      <div>
        <label htmlFor="password" className="mb-1.5 block text-xs font-bold text-slate-800">
          รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="••••••••"
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

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-slate-950 py-3 font-bold text-xs text-white hover:bg-slate-800 disabled:opacity-50 transition-all shadow-md mt-2"
      >
        {isPending ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
      </button>
    </form>
  );
}

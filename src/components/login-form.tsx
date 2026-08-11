"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, AlertTriangle, Building2, Wrench, ArrowRight } from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

const ERROR_MESSAGES: Record<string, string> = {
  "account-pending": "บัญชีผู้ใช้ของคุณอยู่ระหว่างรอการอนุมัติสิทธิ์จากผู้ดูแลระบบมหาวิทยาลัย (Pending)",
  "account-suspended": "บัญชีผู้ใช้ของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบมหาวิทยาลัย",
  "password-reset-required": "คุณต้องตั้งรหัสผ่านใหม่ก่อนเข้าใช้งานระบบเป็นครั้งแรก",
  CredentialsSignin: "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง",
};

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");

  function quickFillAccount(email: string) {
    setEmailInput(email);
    setPasswordInput("Password123!");
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const email = emailInput.trim().toLowerCase();
    const password = passwordInput;

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setIsSubmitting(false);

    if (result?.error) {
      if (result.error === "account-pending") {
        router.push(`/pending-approval?email=${encodeURIComponent(email)}`);
        return;
      }
      setError(ERROR_MESSAGES[result.error] ?? ERROR_MESSAGES.CredentialsSignin);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Quick Test Demo Presets */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
          <span>ทดสอบเข้าสู่ระบบด่วน (บัญชีผู้ใช้จำลอง)</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => quickFillAccount("admin@pkru.ac.th")}
            className="flex flex-col items-center justify-center rounded-xl border border-sky-200 bg-sky-50 p-2 text-center hover:bg-sky-100 transition-all group shadow-2xs"
          >
            <Building2 className="h-4 w-4 text-sky-700 mb-1" />
            <span className="text-[10px] font-bold text-sky-900">ผู้บริหารองค์กร</span>
          </button>

          <button
            type="button"
            onClick={() => quickFillAccount("tech@pkru.ac.th")}
            className="flex flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-center hover:bg-emerald-100 transition-all group shadow-2xs"
          >
            <Wrench className="h-4 w-4 text-emerald-700 mb-1" />
            <span className="text-[10px] font-bold text-emerald-900">ช่างซ่อมบำรุง</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-900">{error}</AlertDescription>
          </Alert>
        )}

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
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            autoComplete="username"
            placeholder="name@university.ac.th"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-950 focus:outline-none shadow-2xs"
          />
        </div>

        {/* Password Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-xs font-bold text-slate-800">
              รหัสผ่าน (Password)
            </label>
            <Link
              href="/request-password-reset"
              className="text-xs font-semibold text-slate-700 hover:text-slate-950 hover:underline"
            >
              ลืมรหัสผ่าน?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-950 focus:outline-none shadow-2xs"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 font-bold text-xs text-white hover:bg-slate-800 disabled:opacity-50 transition-all shadow-md active:scale-[0.99] mt-2 group"
        >
          <span>{isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ (Sign In)"}</span>
          <ArrowRight className="h-4 w-4 text-white" />
        </button>

        {/* Register Link */}
        <div className="pt-3 text-center text-xs text-slate-500 border-t border-slate-100">
          ยังไม่มีบัญชีผู้ใช้งานในระบบ?{" "}
          <Link href="/register" className="font-bold text-slate-900 hover:underline">
            ลงทะเบียนผู้ใช้งานใหม่ที่นี่
          </Link>
        </div>
      </form>
    </div>
  );
}

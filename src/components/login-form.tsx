"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, AlertTriangle } from "lucide-react";

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const rawEmail = formData.get("email") as string;
    const email = rawEmail ? rawEmail.trim().toLowerCase() : "";
    const password = formData.get("password") as string;

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError(ERROR_MESSAGES[result.error] ?? ERROR_MESSAGES.CredentialsSignin);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs sm:text-sm text-red-400 flex items-start gap-2.5">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Email Input */}
      <div>
        <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-slate-300">
          อีเมล (Email)
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          placeholder="name@university.ac.th"
          className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
        />
      </div>

      {/* Password Input */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="password" className="block text-xs font-medium text-slate-300">
            รหัสผ่าน (Password)
          </label>
          <Link
            href="/request-password-reset"
            className="text-xs font-medium text-sky-400 hover:text-sky-300 hover:underline"
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
            autoComplete="current-password"
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
        disabled={isSubmitting}
        className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 py-3 font-bold text-slate-950 hover:from-sky-400 hover:to-cyan-300 disabled:opacity-50 transition-all shadow-lg shadow-sky-500/20 active:scale-[0.99] mt-2"
      >
        {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
      </button>

      {/* Register Link */}
      <div className="pt-3 text-center text-xs text-slate-400">
        ยังไม่มีบัญชีผู้ใช้งาน?{" "}
        <Link href="/register" className="font-semibold text-sky-400 hover:text-sky-300 underline underline-offset-4">
          ลงทะเบียนใหม่ที่นี่
        </Link>
      </div>
    </form>
  );
}

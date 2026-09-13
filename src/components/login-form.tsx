"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { BROWSER_SESSION_KEY } from "@/lib/session-expiry";
import type { SignInCode } from "@/lib/sign-in-codes";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, AlertTriangle, Building2, Wrench, ArrowRight } from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

const ERROR_MESSAGES: Record<SignInCode | "CredentialsSignin", string> = {
  "account-pending": "บัญชีผู้ใช้ของคุณอยู่ระหว่างรอการอนุมัติสิทธิ์จากผู้ดูแลระบบมหาวิทยาลัย (Pending)",
  "account-suspended": "บัญชีผู้ใช้ของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบมหาวิทยาลัย",
  "password-reset-required": "คุณต้องตั้งรหัสผ่านใหม่ก่อนเข้าใช้งานระบบเป็นครั้งแรก",
  CredentialsSignin: "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง",
};

/**
 * Only same-origin paths are honoured as a return destination. Taking the
 * value straight from the query string would let a link like
 * /login?callbackUrl=https://elsewhere.example send someone off-site the
 * moment they signed in, with the credibility of having just authenticated.
 * A leading "//" is rejected too — the browser reads it as a protocol-relative
 * URL, so "//evil.example" is off-site despite looking like a path.
 */
function safeCallbackUrl(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

// Inlined at build time, so the demo panel is not merely hidden in production —
// it is not in the bundle, matching the provider it depends on.
const isDevelopment = process.env.NODE_ENV !== "production";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");

  // False in the server-rendered HTML, true once React has attached the
  // submit handler below. Until then the submit button stays disabled, so a
  // click or an Enter press that lands before hydration (a slow connection,
  // a dev-server compile) cannot fall through to the browser's own submit.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Marks this browser session as one that has been through the login page, so
  // BrowserSessionGuard does not read the redirect straight after signing in as
  // a session left over from a previous run of the browser and undo it.
  useEffect(() => {
    try {
      window.sessionStorage.setItem(BROWSER_SESSION_KEY, "1");
    } catch {
      // Storage unavailable: the guard handles that case by standing down.
    }
  }, []);

  /**
   * The demo buttons sign in directly rather than filling the form.
   *
   * They used to prefill admin@pkru.ac.th / Password123!, which never worked:
   * no such account exists, and the seeded ones deliberately have no password
   * at all. There is nothing to type into the form that would let them in, so
   * they go through the development-only "demo-role" provider instead, which
   * takes the role and signs in as the account seeded for it.
   *
   * That provider does not exist in a production build, so these buttons are
   * hidden there too — see the isDevelopment check below.
   */
  async function quickSignIn(role: "org_admin" | "technician") {
    setIsSubmitting(true);
    setError(null);

    const result = await signIn("demo-role", { role, redirect: false });
    setIsSubmitting(false);

    if (result?.error) {
      setError(
        "เข้าสู่ระบบด่วนไม่สำเร็จ — ไม่พบบัญชีจำลองที่ใช้งานอยู่สำหรับบทบาทนี้ (ลองรัน seed ใหม่)"
      );
      return;
    }

    router.push(callbackUrl ?? "/");
    router.refresh();
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
      // Auth.js v5 reports a refused sign-in as error "CredentialsSignin"
      // every time; the reason a CredentialsSignin subclass carries (see
      // auth.ts) arrives separately as result.code. This used to read
      // result.error, so pending, suspended and password-less accounts all
      // got the wrong-password message.
      const reason = (result.code ?? result.error) as SignInCode | "CredentialsSignin";
      if (reason === "account-pending") {
        router.push(`/pending-approval?email=${encodeURIComponent(email)}`);
        return;
      }
      setError(ERROR_MESSAGES[reason] ?? ERROR_MESSAGES.CredentialsSignin);
      return;
    }

    // Back to wherever they were sent from — the QR page a technician scanned,
    // say. Without one, "/" routes them to their own dashboard by role.
    router.push(callbackUrl ?? "/");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Quick Test Demo Presets — development only, see quickSignIn above */}
      {isDevelopment && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>ทดสอบเข้าสู่ระบบด่วน (บัญชีผู้ใช้จำลอง)</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => quickSignIn("org_admin")}
              className="flex flex-col items-center justify-center rounded-xl border border-sky-200 bg-sky-50 p-2 text-center hover:bg-sky-100 transition-all group shadow-2xs disabled:opacity-50"
            >
              <Building2 className="h-4 w-4 text-sky-700 mb-1" />
              <span className="text-[10px] font-bold text-sky-900">ผู้บริหารองค์กร</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => quickSignIn("technician")}
              className="flex flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-center hover:bg-emerald-100 transition-all group shadow-2xs disabled:opacity-50"
            >
              <Wrench className="h-4 w-4 text-emerald-700 mb-1" />
              <span className="text-[10px] font-bold text-emerald-900">ช่างซ่อมบำรุง</span>
            </button>
          </div>
        </div>
      )}

      {/* method="post" is the second guard for the same case: should a
          submit ever reach the browser's default path, it goes in the body
          rather than as ?email=…&password=… in the address bar, browser
          history and the server's access log. The form used to omit it,
          and a click before hydration did exactly that. */}
      <form onSubmit={handleSubmit} method="post" className="space-y-4">
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
          disabled={isSubmitting || !hydrated}
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

"use client";

import { useEffect, useRef, useState, useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  checkEmailAction,
  registerUser,
  sendEmailCodeAction,
  verifyEmailCodeAction,
  type RegisterState,
} from "@/app/register/actions";
import type { EmailCheck } from "@/lib/email-check";
import { isWellFormed, normaliseEmail } from "@/lib/email-check";
import { avatarRejectionReason } from "@/lib/avatar";
import { PhotoSource } from "@/components/shared/photo-source";
import { shrinkImage } from "@/lib/client-image";
import { Wrench, Building2, Eye, EyeOff, AlertTriangle, Clock, CheckCircle2, ArrowLeft, UserPlus, Phone, User, Loader2, AlertCircle, Lightbulb, MailCheck, Send, ShieldCheck } from "lucide-react";
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

  // What the server said about the address last typed, or that it is being
  // asked. "idle" covers both an empty field and one whose contents are not
  // yet an address — the browser's own validation speaks for those.
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [emailCheck, setEmailCheck] = useState<{ status: "idle" } | { status: "checking" } | EmailCheck>({
    status: "idle",
  });
  // The address the last answer was about, so an answer that arrives after
  // the field has moved on is dropped rather than shown against new text.
  const checkedFor = useRef<string>("");
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // What the (uncontrolled) field holds, normalised, for the render below —
  // the verification step is shown only against the address it belongs to.
  const [emailValue, setEmailValue] = useState("");

  const runEmailCheck = (raw: string) => {
    // Also cancels a check still waiting its turn: clicking the suggestion
    // blurs the field, and the blur schedules a check of the value the field
    // held before the click — which would land after this one and undo it.
    if (checkTimer.current) clearTimeout(checkTimer.current);
    const email = normaliseEmail(raw);
    setEmailValue(email);
    // A different address than the one the code went to starts over.
    setVerify((v) => (v.phase !== "idle" && v.email !== email ? { phase: "idle" } : v));
    checkedFor.current = email;
    if (!isWellFormed(email)) {
      setEmailCheck({ status: "idle" });
      return;
    }
    setEmailCheck({ status: "checking" });
    checkEmailAction(email)
      .then((result) => {
        if (checkedFor.current === email) setEmailCheck(result);
      })
      .catch(() => {
        // A failed round trip is not a verdict on the address.
        if (checkedFor.current === email) setEmailCheck({ status: "idle" });
      });
  };

  // Half a second after the last keystroke, and at once on leaving the field.
  const scheduleEmailCheck = (raw: string, delayMs: number) => {
    setEmailValue(normaliseEmail(raw));
    if (checkTimer.current) clearTimeout(checkTimer.current);
    checkTimer.current = setTimeout(() => runEmailCheck(raw), delayMs);
  };
  useEffect(() => () => { if (checkTimer.current) clearTimeout(checkTimer.current); }, []);

  const applySuggestion = (suggestion: string) => {
    if (emailInputRef.current) emailInputRef.current.value = suggestion;
    runEmailCheck(suggestion);
  };

  // The proof step. `verify.email` is the address the code was sent to; any
  // edit to the field that changes the address throws the step away, so a
  // token can never end up vouching for a different address than the one
  // in the form (registerUser checks that too).
  type VerifyStep =
    | { phase: "idle" }
    | { phase: "sending"; email: string }
    | { phase: "code"; email: string; cooldownUntil: number; notice: string | null; busy: boolean }
    | { phase: "verified"; email: string; token: string };
  const [verify, setVerify] = useState<VerifyStep>({ phase: "idle" });
  const [codeInput, setCodeInput] = useState("");
  // Ticks once a second while a cooldown is showing, so the countdown moves.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (verify.phase !== "code" || verify.cooldownUntil <= now) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [verify, now]);

  const verifyIsFor = (email: string) => verify.phase !== "idle" && verify.email === email;

  const sendCode = async () => {
    const email = emailValue;
    setVerify({ phase: "sending", email });
    setCodeInput("");
    const result = await sendEmailCodeAction(email);
    if (result.status === "sent") {
      setVerify({ phase: "code", email, cooldownUntil: Date.now() + result.cooldownSeconds * 1000, notice: null, busy: false });
    } else if (result.status === "cooldown") {
      setVerify({ phase: "code", email, cooldownUntil: Date.now() + result.retryInSeconds * 1000, notice: "เพิ่งส่งรหัสไปแล้ว กรุณารอสักครู่ก่อนขอใหม่", busy: false });
    } else if (result.status === "limited") {
      setVerify({ phase: "code", email, cooldownUntil: Date.now() + 60 * 60 * 1000, notice: "ขอรหัสบ่อยเกินไป กรุณาลองใหม่ในอีกหนึ่งชั่วโมง", busy: false });
    } else {
      setVerify({ phase: "idle" });
      setEmailCheck({ status: "invalid", message: result.message });
    }
    setNow(Date.now());
  };

  const submitCode = async () => {
    if (verify.phase !== "code") return;
    const { email } = verify;
    setVerify({ ...verify, busy: true, notice: null });
    const result = await verifyEmailCodeAction(email, codeInput);
    if (result.status === "verified") {
      setVerify({ phase: "verified", email, token: result.token });
      return;
    }
    const notice =
      result.status === "wrong"
        ? `รหัสไม่ถูกต้อง (ลองได้อีก ${result.attemptsLeft} ครั้ง)`
        : result.status === "expired"
          ? "รหัสหมดอายุหรือลองผิดครบแล้ว กรุณาขอรหัสใหม่"
          : "ยังไม่ได้ส่งรหัสไปที่อีเมลนี้ กรุณากดส่งรหัสก่อน";
    setVerify({ ...verify, busy: false, notice });
  };

  const emailVerified = verify.phase === "verified" && verify.email === emailValue;
  // An address a code may be sent to: the same set sendEmailCodeAction
  // accepts — anything not refused outright. A typo suggestion is only a
  // guess, and a domain without mail is refused only where registration is.
  const emailAcceptable =
    emailCheck.status === "ok" ||
    emailCheck.status === "suggestion" ||
    (emailCheck.status === "no-mx" && !emailCheck.blocking);

  // The button is held exactly when the server would refuse: a malformed or
  // already-registered address always, a domain that takes no mail only
  // where registration enforces that (production). Elsewhere the warning
  // shows and the submit is still allowed — the QA harness registers its
  // accounts on domains that do not exist.
  const emailBlocksSubmit =
    emailCheck.status === "invalid" ||
    emailCheck.status === "taken" ||
    (emailCheck.status === "no-mx" && emailCheck.blocking) ||
    // And, always: the address has to have been proven readable first.
    !emailVerified;
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

  const handlePickAvatar = async (file: File | null) => {
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
    // This form submits natively through the input, so the shrunk file has to
    // go back into the input: a DataTransfer is the one way to set its files.
    const picked = await shrinkImage(file);
    if (picked !== file && avatarInputRef.current && typeof DataTransfer !== "undefined") {
      const dt = new DataTransfer();
      dt.items.add(picked);
      avatarInputRef.current.files = dt.files;
    }
    setAvatarPreview(URL.createObjectURL(picked));
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
        {/* Front camera or the photo library; the form submits the named
            input inside, and handlePickAvatar writes the shrunk file back
            into it through avatarInputRef as before. */}
        <PhotoSource
          id="avatar"
          name="avatar"
          facing="user"
          inputRef={avatarInputRef}
          onFile={(file) => void handlePickAvatar(file)}
          labels={{ camera: "ถ่ายรูป", gallery: avatarPreview ? "เปลี่ยนรูปโปรไฟล์" : "เลือกรูปโปรไฟล์" }}
          className="justify-center"
          buttonClassName="min-h-8 rounded-lg border-slate-200 bg-white px-2.5 text-[11px] text-slate-800 hover:bg-slate-50 shadow-2xs"
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
          ref={emailInputRef}
          id="email"
          name="email"
          type="email"
          required
          placeholder="somchai@pkru.ac.th"
          onChange={(e) => scheduleEmailCheck(e.target.value, 500)}
          onBlur={(e) => scheduleEmailCheck(e.target.value, 0)}
          aria-describedby="email-check"
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-950 focus:outline-none shadow-2xs"
        />
        {/* One line under the field, in the voice of whichever answer came
            back. Rendered even when empty so the field does not jump. */}
        <div id="email-check" aria-live="polite" className="mt-1.5 min-h-[1rem] text-[11px] leading-4">
          {emailCheck.status === "checking" && (
            <span className="inline-flex items-center gap-1 text-slate-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              กำลังตรวจสอบอีเมล...
            </span>
          )}
          {(emailCheck.status === "invalid" || emailCheck.status === "no-mx" || emailCheck.status === "taken") && (
            <span className="inline-flex items-start gap-1 font-bold text-red-600">
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
              {emailCheck.message}
            </span>
          )}
          {emailCheck.status === "suggestion" && (
            <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-amber-700">
              <Lightbulb className="h-3 w-3 shrink-0" />
              {emailCheck.message}
              <button
                type="button"
                onClick={() => applySuggestion(emailCheck.suggestion)}
                className="font-bold underline underline-offset-2 hover:text-amber-900"
              >
                ใช้ {emailCheck.suggestion}
              </button>
            </span>
          )}
          {emailCheck.status === "ok" && emailCheck.message && (
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <CheckCircle2 className="h-3 w-3 shrink-0" />
              {emailCheck.message}
              <span className="text-slate-500">
                {emailCheck.institutional && selectedRole === "technician"
                  ? "· เปิดใช้งานทันทีหลังลงทะเบียน"
                  : "· รอผู้ดูแลระบบอนุมัติ"}
              </span>
            </span>
          )}
        </div>

        {/* Proof that the address is read: a code goes out, comes back typed,
            and only then does the submit button work. Offered once the
            address itself has passed; withdrawn if the address changes. */}
        {emailAcceptable && !emailVerified && (verify.phase === "idle" || !verifyIsFor(emailValue)) && (
          <button
            type="button"
            onClick={sendCode}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-900 bg-slate-950 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-slate-800 transition-colors"
          >
            <Send className="h-3 w-3" />
            ส่งรหัสยืนยันไปที่อีเมลนี้
          </button>
        )}
        {verify.phase === "sending" && (
          <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-slate-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            กำลังส่งรหัส...
          </span>
        )}
        {verify.phase === "code" && verifyIsFor(emailValue) && (
          <div id="email-verify" className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] text-slate-700">
              ส่งรหัส 6 หลักไปที่ <span className="font-bold">{verify.email}</span> แล้ว กรอกรหัสภายใน 15 นาที
              (ถ้าไม่พบ ดูในโฟลเดอร์อีเมลขยะ)
            </p>
            <div className="flex gap-2">
              <input
                id="email-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                value={codeInput}
                // Digits only, six at most — kept here rather than as a
                // maxLength on the input: the mail shows the code spaced
                // out, and a browser applies maxLength to pasted text before
                // any handler runs, so "0 5 1 4 8 4" arrived cut to "0514".
                onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onPaste={(e) => {
                  e.preventDefault();
                  setCodeInput(e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6));
                }}
                onKeyDown={(e) => {
                  // Enter here confirms the code; it must not submit the form.
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (codeInput.length === 6 && !verify.busy) void submitCode();
                  }
                }}
                placeholder="000000"
                aria-label="รหัสยืนยัน 6 หลัก"
                className="w-32 rounded-lg border border-slate-200 bg-white px-3 py-2 text-center font-mono text-sm tracking-[0.3em] text-slate-900 placeholder-slate-300 focus:border-slate-950 focus:outline-none"
              />
              <button
                type="button"
                onClick={submitCode}
                disabled={codeInput.length !== 6 || verify.busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-2 text-[11px] font-bold text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                {verify.busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                ยืนยันรหัส
              </button>
              <button
                type="button"
                onClick={sendCode}
                disabled={verify.cooldownUntil > now}
                className="ml-auto text-[11px] font-bold text-slate-700 underline underline-offset-2 hover:text-slate-950 disabled:no-underline disabled:opacity-50"
              >
                {verify.cooldownUntil > now
                  ? `ส่งรหัสใหม่ได้ใน ${Math.max(1, Math.ceil((verify.cooldownUntil - now) / 1000))} วิ`
                  : "ส่งรหัสใหม่"}
              </button>
            </div>
            {verify.notice && (
              <p className="inline-flex items-start gap-1 text-[11px] font-bold text-red-600">
                <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                {verify.notice}
              </p>
            )}
          </div>
        )}
        {emailVerified && (
          <p id="email-verified" className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
            <MailCheck className="h-3.5 w-3.5" />
            ยืนยันอีเมลแล้ว
          </p>
        )}
        {/* Carried with the submission; registerUser refuses without it. */}
        {verify.phase === "verified" && <input type="hidden" name="emailVerificationToken" value={verify.token} />}
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
        disabled={isPending || emailBlocksSubmit}
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

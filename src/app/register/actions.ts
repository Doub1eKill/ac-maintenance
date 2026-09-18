"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma/client";
import { saveUpload, deleteUpload } from "@/lib/upload";
import { avatarRejectionReason } from "@/lib/avatar";
import { headers } from "next/headers";
import { isInstitutionalDomain, normaliseEmail, type EmailCheck } from "@/lib/email-check";
import { checkEmailShape, enforceMxOnRegister } from "@/lib/email-mx";
import {
  discardCodesFor,
  sendVerificationCode,
  verifyCode,
  verifyProofToken,
  type SendCodeResult,
  type VerifyCodeResult,
} from "@/lib/email-verification";

export type RegisterState = {
  success?: boolean;
  error?: string;
  message?: string;
  // Which of the two outcomes this was. The message above already says,
  // but prose is for reading, not branching: the success screen used to
  // title itself "(Pending)" and show an approval notice to an account
  // the same message had just called active.
  status?: "active" | "pending";
} | null;

const registerSchema = z.object({
  name: z.string().min(2, "ชื่อ-นามสกุล ต้องมีความยาวอย่างน้อย 2 ตัวอักษร"),
  email: z.string().email("กรุณากรอกอีเมลให้ถูกต้อง"),
  password: z.string().min(8, "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร"),
  role: z.enum(["technician", "org_admin"]).default("technician"),
  // Required, like every other field on this form. The shape stays as
  // permissive as updateProfileAction's, and for the same reason: Thai
  // numbers get written with and without spaces, dashes and a +66 prefix,
  // and turning away a real number someone typed their own way is worse
  // than storing it a little unevenly.
  //
  // trim() runs before min(1), so a box holding only spaces is empty here
  // even though the browser's own `required` was satisfied by it.
  phone: z
    .string()
    .trim()
    .min(1, "กรุณากรอกเบอร์โทรศัพท์")
    .max(20, "เบอร์โทรศัพท์ยาวเกินไป")
    .refine(
      (v) => /^[\d+\-\s()]{9,20}$/.test(v),
      "รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง"
    ),
});

// Inline checks from the form: a small allowance per address, because each
// one may cost a DNS round trip and a database read, and a form does not need
// more than a few per minute.
const CHECK_LIMIT = 20;
const CHECK_WINDOW_MS = 60_000;
const checkHits = new Map<string, { count: number; resetAt: number }>();

function overCheckLimit(key: string): boolean {
  const now = Date.now();
  const hit = checkHits.get(key);
  if (!hit || hit.resetAt < now) {
    checkHits.set(key, { count: 1, resetAt: now + CHECK_WINDOW_MS });
    return false;
  }
  hit.count += 1;
  return hit.count > CHECK_LIMIT;
}

/**
 * What the form shows under the email field as the address is typed.
 *
 * Everything the registration itself will say about the address, said
 * early: the shape, a likely typo in the domain, a domain that takes no
 * mail, and — the one answer that needs the database — whether it is
 * already registered. That last one is told to anyone who asks, which is
 * the same thing registerUser has always done on submit, so nothing new is
 * revealed; it is just revealed sooner.
 */
export async function checkEmailAction(raw: unknown): Promise<EmailCheck> {
  if (typeof raw !== "string" || raw.length > 254) {
    return { status: "invalid", message: "รูปแบบอีเมลไม่ถูกต้อง" };
  }
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (overCheckLimit(ip)) {
    // Neither a refusal nor a pass: the form treats an unknown as "nothing to
    // say" and lets the submit decide.
    return { status: "ok", institutional: false, verified: false, message: "" };
  }

  const shape = await checkEmailShape(raw);
  if (shape.status === "invalid") return shape;

  // Asked before the domain's verdict is returned: "already registered" is
  // this database's own answer and settles the matter, whereas a typo
  // suggestion or a missing MX record is only a doubt about the address.
  const existing = await prisma.user.findUnique({
    where: { email: normaliseEmail(raw) },
    select: { id: true },
  });
  if (existing) {
    return { status: "taken", message: "อีเมลนี้ถูกลงทะเบียนในระบบเรียบร้อยแล้ว" };
  }
  return shape;
}

// Sends per IP, on top of the per-address limits the library keeps: one
// browser must not be able to spray codes at many addresses.
const SEND_LIMIT = 10;
const SEND_WINDOW_MS = 10 * 60_000;
const sendHits = new Map<string, { count: number; resetAt: number }>();

async function clientKey(): Promise<string> {
  return (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

/**
 * Mails a code to the address in the form. The address is put through the
 * same checks the field shows first, so a code is never sent to an address
 * the registration would refuse anyway.
 */
export async function sendEmailCodeAction(raw: unknown): Promise<SendCodeResult> {
  if (typeof raw !== "string" || raw.length > 254) {
    return { status: "failed", message: "รูปแบบอีเมลไม่ถูกต้อง" };
  }
  const ip = await clientKey();
  const now = Date.now();
  const hit = sendHits.get(ip);
  if (!hit || hit.resetAt < now) sendHits.set(ip, { count: 1, resetAt: now + SEND_WINDOW_MS });
  else if (++hit.count > SEND_LIMIT) return { status: "limited" };

  const check = await checkEmailAction(raw);
  if (check.status === "invalid" || check.status === "taken" || (check.status === "no-mx" && check.blocking)) {
    return { status: "failed", message: check.message };
  }
  return sendVerificationCode(raw);
}

/** Checks the typed code; a pass returns the token the submit must carry. */
export async function verifyEmailCodeAction(rawEmail: unknown, rawCode: unknown): Promise<VerifyCodeResult> {
  if (typeof rawEmail !== "string" || typeof rawCode !== "string") return { status: "none" };
  return verifyCode(rawEmail, rawCode);
}

export async function registerUser(
  _prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const rawData = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role") || "technician",
    // formData.get returns null for a field the browser did not send, which
    // Zod would reject as "expected string" rather than treat as blank.
    phone: formData.get("phone") ?? "",
  };

  const parsed = registerSchema.safeParse(rawData);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || "ข้อมูลที่กรอกไม่ถูกต้อง";
    return { error: firstError };
  }

  const { name, email, password, role, phone } = parsed.data;

  // Required, and checked here rather than only in the form: the file input
  // is hidden behind a styled button, and a hidden input cannot carry the
  // browser's own `required` — Chrome refuses to submit a form it cannot
  // focus the offending control in, and reports nothing the user can see.
  // The form blocks it too, but this is the rule; that is the courtesy.
  //
  // Checked before anything is written, so a rejected file costs nothing.
  const avatarFile = formData.get("avatar");
  if (!(avatarFile instanceof File) || avatarFile.size === 0) {
    return { error: "กรุณาเลือกรูปโปรไฟล์" };
  }
  const avatarRejection = avatarRejectionReason(avatarFile);
  if (avatarRejection) return { error: avatarRejection };

  try {
    const cleanEmail = email.toLowerCase().trim();

    // Check if email is already registered
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return { error: "อีเมลนี้ถูกลงทะเบียนในระบบเรียบร้อยแล้ว" };
    }

    // The same question the form asked while the address was typed, asked
    // again here because the form can be bypassed. A domain that takes no
    // mail is refused in production; in development it is let through so
    // the QA harness can register its made-up accounts (see the note on
    // enforceMxOnRegister).
    const shape = await checkEmailShape(cleanEmail);
    if (shape.status === "no-mx" && enforceMxOnRegister()) {
      return { error: shape.message };
    }

    // The address must have been proven readable on this form: the token
    // verifyEmailCodeAction handed back names it and is signed. Without it
    // the .ac.th auto-activation below would be open to any address typed
    // in, which is the hole the codes exist to close.
    if (!verifyProofToken(formData.get("emailVerificationToken"), cleanEmail)) {
      return { error: "กรุณายืนยันอีเมลด้วยรหัสที่ส่งไปให้ก่อนลงทะเบียน" };
    }

    const emailDomain = cleanEmail.split("@")[1] || "";
    const isVerifiedDomain = isInstitutionalDomain(emailDomain);
    
    // Enterprise Auto-Approval Rule:
    // Institutional/university emails (.ac.th, .edu) auto-activate a
    // technician. Public webmail (gmail/hotmail) remains pending for manual
    // Org Admin verification.
    //
    // An org_admin request always waits for a person, whatever the domain.
    // The role arrives from a hidden input the browser controls, so the
    // domain alone used to be enough for anyone with a .ac.th address to
    // pick "แอดมินสถาบัน" and walk straight into /admin.
    const initialStatus =
      role === "technician" && isVerifiedDomain ? "active" : "pending";

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // Written to disk only once the email is known to be free, so retrying a
    // registration against an address that is already taken cannot leave a
    // file behind on every attempt. Outside the transaction as well: this is
    // a multi-megabyte write, and holding a transaction open across it would
    // keep its locks for the whole duration.
    const avatarUrl = await saveUpload(avatarFile);
    if (!avatarUrl) {
      return { error: "ไม่สามารถบันทึกรูปโปรไฟล์ได้ กรุณาลองใหม่อีกครั้ง" };
    }

    try {
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name,
            email: cleanEmail,
            password: hashedPassword,
            role: role as UserRole,
            status: initialStatus,
            avatarUrl,
            // Proven a moment ago by the code; recorded so the column means
            // what it says for accounts made from here on.
            emailVerifiedAt: new Date(),
          },
        });

        // One row, flagged primary, which is the shape the profile page reads
        // back. Unconditional now that the field is required — the schema
        // above has already refused a blank one.
        await tx.userPhone.create({
          data: { userId: user.id, phoneNumber: phone, isPrimary: true },
        });
      });
    } catch (error) {
      // The account was never created, so the file just written belongs to
      // nothing. Leaving it would strand a few megabytes per failed attempt.
      if (avatarUrl) await deleteUpload(avatarUrl);
      throw error;
    }

    await discardCodesFor(cleanEmail);

    if (initialStatus === "active") {
      return {
        success: true,
        status: "active",
        message: `ลงทะเบียนสำเร็จ! บัญชีของคุณได้รับการอนุมัติและเปิดใช้งานสิทธิ์เข้าสู่ระบบทันทีเนื่องจากเป็นอีเมลสถาบัน (${cleanEmail})`,
      };
    }

    return {
      success: true,
      status: "pending",
      message:
        "ลงทะเบียนสำเร็จ! บัญชีของคุณอยู่ระหว่างรอการตรวจสอบและอนุมัติสิทธิ์จากผู้ดูแลระบบ (Pending Approval)",
    };
  } catch (error) {
    console.error("Registration error:", error);
    return { error: "เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง" };
  }
}

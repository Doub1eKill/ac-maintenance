"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma/client";
import { saveUpload, deleteUpload } from "@/lib/upload";
import { avatarRejectionReason } from "@/lib/avatar";

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

const PUBLIC_EMAIL_DOMAINS = [
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "yahoo.com",
  "icloud.com",
  "live.com",
  "aol.com",
];

function isInstitutionalDomain(emailDomain: string): boolean {
  const domain = emailDomain.toLowerCase();

  // Public webmail domains require manual Org Admin verification
  if (PUBLIC_EMAIL_DOMAINS.includes(domain)) {
    return false;
  }

  // Official educational domains (.ac.th, .edu, .edu.th)
  return domain.endsWith(".ac.th") || domain.endsWith(".edu") || domain.endsWith(".edu.th");
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

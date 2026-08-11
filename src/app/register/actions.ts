"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma/client";

export type RegisterState = {
  success?: boolean;
  error?: string;
  message?: string;
} | null;

const registerSchema = z.object({
  name: z.string().min(2, "ชื่อ-นามสกุล ต้องมีความยาวอย่างน้อย 2 ตัวอักษร"),
  email: z.string().email("กรุณากรอกอีเมลให้ถูกต้อง"),
  password: z.string().min(8, "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร"),
  role: z.enum(["technician", "org_admin"]).default("technician"),
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
  };

  const parsed = registerSchema.safeParse(rawData);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || "ข้อมูลที่กรอกไม่ถูกต้อง";
    return { error: firstError };
  }

  const { name, email, password, role } = parsed.data;

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
    // Institutional/university emails (.ac.th, .edu) auto-activate.
    // Public webmail (gmail/hotmail) remains pending for manual Org Admin verification.
    const initialStatus = isVerifiedDomain ? "active" : "pending";

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        name,
        email: cleanEmail,
        password: hashedPassword,
        role: role as UserRole,
        status: initialStatus,
      },
    });

    if (initialStatus === "active") {
      return {
        success: true,
        message: `ลงทะเบียนสำเร็จ! บัญชีของคุณได้รับการอนุมัติและเปิดใช้งานสิทธิ์เข้าสู่ระบบทันทีเนื่องจากเป็นอีเมลสถาบัน (${cleanEmail})`,
      };
    }

    return {
      success: true,
      message:
        "ลงทะเบียนสำเร็จ! บัญชีของคุณอยู่ระหว่างรอการตรวจสอบและอนุมัติสิทธิ์จากผู้ดูแลระบบ (Pending Approval)",
    };
  } catch (error) {
    console.error("Registration error:", error);
    return { error: "เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง" };
  }
}

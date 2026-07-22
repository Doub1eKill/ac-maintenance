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
  universityId: z.string().min(1, "กรุณาเลือกมหาวิทยาลัย/หน่วยงานสังกัด"),
  role: z.enum(["technician", "org_admin"]).default("technician"),
});

export async function getUniversities() {
  try {
    const universities = await prisma.university.findMany({
      select: {
        id: true,
        name: true,
        abbreviation: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return universities.map((u) => ({
      id: u.id.toString(),
      name: u.name,
      abbreviation: u.abbreviation,
    }));
  } catch (error) {
    console.error("Failed to fetch universities:", error);
    return [];
  }
}

export async function registerUser(
  _prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const rawData = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    universityId: formData.get("universityId"),
    role: formData.get("role") || "technician",
  };

  const parsed = registerSchema.safeParse(rawData);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || "ข้อมูลที่กรอกไม่ถูกต้อง";
    return { error: firstError };
  }

  const { name, email, password, universityId, role } = parsed.data;

  try {
    // Check if email is already registered
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return { error: "อีเมลนี้ถูกลงทะเบียนในระบบเรียบร้อยแล้ว" };
    }

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with status: 'pending' (Awaiting Org Admin Approval)
    await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        universityId: BigInt(universityId),
        role: role as UserRole,
        status: "pending",
      },
    });

    return {
      success: true,
      message:
        "ลงทะเบียนสำเร็จ! บัญชีของคุณอยู่ระหว่างรอการอนุมัติสิทธิ์จากผู้ดูแลระบบมหาวิทยาลัย (Pending Approval)",
    };
  } catch (error) {
    console.error("Registration error:", error);
    return { error: "เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง" };
  }
}

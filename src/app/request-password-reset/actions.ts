"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createResetToken } from "@/lib/reset-token";
import { getAppUrl, isMailConfigured, sendMail } from "@/lib/mail";

const schema = z.object({ email: z.string().email() });

export type RequestResetState = { message: string } | null;

const RESET_SUBJECT = "ตั้งรหัสผ่านใหม่ - ระบบบริหารจัดการเครื่องปรับอากาศ";

function resetEmailBody(resetUrl: string) {
  const text = [
    "มีการขอตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ",
    "",
    "เปิดลิงก์ด้านล่างเพื่อตั้งรหัสผ่านใหม่ (ลิงก์มีอายุ 1 ชั่วโมง):",
    resetUrl,
    "",
    "หากคุณไม่ได้เป็นผู้ขอ ไม่ต้องดำเนินการใด ๆ รหัสผ่านเดิมจะยังใช้งานได้ตามปกติ",
  ].join("\n");

  // Kept to plain markup with inline styles — mail clients strip <style>
  // blocks and external CSS, so anything fancier would degrade unevenly.
  const html = `
    <div style="font-family: sans-serif; font-size: 15px; color: #0f172a; line-height: 1.7;">
      <p>มีการขอตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ</p>
      <p>กดปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่ (ลิงก์มีอายุ 1 ชั่วโมง)</p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}"
           style="background:#0284c7; color:#ffffff; padding:12px 20px; border-radius:8px;
                  text-decoration:none; font-weight:bold; display:inline-block;">
          ตั้งรหัสผ่านใหม่
        </a>
      </p>
      <p style="font-size: 13px; color: #475569;">
        หากปุ่มด้านบนใช้งานไม่ได้ ให้คัดลอกลิงก์นี้ไปวางในเบราว์เซอร์:<br />
        <span style="word-break: break-all;">${resetUrl}</span>
      </p>
      <hr style="border:none; border-top:1px solid #e2e8f0; margin:24px 0;" />
      <p style="font-size: 13px; color: #475569;">
        หากคุณไม่ได้เป็นผู้ขอ ไม่ต้องดำเนินการใด ๆ รหัสผ่านเดิมจะยังใช้งานได้ตามปกติ
      </p>
    </div>
  `;

  return { text, html };
}

export async function requestPasswordReset(
  _prevState: RequestResetState,
  formData: FormData
): Promise<RequestResetState> {
  const parsed = schema.safeParse({ email: formData.get("email") });

  // Same generic response whether the email exists or not, valid or not, and
  // whether or not the send actually succeeded — this is the one message
  // shown for every outcome so the response itself never confirms which
  // accounts exist (anti-enumeration).
  const genericMessage = isMailConfigured()
    ? "หากอีเมลนี้ลงทะเบียนไว้ในระบบ ระบบได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้แล้ว กรุณาตรวจสอบกล่องจดหมาย (รวมถึงโฟลเดอร์อีเมลขยะ) ลิงก์มีอายุ 1 ชั่วโมง"
    : "หากอีเมลนี้ลงทะเบียนไว้ในระบบ ระบบได้สร้างลิงก์สำหรับตั้งรหัสผ่านใหม่แล้ว (โหมดพัฒนา: ยังไม่ได้ตั้งค่า SMTP ลิงก์ถูกแสดงไว้ที่ console ของเซิร์ฟเวอร์)";

  if (!parsed.success) {
    return { message: genericMessage };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true, password: true },
  });

  if (user) {
    const token = createResetToken(Number(user.id), user.password);
    const resetUrl = `${getAppUrl()}/reset-password?token=${token}`;
    const { text, html } = resetEmailBody(resetUrl);

    const result = await sendMail({
      to: user.email,
      subject: RESET_SUBJECT,
      text,
      html,
    });

    if (result.status === "not_configured" && process.env.NODE_ENV !== "production") {
      // Development fallback only: without SMTP there is no other way to reach
      // the reset link while testing. The URL carries a working reset token, so
      // it is gated on the environment as well as on SMTP being unset — SMTP is
      // still unconfigured in this project, and without the second condition a
      // deploy made before those credentials are filled in would print a live
      // password reset for every request into the production log.
      console.log(`[password reset] ${user.email} -> ${resetUrl}`);
    }
  }

  return { message: genericMessage };
}

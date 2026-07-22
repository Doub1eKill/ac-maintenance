import { AuthLayout } from "@/components/auth/auth-layout";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata = {
  title: "ตั้งรหัสผ่านใหม่ | AC Maintenance System",
  description: "ตั้งรหัสผ่านใหม่สำหรับเข้าใช้งานระบบบริหารจัดการและแจ้งซ่อมเครื่องปรับอากาศ",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <AuthLayout
        title="ข้อผิดพลาด"
        subtitle="ไม่พบโทเค็นสำหรับตั้งรหัสผ่านใหม่ กรุณาขอลิงก์ใหม่อีกครั้ง"
      >
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 text-center">
          ไม่พบรหัสโทเค็น (Missing Reset Token)
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="ตั้งรหัสผ่านใหม่"
      subtitle="กรุณาระบุรหัสผ่านใหม่ที่คุณต้องการใช้สำหรับเข้าสู่ระบบ"
    >
      <ResetPasswordForm token={token} />
    </AuthLayout>
  );
}

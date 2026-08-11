import { AuthLayout } from "@/components/auth/auth-layout";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata = {
  title: "สมัครสมาชิก | AC Maintenance System",
  description: "ลงทะเบียนเข้าใช้งานระบบบริหารจัดการและแจ้งซ่อมเครื่องปรับอากาศ",
};

export default function RegisterPage() {
  return (
    <AuthLayout
      title="ลงทะเบียนใช้งานระบบ"
      subtitle="กรอกข้อมูลเพื่อส่งคำขอเข้าใช้งานระบบบริหารจัดการและแจ้งซ่อมเครื่องปรับอากาศ"
    >
      <RegisterForm />
    </AuthLayout>
  );
}

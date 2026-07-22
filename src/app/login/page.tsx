import { AuthLayout } from "@/components/auth/auth-layout";
import { LoginForm } from "@/components/login-form";

export const metadata = {
  title: "เข้าสู่ระบบ | AC Maintenance System",
  description: "เข้าสู่ระบบบริหารจัดการและแจ้งซ่อมเครื่องปรับอากาศระดับมหาวิทยาลัย",
};

export default function LoginPage() {
  return (
    <AuthLayout
      title="ยินดีต้อนรับเข้าสู่ระบบ"
      subtitle="กรุณากรอกอีเมลและรหัสผ่านเพื่อเข้าสู่บัญชีใช้งานของคุณ"
    >
      <LoginForm />
    </AuthLayout>
  );
}

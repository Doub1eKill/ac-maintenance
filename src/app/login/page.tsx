import { Suspense } from "react";
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
      {/* LoginForm reads ?callbackUrl through useSearchParams, which can only
          be resolved per request. Without this boundary the whole page opts
          out of static prerendering and the build fails outright; with it,
          only the form waits for the request while the shell stays static. */}
      <Suspense fallback={<div className="h-[420px]" aria-busy="true" />}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}

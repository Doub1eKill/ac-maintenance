import { AuthLayout } from "@/components/auth/auth-layout";
import { RegisterForm } from "@/components/auth/register-form";
import { getUniversities } from "./actions";

export const metadata = {
  title: "สมัครสมาชิก | AC Maintenance System",
  description: "ลงทะเบียนเข้าใช้งานระบบบริหารจัดการและแจ้งซ่อมเครื่องปรับอากาศระดับมหาวิทยาลัย",
};

export default async function RegisterPage() {
  const universities = await getUniversities();

  return (
    <AuthLayout
      title="ลงทะเบียนใช้งานระบบ"
      subtitle="กรอกข้อมูลเพื่อส่งคำขอเข้าใช้งานระบบบริหารจัดการและแจ้งซ่อมเครื่องปรับอากาศ"
    >
      <RegisterForm universities={universities} />
    </AuthLayout>
  );
}

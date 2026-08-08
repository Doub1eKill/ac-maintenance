import { AuthLayout } from "@/components/auth/auth-layout";
import { RegisterForm } from "@/components/auth/register-form";
import { getUniversities } from "./actions";

export const metadata = {
  title: "สมัครสมาชิก | AC Maintenance System",
  description: "ลงทะเบียนเข้าใช้งานระบบบริหารจัดการและแจ้งซ่อมเครื่องปรับอากาศระดับมหาวิทยาลัย",
};

// The university dropdown is read from the database, so this page must not be
// baked at build time: a university added later would never appear until the
// next deploy, and a build that runs while the database is unreachable would
// ship a permanently empty dropdown.
export const dynamic = "force-dynamic";

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

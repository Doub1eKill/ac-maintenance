import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Clock, Building2, AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { ORGANISATION_NAME } from "@/lib/organisation";

export const metadata = {
  title: "รอการอนุมัติสิทธิ์ | AC Maintenance System",
  description: "บัญชีผู้ใช้ของคุณอยู่ระหว่างรอการอนุมัติสิทธิ์จากผู้ดูแลระบบมหาวิทยาลัย",
};

interface PendingApprovalPageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function PendingApprovalPage({ searchParams }: PendingApprovalPageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const emailRaw = resolvedParams.email;
  const email = typeof emailRaw === "string" ? emailRaw.toLowerCase().trim() : null;

  let userDetails = null;
  if (email) {
    try {
      userDetails = await prisma.user.findUnique({
        where: { email },
        select: { email: true, name: true },
      });
    } catch (err) {
      console.error("PendingApprovalPage user query error:", err);
    }
  }

  return (
    <AuthLayout
      title="อยู่ระหว่างรอการอนุมัติสิทธิ์"
      subtitle="บัญชีของคุณได้รับการลงทะเบียนในระบบเรียบร้อยแล้ว แต่อยู่ระหว่างการตรวจสอบสิทธิ์โดยผู้ดูแลระบบ"
    >
      <div className="space-y-6">
        {/* Status Card */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white font-bold shadow-sm">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-amber-950 text-sm">Account Pending Approval</h3>
              <p className="text-xs text-amber-800 font-medium">
                อยู่ระหว่างรอเจ้าหน้าที่สถาบันตรวจสอบสิทธิ์การใช้งาน
              </p>
            </div>
          </div>
        </div>

        {/* Registered User */}
        {userDetails && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
              ข้อมูลบัญชี
            </div>

            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">อีเมลผู้ใช้:</span>
                <span className="font-mono font-bold text-slate-900">{userDetails.email}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">ชื่อ-นามสกุล:</span>
                <span className="font-bold text-slate-900">{userDetails.name}</span>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-start gap-2 text-slate-900 font-bold">
                  <Building2 className="h-4 w-4 text-slate-700 shrink-0 mt-0.5" />
                  <span>{ORGANISATION_NAME}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Guidance Instructions */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2.5 text-xs text-slate-700">
          <div className="font-bold text-slate-950 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-sky-600" />
            <span>คำแนะนำเพิ่มเติม</span>
          </div>
          <ul className="list-disc list-inside space-y-1.5 text-slate-600 leading-relaxed pl-1">
            <li>เจ้าหน้าที่ประจำสถาบัน (`org_admin`) จะได้รับการแจ้งเพื่อตรวจสอบรายชื่อของคุณ</li>
            <li>หากเป็นกรณีงานซ่อมบำรุงด่วน สามารถติดต่อผ่านเบอร์โทรศัพท์ของมหาวิทยาลัยโดยตรง</li>
            <li>เมื่อได้รับการอนุมัติเรียบร้อยแล้ว คุณสามารถลงชื่อเข้าใช้งานด้วยอีเมลและรหัสผ่านได้ทันที</li>
          </ul>
        </div>

        {/* Navigation Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <Link
            href="/login"
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 font-bold text-xs text-white hover:bg-slate-800 transition-all shadow-md active:scale-[0.99]"
          >
            <RefreshCw className="h-4 w-4 text-white" />
            <span>ลองเข้าสู่ระบบอีกครั้ง (Re-check Status)</span>
          </Link>

          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 font-bold text-xs text-slate-700 hover:bg-slate-50 transition-all"
          >
            <ArrowLeft className="h-4 w-4 text-slate-500" />
            <span>กลับสู่หน้าหลัก</span>
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}

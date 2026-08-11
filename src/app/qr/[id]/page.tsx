import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { ArrowLeft, Clock, CalendarClock, Settings2, ShieldCheck, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default async function QRCodePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();

  if (!session?.user || session.user.status === 'pending') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center max-w-sm w-full">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-slate-900 mb-2">ไม่มีสิทธิ์เข้าถึง</h1>
          <p className="text-sm text-slate-500 mb-6">เฉพาะเจ้าหน้าที่และช่างซ่อมบำรุงที่เข้าสู่ระบบแล้วเท่านั้น จึงจะสามารถดูข้อมูลได้</p>
          <Link href="/login" className="block w-full bg-slate-900 text-white rounded-xl py-2.5 font-bold hover:bg-slate-800 transition-colors">
            เข้าสู่ระบบ
          </Link>
        </div>
      </div>
    );
  }

  const ac = await prisma.airConditioner.findUnique({
    where: { qrCode: params.id },
    include: {
      room: {
        include: { building: true }
      },
      acBrand: true,
      acModel: true,
      maintenanceLogs: {
        include: { technician: true },
        orderBy: { performedAt: 'desc' }
      },
      maintenanceSchedules: {
        where: { isActive: true },
        take: 1
      }
    }
  });

  if (!ac) {
    return notFound();
  }

  const activeSchedule = ac.maintenanceSchedules[0];

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <div className="bg-slate-900 text-white pb-16 pt-6 px-4">
        <div className="max-w-2xl mx-auto">
          <Link href={session.user.role === 'technician' ? '/tech' : '/admin'} className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors text-sm font-medium mb-6">
            <ArrowLeft className="w-4 h-4" /> กลับสู่หน้าหลัก
          </Link>
          <h1 className="text-2xl font-bold tracking-tight mb-2">ข้อมูลเครื่องปรับอากาศ</h1>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-white/20 rounded-lg font-mono text-sm tracking-widest font-bold">
              {ac.acCode}
            </div>
            <span className={`px-2.5 py-1 text-[10px] font-bold rounded-md ${ac.status === 'normal' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
              {ac.status === 'normal' ? 'ปกติ' : ac.status === 'needs_cleaning' ? 'รอการล้าง' : 'แจ้งซ่อม'}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-10 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Settings2 className="w-4 h-4" /> ข้อมูลทั่วไป
          </h2>
          <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
            <div>
              <p className="text-slate-500 text-xs mb-1">ยี่ห้อ</p>
              <p className="font-semibold text-slate-900">{ac.acBrand?.name || ac.brand || '-'}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-1">รุ่น</p>
              <p className="font-semibold text-slate-900">{ac.acModel?.name || ac.model || '-'}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-1">ขนาด (BTU)</p>
              <p className="font-semibold text-slate-900">{ac.btu ? ac.btu.toLocaleString() : '-'}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-1">สถานที่ตั้ง</p>
              <p className="font-semibold text-slate-900">{ac.room.building.name} ห้อง {ac.room.name}</p>
            </div>
          </div>
        </div>

        {activeSchedule && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <CalendarClock className="w-4 h-4" /> รอบบำรุงรักษา
            </h2>
            <div className="flex items-center justify-between p-3 bg-sky-50 border border-sky-100 rounded-xl">
              <div>
                <p className="text-xs text-sky-700 font-bold mb-0.5">ล้างทุกๆ {activeSchedule.frequencyValue} {activeSchedule.frequencyUnit === 'days' ? 'วัน' : activeSchedule.frequencyUnit === 'months' ? 'เดือน' : 'ปี'}</p>
                <p className="text-[11px] text-sky-600 font-medium">กำหนดครั้งถัดไป: {format(activeSchedule.nextDueDate, "d MMM yyyy", { locale: th })}</p>
              </div>
              <ShieldCheck className="w-8 h-8 text-sky-500 opacity-50" />
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" /> ประวัติการซ่อมบำรุง
          </h2>
          
          {ac.maintenanceLogs.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm">
              ยังไม่มีประวัติการซ่อมบำรุง
            </div>
          ) : (
            <div className="space-y-4">
              {ac.maintenanceLogs.map(log => (
                <div key={log.id.toString()} className="relative pl-6 border-l-2 border-slate-100 last:border-0 pb-4 last:pb-0">
                  <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-emerald-500"></div>
                  <div className="text-xs font-bold text-slate-900 mb-1">{log.action === 'cleaning' ? 'ล้างแอร์' : log.action === 'repair' ? 'ซ่อมแซม' : 'เติมน้ำยาแอร์'}</div>
                  <div className="text-[11px] text-slate-500 mb-2">{format(log.performedAt, "d MMM yyyy HH:mm", { locale: th })} • โดย {log.technician.name}</div>
                  {log.notes && (
                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">{log.notes}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

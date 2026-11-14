import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getMaintenanceHistory, inAppTimeZone } from "@/lib/maintenance";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { ArrowLeft, Clock, CalendarClock, Settings2, ShieldCheck, ClipboardPen, LogIn, Wind, Wrench } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { catalogueFlags } from "@/lib/catalogue-status";
import { CatalogueMark } from "@/components/shared/catalogue-mark";
import { EvidencePhotos } from "@/components/shared/evidence-photos";
import { MAINTENANCE_ACTION_LABEL, acStatusLabel } from "@/lib/labels";

// The status badge sits on the slate-900 banner, which stays dark in either
// theme, so it takes light text on a tint rather than AC_STATUS_TONE (built
// for the app's own light/dark cards). Same three colours: green, amber, red.
const STATUS_TONE_ON_DARK: Record<string, string> = {
  normal: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  needs_cleaning: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  broken: "bg-red-500/20 text-red-300 border-red-500/30",
};

/**
 * Reached by scanning the QR sticker on a unit, so it is deliberately
 * readable without signing in — anyone standing in front of the machine can
 * see what it is and what has been done to it. The qrCode in the URL is a
 * random uuid rather than the sequential acCode, so the page can only be
 * opened by someone who has the sticker (or the link) in hand.
 *
 * What a visitor sees is narrower than what staff see. The unit's own
 * picture, its details and the record of work — kind of work, when, what was
 * repaired — are for anyone; who did it, the notes they left and the
 * before/after photos are for signed-in staff (technicians see every unit's
 * full history here, as admins do; "my history" under /tech is the view that
 * is limited to their own visits). One page, one query, one flag.
 *
 * Recording work is a different matter and still requires an account:
 * logMaintenanceAction is guarded by verifyTechnician() regardless of how
 * the technician got here, so this page only decides which call to action to
 * show, never whether the write is allowed. A visitor's sign-in lands on
 * /tech?ac=<code> — the log form for this very unit — rather than back here,
 * since a technician who scanned the sticker came to record work, not to
 * read.
 */
export default async function QRCodePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  // The session, the unit and its history are independent reads, so they go
  // out together rather than one round trip to the database after another —
  // this is the page a guest waits on after scanning a sticker.
  const [session, ac, history] = await Promise.all([
    auth(),
    findUnit(params.id),
    // Same helper the asset manager's history panel uses, so the two views
    // can't drift apart in what they consider this unit's record.
    getMaintenanceHistory({ qrCode: params.id }),
  ]);
  const isSignedIn = Boolean(session?.user && session.user.status === "active");
  const isTechnician = isSignedIn && session!.user.role === "technician";

  if (!ac) {
    return notFound();
  }

  // Same rule as the ten places that go through a mapper in src/lib — see the
  // note on the select in findUnit, and catalogue-status.ts.
  const { brandDeleted, modelDeleted } = catalogueFlags(ac);

  const activeSchedule = ac.maintenanceSchedules[0];

  return (
    <main className="min-h-screen bg-slate-50 pb-12">
      <div className="bg-slate-900 text-white pb-16 pt-6 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Only shown to signed-in staff: someone who arrived by scanning
              the sticker has no dashboard to go "back" to. */}
          {isSignedIn && (
            <Link href={isTechnician ? '/tech' : '/admin'} className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors text-sm font-medium mb-6">
              <ArrowLeft className="w-4 h-4" /> กลับสู่หน้าหลัก
            </Link>
          )}
          <h1 className="text-2xl font-bold tracking-tight mb-2">ข้อมูลเครื่องปรับอากาศ</h1>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-white/20 rounded-lg font-mono text-sm tracking-widest font-bold">
              {ac.acCode}
            </div>
            <span className={`px-2.5 py-1 text-[10px] font-bold rounded-md border ${STATUS_TONE_ON_DARK[ac.status] ?? 'bg-white/10 text-slate-200 border-white/20'}`}>
              {acStatusLabel(ac.status)}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-10 space-y-4">
        {/* The unit's own picture first: it is what tells a visitor they are
            looking at the right page for the machine in front of them. Units
            registered before pictures existed show a placeholder until someone
            adds one from the edit form. */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {ac.photoUrl ? (
            <Image src={ac.photoUrl} alt={`เครื่องปรับอากาศ ${ac.acCode}`} fill sizes="(max-width: 672px) 100vw, 672px" className="object-cover" priority />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-500">
              <Wind className="h-12 w-12" />
              <span className="text-xs font-medium">ยังไม่มีรูปเครื่องนี้</span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Settings2 className="w-4 h-4" /> ข้อมูลทั่วไป
          </h2>
          <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
            <div>
              <p className="text-slate-500 text-xs mb-1">ยี่ห้อ</p>
              <p className="font-semibold text-slate-900">
                {ac.acBrand?.name || ac.brand || '-'}
                <CatalogueMark brandDeleted={brandDeleted} className="ml-1" />
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-1">รุ่น</p>
              <p className="font-semibold text-slate-900">
                {ac.acModel?.name || ac.model || '-'}
                <CatalogueMark modelDeleted={modelDeleted} className="ml-1" />
              </p>
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
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <CalendarClock className="w-4 h-4" /> รอบบำรุงรักษา
            </h2>
            <div className="flex items-center justify-between p-3 bg-sky-50 border border-sky-100 rounded-xl">
              <div>
                <p className="text-xs text-sky-700 font-bold mb-0.5">ล้างทุกๆ {activeSchedule.frequencyValue} {activeSchedule.frequencyUnit === 'days' ? 'วัน' : activeSchedule.frequencyUnit === 'months' ? 'เดือน' : 'ปี'}</p>
                <p className="text-[11px] text-sky-700 font-medium">กำหนดครั้งถัดไป: {format(inAppTimeZone(activeSchedule.nextDueDate), "d MMM yyyy", { locale: th })}</p>
              </div>
              <ShieldCheck className="w-8 h-8 text-sky-500 opacity-50" />
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" /> ประวัติการซ่อมบำรุง
          </h2>
          
          {history.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm">
              ยังไม่มีประวัติการซ่อมบำรุง
            </div>
          ) : (
            <div className="space-y-4">
              {history.map(log => (
                <div key={log.id} className="relative pl-6 border-l-2 border-slate-100 last:border-0 pb-4 last:pb-0">
                  <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-emerald-500"></div>
                  <div className="text-xs font-bold text-slate-900 mb-1">{MAINTENANCE_ACTION_LABEL[log.action]}</div>
                  <div className="text-[11px] text-slate-500 mb-2">
                    {format(inAppTimeZone(new Date(log.performedAt)), "d MMM yyyy HH:mm", { locale: th })}
                    {isSignedIn && <> • โดย {log.technicianName}</>}
                  </div>
                  {log.repairDetail && (
                    <div className="text-xs text-slate-700 flex items-start gap-1.5 mb-1.5">
                      <Wrench className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
                      <span>{log.repairDetail}</span>
                    </div>
                  )}
                  {isSignedIn && log.notes && (
                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">{log.notes}</div>
                  )}
                  {/* Evidence stays behind sign-in, as before; only the
                      form changed — thumbnails that open a lightbox instead
                      of links to the raw files. */}
                  {isSignedIn && (
                    <div className="mt-2">
                      <EvidencePhotos before={log.beforePhotoUrl} after={log.afterPhotoUrl} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recording work needs an account. A technician is sent to their
            workspace, where the existing logging flow lives; anyone else is
            sent to sign in. The action itself re-checks the role, so this is
            signposting rather than a gate. */}
        {isTechnician ? (
          // Carries the unit's code rather than its id: the technician view
          // already has scanQrCodeAction(acCode), which returns the unit and
          // any open job, so the receiving side needs no new backend to
          // pre-fill from this.
          <Link
            href={`/tech?ac=${encodeURIComponent(ac.acCode)}`}
            className="flex items-center justify-center gap-2 w-full bg-slate-900 text-white rounded-2xl py-3.5 font-bold hover:bg-slate-800 transition-colors shadow-sm"
          >
            <ClipboardPen className="w-4 h-4" />
            บันทึกงานซ่อมบำรุง
          </Link>
        ) : !isSignedIn ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 text-center">
            <LogIn className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <p className="text-sm text-slate-600 mb-4">
              หากคุณเป็นช่างซ่อมบำรุง เข้าสู่ระบบเพื่อบันทึกผลการปฏิบัติงานของเครื่องนี้ได้ทันที
            </p>
            {/* Straight to this unit's log form after signing in — see the
                note at the top of the file. An admin who signs in here is
                sent to /admin by the route guard instead. */}
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(`/tech?ac=${ac.acCode}`)}`}
              className="inline-flex items-center justify-center gap-2 w-full bg-slate-900 text-white rounded-xl py-2.5 font-bold hover:bg-slate-800 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              เข้าสู่ระบบสำหรับช่าง
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}

// The unit behind a sticker code, with what the page shows of it.
function findUnit(qrCode: string) {
  return prisma.airConditioner.findUnique({
    where: { qrCode },
    select: {
      id: true,
      acCode: true,
      brand: true,
      model: true,
      btu: true,
      status: true,
      photoUrl: true,
      room: {
        select: { name: true, building: { select: { name: true } } },
      },
      // deleted_at comes along so this page can mark a retired brand or model
      // like the other ten places do (backlog #4 phase 2). This is the only one
      // of the eleven that queries Prisma directly from the page instead of
      // going through a lib mapper, so there is no shape to add the flags to —
      // the markup calls catalogueFlags(ac) itself, from @/lib/catalogue-status,
      // rather than testing deletedAt inline and inventing a twelfth rule.
      acBrand: { select: { name: true, deletedAt: true } },
      acModel: { select: { name: true, deletedAt: true } },
      maintenanceSchedules: {
        where: { isActive: true },
        take: 1,
        select: { frequencyValue: true, frequencyUnit: true, nextDueDate: true },
      },
    }
  });
}

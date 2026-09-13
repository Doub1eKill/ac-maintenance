import React from "react";
import Link from "next/link";
import { Zap, ShieldCheck, Building2, Wrench } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="force-light flex min-h-screen w-full flex-col lg:flex-row bg-background text-foreground font-sans antialiased selection:bg-slate-900 selection:text-white">
      {/* Left Showcase Panel (BizLink Executive Warm Minimalist Style) */}
      <div className="relative hidden lg:flex lg:w-5/12 flex-col justify-between overflow-hidden bg-muted p-12 border-r border-border">
        {/* Brand Header */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white font-black shadow-md transition-transform duration-200 group-hover:scale-105">
              <Zap className="h-5 w-5 fill-white text-white" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-slate-950 block">AC Maintenance</span>
              <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase block">Enterprise Utility Platform</span>
            </div>
          </Link>
        </div>

        {/* Hero Central Showcase Card */}
        <div className="relative z-10 my-auto space-y-6 max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3.5 py-1 text-xs font-bold text-slate-800 shadow-2xs">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            Campus Maintenance Platform
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-slate-950 leading-tight">
            ระบบบริหารจัดการ & <br />
            <span className="text-slate-700">
              แจ้งซ่อมเครื่องปรับอากาศ
            </span>
          </h2>

          <p className="text-xs text-slate-600 leading-relaxed">
            แพลตฟอร์มติดตามสถานะแอร์แบบ Real-time และกระจายใบงานช่างซ่อมบำรุงประจำสถาบันที่สะดวกรวดเร็วและแม่นยำ
          </p>

          {/* Feature Cards */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1">
              <div className="text-slate-950 font-extrabold text-sm flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-slate-900" /> Real-Time
              </div>
              <div className="text-[11px] text-slate-500 font-medium">Work Order Dispatch</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1">
              <div className="text-slate-950 font-extrabold text-sm flex items-center gap-1.5">
                <Wrench className="h-4 w-4 text-slate-900" /> Mobile-First
              </div>
              <div className="text-[11px] text-slate-500 font-medium">Technician Workspace</div>
            </div>
          </div>
        </div>

        {/* Hero Footer */}
        <div className="relative z-10 text-xs text-slate-400 flex items-center justify-between border-t border-slate-200/80 pt-6">
          <span>&copy; {new Date().getFullYear()} AC Maintenance System</span>
          <span>v1.0 • Executive SaaS Edition</span>
        </div>
      </div>

      {/* Right Form Container Area */}
      <div className="flex flex-1 flex-col justify-between p-6 sm:p-12 lg:w-7/12 bg-background">
        {/* Mobile Header Logo */}
        <div className="flex items-center justify-between lg:hidden mb-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white font-bold shadow-md">
              <Zap className="h-5 w-5 fill-white" />
            </div>
            <span className="text-lg font-extrabold text-slate-950">AC Maintenance</span>
          </Link>
        </div>

        {/* Center Form Container Box */}
        <div className="mx-auto my-auto w-full max-w-md space-y-6">
          <div className="space-y-1.5 text-left">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">{title}</h1>
            <p className="text-xs font-medium text-slate-500">{subtitle}</p>
          </div>

          <div className="biz-card p-6 sm:p-8 shadow-xs">
            {children}
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center text-xs text-slate-400 font-medium">
          ต้องการความช่วยเหลือ? ติดต่อผู้ดูแลระบบมหาวิทยาลัยของคุณ
        </div>
      </div>
    </div>
  );
}

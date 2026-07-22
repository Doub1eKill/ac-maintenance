import React from "react";
import Link from "next/link";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row bg-slate-950 text-slate-100 font-sans antialiased selection:bg-sky-500 selection:text-white">
      {/* Left Hero Panel (Visual Showcase & Brand Identity) */}
      <div className="relative hidden lg:flex lg:w-5/12 flex-col justify-between overflow-hidden bg-gradient-to-br from-sky-900 via-slate-900 to-slate-950 p-12 border-r border-slate-800/80">
        {/* Background Decorative Glows */}
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-25" />

        {/* Brand Header */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-400 text-slate-950 font-black shadow-lg shadow-sky-500/25 transition-transform duration-200 group-hover:scale-105">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white block">AC Maintenance</span>
              <span className="text-xs font-medium text-sky-300/80 tracking-widest uppercase block">Enterprise Utility Platform</span>
            </div>
          </Link>
        </div>

        {/* Hero Central Showcase Card */}
        <div className="relative z-10 my-auto space-y-6 max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-3.5 py-1 text-xs font-medium text-sky-300 backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
            Multi-Tenant Campus Asset Platform
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
            ระบบบริหารจัดการ & <br />
            <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-teal-300 bg-clip-text text-transparent">
              แจ้งซ่อมเครื่องปรับอากาศ
            </span>
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed">
            แพลตฟอร์มการติดตามสถานะเครื่องปรับอากาศแบบ Real-time และการจ่ายงานช่างซ่อมบำรุงระดับมหาวิทยาลัยที่สะดวกรวดเร็ว
          </p>

          {/* Feature Micro-Badges */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 backdrop-blur-md">
              <div className="text-sky-400 font-bold text-lg mb-0.5">Real-Time</div>
              <div className="text-xs text-slate-400">Work Order Dispatch</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 backdrop-blur-md">
              <div className="text-cyan-400 font-bold text-lg mb-0.5">Mobile-First</div>
              <div className="text-xs text-slate-400">One-Hand Technician UI</div>
            </div>
          </div>
        </div>

        {/* Hero Footer */}
        <div className="relative z-10 text-xs text-slate-500 flex items-center justify-between border-t border-slate-800/80 pt-6">
          <span>&copy; {new Date().getFullYear()} AC Maintenance System</span>
          <span>v1.0 • Enterprise Edition</span>
        </div>
      </div>

      {/* Right Form Container Area */}
      <div className="flex flex-1 flex-col justify-between p-6 sm:p-12 lg:w-7/12 bg-slate-950">
        {/* Mobile Header Logo */}
        <div className="flex items-center justify-between lg:hidden mb-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500 text-slate-950 font-bold">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-white">AC Maintenance</span>
          </Link>
        </div>

        {/* Center Content Box */}
        <div className="mx-auto my-auto w-full max-w-md space-y-6">
          <div className="space-y-1.5 text-left">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{title}</h1>
            <p className="text-sm text-slate-400">{subtitle}</p>
          </div>

          <div className="rounded-2xl border border-slate-800/90 bg-slate-900/60 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            {children}
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center text-xs text-slate-500">
          ต้องการความช่วยเหลือ? ติดต่อผู้ดูแลระบบมหาวิทยาลัยของคุณ
        </div>
      </div>
    </div>
  );
}

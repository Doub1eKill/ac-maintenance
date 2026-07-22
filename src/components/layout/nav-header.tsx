"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Zap, Building2, LogOut, ShieldCheck, Wrench, UserCheck } from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";

interface NavHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
    universityName?: string | null;
  };
}

export function NavHeader({ user }: NavHeaderProps) {
  const roleBadgeColor =
    user.role === "super_admin"
      ? "border-purple-500/30 bg-purple-500/10 text-purple-300"
      : user.role === "org_admin"
      ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";

  const roleLabel =
    user.role === "super_admin"
      ? "Super Admin (ส่วนกลาง)"
      : user.role === "org_admin"
      ? "Org Admin (มหาวิทยาลัย)"
      : "ช่างเทคนิค (Technician)";

  const RoleIcon =
    user.role === "super_admin"
      ? ShieldCheck
      : user.role === "org_admin"
      ? UserCheck
      : Wrench;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Workspace Identity */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-400 text-slate-950 font-black shadow-md shadow-sky-500/20 transition-transform group-hover:scale-105">
              <AnimatedIcon icon={Zap} size={20} animation="spin" className="text-slate-950 fill-slate-950" />
            </div>
            <span className="text-base sm:text-lg font-bold tracking-tight text-white group-hover:text-sky-400 transition-colors">
              AC Maintenance
            </span>
          </Link>

          {/* Role Pill */}
          <span className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${roleBadgeColor}`}>
            <AnimatedIcon icon={RoleIcon} size={14} animation="bounce" />
            {roleLabel}
          </span>
        </div>

        {/* Right User Status & Actions */}
        <div className="flex items-center gap-3">
          {user.universityName && (
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-slate-400 border-r border-slate-800 pr-3">
              <AnimatedIcon icon={Building2} size={14} animation="lift" className="text-slate-500" />
              {user.universityName}
            </span>
          )}

          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-white">{user.name || "ผู้ใช้งาน"}</div>
            <div className="text-[10px] text-slate-400">{user.email}</div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 transition-all shadow-sm group"
          >
            <AnimatedIcon icon={LogOut} size={14} animation="wiggle" className="group-hover:text-red-400" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </div>
    </header>
  );
}

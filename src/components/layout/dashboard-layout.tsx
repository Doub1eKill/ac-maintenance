"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  Zap,
  Building2,
  LogOut,
  ShieldCheck,
  Wrench,
  UserCheck,
  Menu,
  X,
  LucideIcon,
  ChevronRight,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Plus,
  User,
  Users,
} from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  description?: string;
}

interface DashboardLayoutProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
    universityName?: string | null;
  };
  activeTab: string;
  setActiveTab: (tab: string) => void;
  navItems: NavItem[];
  onCreateAction?: () => void;
  createActionLabel?: string;
  searchPlaceholder?: string;
  onSearchChange?: (val: string) => void;
  searchValue?: string;
  children: React.ReactNode;
}

export function DashboardLayout({
  user,
  activeTab,
  setActiveTab,
  navItems,
  onCreateAction,
  createActionLabel = "+ เพิ่มรายการ",
  searchPlaceholder = "ค้นหารายการ...",
  onSearchChange,
  searchValue = "",
  children,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const roleBadgeColor =
    user.role === "super_admin"
      ? "bg-purple-100 text-purple-800 border-purple-200"
      : user.role === "org_admin"
      ? "bg-sky-100 text-sky-800 border-sky-200"
      : "bg-emerald-100 text-emerald-800 border-emerald-200";

  const roleLabel =
    user.role === "super_admin"
      ? "Platform Super Admin"
      : user.role === "org_admin"
      ? "Org Administrator"
      : "Field Technician";

  const RoleIcon =
    user.role === "super_admin"
      ? ShieldCheck
      : user.role === "org_admin"
      ? UserCheck
      : Wrench;

  const currentNav = navItems.find((item) => item.id === activeTab) || navItems[0];

  return (
    <div className="min-h-screen bg-[#f7f7f2] text-slate-900 flex flex-col lg:flex-row selection:bg-slate-900 selection:text-white">
      {/* Mobile Header Bar */}
      <header className="lg:hidden sticky top-0 z-40 w-full border-b border-slate-200/90 bg-white/90 backdrop-blur-md px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-700 hover:text-slate-950 focus:outline-none"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-950 text-white font-black">
              <Zap className="h-4 w-4 fill-white" />
            </div>
            <span className="font-extrabold text-sm text-slate-950 tracking-tight">AC Maintenance</span>
          </div>
        </div>

        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${roleBadgeColor}`}>
          <RoleIcon className="h-3 w-3" />
          {roleLabel}
        </span>
      </header>

      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs lg:hidden animate-in fade-in"
        />
      )}

      {/* Left Sidebar (BizLink Style) */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 shrink-0 border-r border-slate-200/90 bg-white p-5 flex flex-col justify-between transition-transform duration-300 ease-in-out shadow-xs ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="space-y-6 overflow-y-auto pr-1">
          {/* Brand Logo */}
          <div className="flex items-center justify-between pb-2">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white font-black shadow-md group-hover:scale-105 transition-transform">
                <Zap className="h-5 w-5 fill-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-extrabold tracking-tight text-slate-950 group-hover:text-slate-700 transition-colors">
                  AC Maintenance
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Enterprise System
                </span>
              </div>
            </Link>
          </div>

          {/* Main Navigation List */}
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-slate-100 text-slate-950 font-bold shadow-2xs"
                      : "text-slate-600 hover:text-slate-950 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${isActive ? "text-slate-950" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Secondary Group: Tenant Info */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
              สังกัดสถาบัน (Institution)
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 flex items-center gap-2.5">
              <Building2 className="h-4 w-4 text-slate-500 shrink-0" />
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {user.universityName || "Platform Central System"}
                </div>
                <div className="text-[10px] text-slate-500 truncate">{roleLabel}</div>
              </div>
            </div>
          </div>
        </div>

        {/* User Footer Card */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-800 text-xs">
              {user.name ? user.name.slice(0, 2).toUpperCase() : "US"}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-slate-950 truncate">{user.name || "ผู้ใช้งาน"}</div>
              <div className="text-[10px] text-slate-500 truncate">{user.email}</div>
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="ออกจากระบบ"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Search & Filter Utility Header (BizLink Top Bar) */}
        <header className="sticky top-0 z-30 w-full border-b border-slate-200/80 bg-[#f4f4ee]/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-none shadow-2xs"
            />
          </div>

          {/* Action Tools */}
          <div className="flex items-center justify-end gap-2.5 shrink-0">
            <button className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
              <span>Sort by</span>
            </button>

            <button className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs">
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
              <span>Filters</span>
            </button>

            {onCreateAction && (
              <button
                onClick={onCreateAction}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-all shadow-md active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>{createActionLabel}</span>
              </button>
            )}
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 pb-20 lg:pb-8">
          {/* Mobile Horizontal Sub-Tab Bar for quick navigation on small screens */}
          <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200/80 -mx-4 px-4 sm:mx-0 sm:px-0">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                    isActive
                      ? "bg-slate-950 text-white shadow-xs"
                      : "bg-white text-slate-700 border border-slate-200"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                        isActive ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}

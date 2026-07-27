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
  LucideIcon,
  Search,
  Plus,
  User,
  Settings,
  Bell,
  ChevronsUpDown,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  description?: string;
  group?: string;
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
  const roleLabel =
    user.role === "super_admin"
      ? "ผู้ดูแลระบบสูงสุด"
      : user.role === "org_admin"
      ? "ผู้บริหารองค์กร"
      : "ช่างซ่อมบำรุง";

  const currentNav = navItems.find((item) => item.id === activeTab) || navItems[0];

  const groupOrder = Array.from(new Set(navItems.map(item => item.group || "เมนูทั่วไป")));
  const groupedNavItems = groupOrder.map(groupName => ({
    groupName,
    items: navItems.filter(item => (item.group || "เมนูทั่วไป") === groupName)
  }));

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-border bg-sidebar text-sidebar-foreground">
        <SidebarHeader className="border-b border-border/50">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/" className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black shadow-xs shrink-0">
                    <Zap className="h-5 w-5 fill-current" />
                  </div>
                  <div className="grid flex-1 text-left overflow-hidden">
                    <span className="text-sm font-extrabold tracking-tight truncate">
                      ระบบซ่อมบำรุงแอร์
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                      {user.universityName || "ระบบองค์กร"}
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          {groupedNavItems.map(({ groupName, items }) => (
            <SidebarGroup key={groupName}>
              <SidebarGroupLabel className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {groupName}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const isActive = activeTab === item.id;
                    const Icon = item.icon;
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setActiveTab(item.id)}
                          tooltip={item.label}
                          className="w-full justify-between"
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className="h-4 w-4" />
                            <span className="font-semibold text-xs">{item.label}</span>
                          </div>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                              {item.badge}
                            </span>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="border-t border-border/50">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-xs">
                      {user.name ? user.name.slice(0, 2).toUpperCase() : "US"}
                    </div>
                    <div className="grid flex-1 text-left text-xs leading-tight">
                      <span className="truncate font-bold">{user.name || "ผู้ใช้งาน"}</span>
                      <span className="truncate text-[10px] text-muted-foreground">{roleLabel}</span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-56 rounded-xl border-border bg-popover p-2 shadow-lg"
                  side="right"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-xs font-bold leading-none">{user.name || "ผู้ใช้งาน"}</p>
                      <p className="text-[11px] leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem className="rounded-lg text-xs font-medium cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>โปรไฟล์ส่วนตัว</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="rounded-lg text-xs font-medium cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>ตั้งค่าระบบ</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="rounded-lg text-xs font-medium text-destructive focus:text-destructive cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>ออกจากระบบ</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-w-0 bg-background">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 h-4 self-center" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbPage className="text-xs font-medium text-muted-foreground">
                    {user.universityName || "ระบบส่วนกลาง"}
                  </BreadcrumbPage>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-xs font-bold text-foreground">
                    {currentNav?.label}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {onSearchChange && (
              <div className="relative w-48 sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-muted/50 border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                />
              </div>
            )}
            {onCreateAction && (
              <button
                onClick={onCreateAction}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3.5 py-1.5 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity shadow-xs shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{createActionLabel}</span>
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

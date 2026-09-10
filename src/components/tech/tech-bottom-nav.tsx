"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Wrench, QrCode, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface TechBottomNavProps {
  badges: {
    jobPool: number;
    myJobs: number;
  };
  onScanQr: () => void;
}

export function TechBottomNav({ badges, onScanQr }: TechBottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="เมนูนำทางสำหรับอุปกรณ์พกพา"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border shadow-lg px-2 pt-1 pb-[max(env(safe-area-inset-bottom),0.5rem)]"
    >
      <div className="grid grid-cols-5 items-center justify-items-center h-14 max-w-lg mx-auto">
        {/* 1. Job Pool */}
        <Link
          href="/tech"
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 w-full h-full text-[10px] font-medium transition-colors relative",
            pathname === "/tech"
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <div className="relative">
            <ClipboardList className="w-5 h-5" />
            {badges.jobPool > 0 && (
              <span className="absolute -top-1.5 -right-2 px-1 py-0.2 min-w-[14px] h-[14px] rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center">
                {badges.jobPool > 99 ? "99+" : badges.jobPool}
              </span>
            )}
          </div>
          <span>คลังงาน</span>
        </Link>

        {/* 2. My Jobs */}
        <Link
          href="/tech/my-jobs"
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 w-full h-full text-[10px] font-medium transition-colors relative",
            pathname === "/tech/my-jobs"
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <div className="relative">
            <Wrench className="w-5 h-5" />
            {badges.myJobs > 0 && (
              <span className="absolute -top-1.5 -right-2 px-1 py-0.2 min-w-[14px] h-[14px] rounded-full bg-amber-500 text-[9px] font-bold text-white flex items-center justify-center">
                {badges.myJobs > 99 ? "99+" : badges.myJobs}
              </span>
            )}
          </div>
          <span>งานของฉัน</span>
        </Link>

        {/* 3. Center QR Scan Button */}
        <div className="flex flex-col items-center justify-center -mt-5">
          <button
            type="button"
            onClick={onScanQr}
            className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg border-4 border-card hover:scale-105 active:scale-95 transition-transform"
            aria-label="สแกน QR Code"
          >
            <QrCode className="w-6 h-6" />
          </button>
          <span className="text-[10px] font-bold text-foreground mt-0.5">สแกน QR</span>
        </div>

        {/* 4. Calendar */}
        <Link
          href="/tech/calendar"
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 w-full h-full text-[10px] font-medium transition-colors",
            pathname === "/tech/calendar"
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Calendar className="w-5 h-5" />
          <span>ปฏิทิน</span>
        </Link>

        {/* 5. Profile */}
        <Link
          href="/tech/profile"
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 w-full h-full text-[10px] font-medium transition-colors",
            pathname === "/tech/profile"
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <User className="w-5 h-5" />
          <span>โปรไฟล์</span>
        </Link>
      </div>
    </nav>
  );
}

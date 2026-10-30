"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Wrench, QrCode, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { MotionActivePill } from "@/components/ui/motion";
import { motion } from "motion/react";

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
          {pathname === "/tech" && (
            <MotionActivePill
              layoutId="tech-bottom-nav-pill"
              className="absolute inset-x-1 inset-y-1 bg-primary/10 rounded-xl -z-10"
            />
          )}
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
          {pathname === "/tech/my-jobs" && (
            <MotionActivePill
              layoutId="tech-bottom-nav-pill"
              className="absolute inset-x-1 inset-y-1 bg-primary/10 rounded-xl -z-10"
            />
          )}
          <div className="relative">
            <Wrench className="w-5 h-5" />
            {badges.myJobs > 0 && (
              <span className="absolute -top-1.5 -right-2 px-1 py-0.2 min-w-[14px] h-[14px] rounded-full bg-amber-700 text-[9px] font-bold text-white flex items-center justify-center">
                {badges.myJobs > 99 ? "99+" : badges.myJobs}
              </span>
            )}
          </div>
          <span>งานของฉัน</span>
        </Link>

        {/* 3. Center QR Scan Button */}
        <div className="flex flex-col items-center justify-center -mt-5">
          <motion.button
            type="button"
            onClick={onScanQr}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg border-4 border-card cursor-pointer"
            aria-label="สแกน QR Code"
          >
            <QrCode className="w-6 h-6" />
          </motion.button>
          <span className="text-[10px] font-bold text-foreground mt-0.5">สแกน QR</span>
        </div>

        {/* 4. Calendar */}
        <Link
          href="/tech/calendar"
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 w-full h-full text-[10px] font-medium transition-colors relative",
            pathname === "/tech/calendar"
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {pathname === "/tech/calendar" && (
            <MotionActivePill
              layoutId="tech-bottom-nav-pill"
              className="absolute inset-x-1 inset-y-1 bg-primary/10 rounded-xl -z-10"
            />
          )}
          <Calendar className="w-5 h-5" />
          <span>ปฏิทิน</span>
        </Link>

        {/* 5. Profile */}
        <Link
          href="/tech/profile"
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 w-full h-full text-[10px] font-medium transition-colors relative",
            pathname === "/tech/profile"
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {pathname === "/tech/profile" && (
            <MotionActivePill
              layoutId="tech-bottom-nav-pill"
              className="absolute inset-x-1 inset-y-1 bg-primary/10 rounded-xl -z-10"
            />
          )}
          <User className="w-5 h-5" />
          <span>โปรไฟล์</span>
        </Link>
      </div>
    </nav>
  );
}

"use client";

import dynamic from "next/dynamic";
import { Clock } from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";

const MaintenanceCalendar = dynamic(
  () => import("@/components/shared/maintenance-calendar").then((m) => m.MaintenanceCalendar),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-card">
        <AnimatedIcon icon={Clock} size={24} animation="spin" className="text-primary" />
      </div>
    ),
  }
);

export function TechCalendarClient() {
  return (
    <div className="animate-in fade-in">
      <MaintenanceCalendar />
    </div>
  );
}

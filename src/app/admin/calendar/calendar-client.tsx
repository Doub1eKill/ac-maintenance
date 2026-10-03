"use client";

import dynamic from "next/dynamic";
import { Clock } from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { useCreateWorkOrder } from "@/components/admin/create-work-order-provider";

// Pulls in date-fns and its Thai locale of its own, so it stays a separate
// chunk that only this page pays for.
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

export function CalendarClient() {
  const createWorkOrder = useCreateWorkOrder();
  return <MaintenanceCalendar onCreateWorkOrder={createWorkOrder.openForUnit} />;
}

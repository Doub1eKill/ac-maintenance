"use client";

import { useState, useEffect } from "react";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays,
  isBefore,
  differenceInDays,
  startOfDay
} from "date-fns";
import { th } from "date-fns/locale";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  Wrench,
  AlertTriangle,
  X
} from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";

interface Schedule {
  id: string;
  airConditionerId: string;
  acCode: string;
  brand: string;
  location: string;
  frequencyValue: number;
  frequencyUnit: string;
  lastPerformedAt: string | null;
  lastPerformedByName: string | null;
  nextDueDate: string;
  isActive: boolean;
}

function formatFrequencyLabel(value: number, unit: string) {
  const unitLabel = unit === "days" ? "วัน" : unit === "years" ? "ปี" : "เดือน";
  return `ทุก ${value} ${unitLabel}`;
}

interface MaintenanceCalendarProps {
  // Omit to render a read-only calendar (e.g. the technician view, which has
  // no work-order-creation action of its own).
  onCreateWorkOrder?: (acId: string) => void;
}

export function MaintenanceCalendar({ onCreateWorkOrder }: MaintenanceCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Schedule | null>(null);

  useEffect(() => {
    async function fetchSchedules() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/admin/maintenance-schedules');
        if (res.ok) {
          const data = await res.json();
          setSchedules(data);
        }
      } catch (error) {
        console.error("Failed to fetch schedules", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSchedules();
  }, []);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const today = startOfDay(new Date());

  const getEventStatus = (dueDate: Date) => {
    const daysDiff = differenceInDays(dueDate, today);
    if (daysDiff < 0) return "overdue";
    if (daysDiff <= 7) return "warning";
    return "upcoming";
  };

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between py-3 px-6 border-b border-border bg-white rounded-t-2xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary rounded-lg border border-primary/20">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {format(currentMonth, "MMMM yyyy", { locale: th })}
            </h2>
            <p className="text-xs text-muted-foreground font-medium">ปฏิทินรอบล้างแอร์ประจำเดือน</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-muted p-1 rounded-xl border border-border">
          <button 
            onClick={prevMonth}
            className="p-1.5 hover:bg-white rounded-lg text-muted-foreground hover:text-foreground transition-colors hover:shadow-sm"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button 
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1.5 text-xs font-bold text-foreground hover:bg-white rounded-lg transition-colors hover:shadow-sm"
          >
            วันนี้
          </button>
          <button 
            onClick={nextMonth}
            className="p-1.5 hover:bg-white rounded-lg text-muted-foreground hover:text-foreground transition-colors hover:shadow-sm"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const startDate = startOfWeek(currentMonth);

    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} className="text-center py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider bg-muted border-b border-border">
          {format(addDays(startDate, i), "EEEE", { locale: th })}
        </div>
      );
    }
    return <div className="grid grid-cols-7 shrink-0">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;
        
        // Find schedules for this day
        const dayEvents = schedules.filter(s => isSameDay(new Date(s.nextDueDate), cloneDay));
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isTodayDate = isSameDay(day, today);

        days.push(
          <div
            key={day.toString()}
            className={`h-full flex flex-col border-b border-r border-border p-2 transition-all ${
              !isCurrentMonth ? "bg-muted/50 text-muted-foreground" : "bg-white hover:bg-muted"
            }`}
          >
            <div className="flex justify-between items-start shrink-0">
              <span className={`text-xs font-bold flex h-6 w-6 items-center justify-center rounded-full ${
                isTodayDate ? "bg-primary text-white shadow-md" : "text-foreground"
              }`}>
                {formattedDate}
              </span>
              {dayEvents.length > 0 && (
                <span className="text-[10px] font-bold text-muted-foreground">
                  {dayEvents.length} รายการ
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-col gap-1 overflow-y-auto flex-1 min-h-0 no-scrollbar">
              {dayEvents.map((event) => {
                const status = getEventStatus(new Date(event.nextDueDate));
                let badgeClass = "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20";
                if (status === "overdue") badgeClass = "bg-red-50 text-red-700 border-red-100 hover:bg-red-100";
                if (status === "warning") badgeClass = "bg-warning/10 text-warning-foreground border-warning/20 hover:bg-warning/20";

                return (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={`cursor-pointer border px-1.5 py-1 rounded-md text-[10px] font-semibold flex items-center justify-between truncate transition-colors ${badgeClass}`}
                  >
                    <span className="truncate">{event.acCode}</span>
                    {status === "overdue" && <AlertTriangle className="h-3 w-3 shrink-0 ml-1" />}
                  </div>
                );
              })}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7 flex-1 min-h-0" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="border-l border-border flex-1 min-h-0 flex flex-col">{rows}</div>;
  };

  const renderEventModal = () => {
    if (!selectedEvent) return null;
    const status = getEventStatus(new Date(selectedEvent.nextDueDate));

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-xs p-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-white shadow-xl animate-in fade-in zoom-in-95">
          <div className="p-5 border-b border-border flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" />
                ข้อมูลรอบบำรุงรักษา
              </h3>
              <p className="text-xs text-muted-foreground font-medium">รหัสเครื่อง: {selectedEvent.acCode}</p>
            </div>
            <button onClick={() => setSelectedEvent(null)} className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="p-5 space-y-4">
            <div className="bg-muted p-3 rounded-xl border border-border space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">สถานที่</span>
                <span className="font-bold text-foreground text-xs">{selectedEvent.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">ยี่ห้อ</span>
                <span className="font-bold text-foreground text-xs">{selectedEvent.brand}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">ความถี่การล้าง</span>
                <span className="font-bold text-foreground text-xs">{formatFrequencyLabel(selectedEvent.frequencyValue, selectedEvent.frequencyUnit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">ทำล่าสุดโดย</span>
                <span className="font-bold text-foreground text-xs">{selectedEvent.lastPerformedByName ?? "ยังไม่เคยดำเนินการ"}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border mt-2">
                <span className="text-muted-foreground text-xs font-bold">กำหนดรอบถัดไป</span>
                <span className={`font-bold text-xs ${
                  status === "overdue" ? "text-red-600" : status === "warning" ? "text-warning" : "text-primary"
                }`}>
                  {format(new Date(selectedEvent.nextDueDate), "dd MMM yyyy", { locale: th })}
                </span>
              </div>
            </div>

            {onCreateWorkOrder && (
              <button
                onClick={() => {
                  onCreateWorkOrder(selectedEvent.airConditionerId);
                  setSelectedEvent(null);
                }}
                className="w-full flex items-center justify-center gap-2 bg-foreground text-white font-bold text-xs py-2.5 rounded-xl hover:bg-primary/90 transition-colors"
              >
                <Wrench className="h-3.5 w-3.5" />
                สร้างใบงานซ่อมบำรุงตอนนี้
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="biz-card relative animate-in fade-in shadow-sm rounded-2xl overflow-hidden bg-white border border-border flex flex-col h-[600px]">
      {isLoading && (
        <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-sm flex items-center justify-center">
          <AnimatedIcon icon={Clock} size={24} animation="spin" className="text-primary" />
        </div>
      )}
      {renderHeader()}
      {renderDays()}
      {renderCells()}
      {renderEventModal()}
    </div>
  );
}

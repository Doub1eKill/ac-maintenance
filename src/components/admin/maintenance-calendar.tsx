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
  frequencyMonths: number;
  lastPerformedAt: string | null;
  nextDueDate: string;
  isActive: boolean;
}

interface MaintenanceCalendarProps {
  onCreateWorkOrder: (acId: string) => void;
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
      <div className="flex items-center justify-between py-4 px-6 border-b border-slate-100 bg-white rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {format(currentMonth, "MMMM yyyy", { locale: th })}
            </h2>
            <p className="text-xs text-slate-500 font-medium">ปฏิทินรอบล้างแอร์ประจำเดือน</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
          <button 
            onClick={prevMonth}
            className="p-1.5 hover:bg-white rounded-lg text-slate-500 hover:text-slate-900 transition-colors hover:shadow-sm"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button 
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-white rounded-lg transition-colors hover:shadow-sm"
          >
            วันนี้
          </button>
          <button 
            onClick={nextMonth}
            className="p-1.5 hover:bg-white rounded-lg text-slate-500 hover:text-slate-900 transition-colors hover:shadow-sm"
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
        <div key={i} className="text-center py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
          {format(addDays(startDate, i), "EEEE", { locale: th })}
        </div>
      );
    }
    return <div className="grid grid-cols-7">{days}</div>;
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
            className={`min-h-[100px] border-b border-r border-slate-100 p-2 transition-all ${
              !isCurrentMonth ? "bg-slate-50/50 text-slate-300" : "bg-white hover:bg-slate-50"
            }`}
          >
            <div className="flex justify-between items-start">
              <span className={`text-xs font-bold flex h-6 w-6 items-center justify-center rounded-full ${
                isTodayDate ? "bg-indigo-600 text-white shadow-md" : "text-slate-700"
              }`}>
                {formattedDate}
              </span>
              {dayEvents.length > 0 && (
                <span className="text-[10px] font-bold text-slate-400">
                  {dayEvents.length} รายการ
                </span>
              )}
            </div>
            
            <div className="mt-2 flex flex-col gap-1 overflow-y-auto max-h-[80px] no-scrollbar">
              {dayEvents.map((event) => {
                const status = getEventStatus(new Date(event.nextDueDate));
                let badgeClass = "bg-sky-50 text-sky-700 border-sky-100 hover:bg-sky-100";
                if (status === "overdue") badgeClass = "bg-red-50 text-red-700 border-red-100 hover:bg-red-100";
                if (status === "warning") badgeClass = "bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100";

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
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="border-l border-slate-100">{rows}</div>;
  };

  const renderEventModal = () => {
    if (!selectedEvent) return null;
    const status = getEventStatus(new Date(selectedEvent.nextDueDate));

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-xl animate-in fade-in zoom-in-95">
          <div className="p-5 border-b border-slate-100 flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                <Wrench className="h-5 w-5 text-indigo-500" />
                ข้อมูลรอบบำรุงรักษา
              </h3>
              <p className="text-xs text-slate-500 font-medium">รหัสเครื่อง: {selectedEvent.acCode}</p>
            </div>
            <button onClick={() => setSelectedEvent(null)} className="p-1 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="p-5 space-y-4">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 text-xs">สถานที่</span>
                <span className="font-bold text-slate-900 text-xs">{selectedEvent.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-xs">ยี่ห้อ</span>
                <span className="font-bold text-slate-900 text-xs">{selectedEvent.brand}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-xs">ความถี่การล้าง</span>
                <span className="font-bold text-slate-900 text-xs">ทุก {selectedEvent.frequencyMonths} เดือน</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 mt-2">
                <span className="text-slate-500 text-xs font-bold">กำหนดรอบถัดไป</span>
                <span className={`font-bold text-xs ${
                  status === "overdue" ? "text-red-600" : status === "warning" ? "text-amber-600" : "text-sky-600"
                }`}>
                  {format(new Date(selectedEvent.nextDueDate), "dd MMM yyyy", { locale: th })}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                onCreateWorkOrder(selectedEvent.airConditionerId);
                setSelectedEvent(null);
              }}
              className="w-full flex items-center justify-center gap-2 bg-slate-950 text-white font-bold text-xs py-2.5 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <Wrench className="h-3.5 w-3.5" />
              สร้างใบงานซ่อมบำรุงตอนนี้
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="biz-card relative animate-in fade-in shadow-sm rounded-2xl overflow-hidden bg-white border border-slate-200">
      {isLoading && (
        <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-sm flex items-center justify-center">
          <AnimatedIcon icon={Clock} size={24} animation="spin" className="text-indigo-500" />
        </div>
      )}
      {renderHeader()}
      {renderDays()}
      {renderCells()}
      {renderEventModal()}
    </div>
  );
}

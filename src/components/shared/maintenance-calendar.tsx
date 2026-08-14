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
  Building2,
  X
} from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";

interface Schedule {
  id: string;
  airConditionerId: string;
  acCode: string;
  brand: string;
  location: string;
  buildingId: string;
  buildingName: string;
  roomName: string;
  frequencyValue: number;
  frequencyUnit: string;
  lastPerformedAt: string | null;
  lastPerformedByName: string | null;
  nextDueDate: string;
  isActive: boolean;
  jobType: "repair" | "cleaning";
}

// Beyond this many jobs, a day cell lists buildings instead of individual
// jobs — otherwise the cell overflows into an unreadable scroll of pills.
const DAY_GROUP_THRESHOLD = 4;

const JOB_TYPE_LABEL: Record<Schedule["jobType"], string> = {
  repair: "งานซ่อม",
  cleaning: "งานล้าง",
};

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
  const [selectedDayBuilding, setSelectedDayBuilding] = useState<{
    date: Date;
    buildingName: string;
    jobs: Schedule[];
  } | null>(null);

  useEffect(() => {
    async function fetchSchedules() {
      setIsLoading(true);
      try {
        // The grid shows the leading/trailing days of neighboring months
        // too, so the fetched range covers the full visible grid, not just
        // the strict calendar month — otherwise events on those edge days
        // would silently vanish.
        const gridStart = startOfWeek(startOfMonth(currentMonth));
        const gridEnd = endOfWeek(endOfMonth(currentMonth));
        const params = new URLSearchParams({
          start: format(gridStart, "yyyy-MM-dd"),
          end: format(gridEnd, "yyyy-MM-dd"),
        });
        const res = await fetch(`/api/admin/maintenance-schedules?${params}`);
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
  }, [currentMonth]);

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
              {dayEvents.length > DAY_GROUP_THRESHOLD ? (
                // Too many to list one-by-one in a day cell — group by
                // building instead, drilling down to the job list on click.
                Object.values(
                  dayEvents.reduce<Record<string, { name: string; jobs: Schedule[] }>>((acc, job) => {
                    (acc[job.buildingId] ??= { name: job.buildingName, jobs: [] }).jobs.push(job);
                    return acc;
                  }, {})
                ).map((group) => (
                  <div
                    key={group.name}
                    onClick={() => setSelectedDayBuilding({ date: cloneDay, buildingName: group.name, jobs: group.jobs })}
                    className="cursor-pointer border px-1.5 py-1 rounded-md text-[10px] font-semibold flex items-center justify-between truncate transition-colors bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                  >
                    <span className="truncate flex items-center gap-1" title={`${group.name} (${group.jobs.length} งาน)`}>
                      <Building2 className="h-3 w-3 shrink-0" />
                      {group.name} ({group.jobs.length})
                    </span>
                    <ChevronRight className="h-3 w-3 shrink-0 ml-1" />
                  </div>
                ))
              ) : (
                dayEvents.map((event) => {
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
                      {/* Type first so it reads at a glance, then the unit code —
                          a tech needs to know both what the job is and which
                          machine. Narrow cells truncate the tail, so the full
                          text is on the title attribute too. */}
                      <span
                        className="truncate"
                        title={`${JOB_TYPE_LABEL[event.jobType]} - ${event.acCode}`}
                      >
                        {JOB_TYPE_LABEL[event.jobType]} - {event.acCode}
                      </span>
                      {status === "overdue" && <AlertTriangle className="h-3 w-3 shrink-0 ml-1" />}
                    </div>
                  );
                })
              )}
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
                {JOB_TYPE_LABEL[selectedEvent.jobType]}
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

  const renderDayBuildingModal = () => {
    if (!selectedDayBuilding) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-xs p-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-white shadow-xl animate-in fade-in zoom-in-95 max-h-[80vh] flex flex-col">
          <div className="p-5 border-b border-border flex items-start justify-between shrink-0">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {selectedDayBuilding.buildingName}
              </h3>
              <p className="text-xs text-muted-foreground font-medium">
                {format(selectedDayBuilding.date, "d MMMM yyyy", { locale: th })} • {selectedDayBuilding.jobs.length} งาน
              </p>
            </div>
            <button onClick={() => setSelectedDayBuilding(null)} className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-3 space-y-1.5 overflow-y-auto">
            {selectedDayBuilding.jobs.map((job) => {
              const status = getEventStatus(new Date(job.nextDueDate));
              return (
                <div
                  key={job.id}
                  onClick={() => {
                    setSelectedEvent(job);
                    setSelectedDayBuilding(null);
                  }}
                  className="cursor-pointer rounded-xl border border-border p-3 text-xs hover:bg-muted transition-colors flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-foreground truncate">{JOB_TYPE_LABEL[job.jobType]} - {job.acCode}</div>
                    <div className="text-muted-foreground text-[11px] truncate">ห้อง {job.roomName}</div>
                  </div>
                  {status === "overdue" && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-600" />}
                </div>
              );
            })}
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
      {renderDayBuildingModal()}
    </div>
  );
}

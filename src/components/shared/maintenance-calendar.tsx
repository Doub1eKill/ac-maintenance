"use client";

import { useState, useEffect, useMemo } from "react";
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
  differenceInDays,
  startOfDay
} from "date-fns";
import { th } from "date-fns/locale";
import { 
  ArrowLeft,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { CatalogueMark } from "@/components/shared/catalogue-mark";
import { formatUnitLocation } from "@/lib/location";
import { useEscapeToClose } from "@/hooks/use-escape-to-close";

interface Schedule {
  id: string;
  airConditionerId: string;
  acCode: string;
  brand: string;
  // Whether the brand/model behind that name has been retired from the
  // catalogue. See @/lib/catalogue-status.
  brandDeleted: boolean;
  modelDeleted: boolean;
  location: string;
  buildingId: string;
  buildingName: string;
  roomName: string;
  floor: number | null;
  frequencyValue: number;
  frequencyUnit: string;
  lastPerformedAt: string | null;
  lastPerformedByName: string | null;
  nextDueDate: string;
  isActive: boolean;
  jobType: "repair" | "cleaning";
}

const JOB_TYPE_LABEL: Record<Schedule["jobType"], string> = {
  repair: "งานซ่อม",
  cleaning: "งานล้าง",
};

// The calendar deliberately does not grow a floor level the way the lists did
// (6 ก.ย. 2026): a month grid has no room for another tier of nesting, and the
// day panel is one flat list on purpose — it answers "what is due today", a
// question the floor does not narrow. So the floor rides along with the room
// name instead of becoming a level: "ห้อง 5-883136 (ชั้น 5)".
//
// Routed through formatUnitLocation so it is spelled the same here as in every
// other view. The building is left off because each caller below either prints
// it alongside or is already scoped to one building.
function roomWithFloor(
  job: Pick<Schedule, "roomName" | "floor" | "buildingName">,
  options: { withRoomLabel?: boolean } = {}
) {
  return formatUnitLocation(
    { name: job.roomName, floor: job.floor, building: { name: job.buildingName } },
    { withBuilding: false, withFloor: true, withRoomLabel: options.withRoomLabel ?? true }
  );
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
  const [selectedDayBuilding, setSelectedDayBuilding] = useState<{
    date: Date;
    buildingName: string;
    jobs: Schedule[];
  } | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  // Where the job modal was opened from, so it can offer a way back. Both
  // routes into it close what they were opened from — the building modal and
  // the day sheet each hand the screen over rather than stacking on top of it
  // — so without this, stepping into a job and finding it was the wrong one
  // means starting again from the calendar.
  const [eventOrigin, setEventOrigin] = useState<
    | { kind: "building"; building: { date: Date; buildingName: string; jobs: Schedule[] } }
    | { kind: "day"; date: Date }
    | null
  >(null);
  const [dayBuildingFilter, setDayBuildingFilter] = useState<string>("all");
  const [dayRoomFilter, setDayRoomFilter] = useState<string>("all");
  const [dayTypeFilter, setDayTypeFilter] = useState<Schedule["jobType"] | "all">("all");

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

  // All jobs on the clicked day, unfiltered — the base set the three
  // dropdowns below narrow down from.
  const dayJobs = useMemo(
    () => (selectedDay ? schedules.filter((s) => isSameDay(new Date(s.nextDueDate), selectedDay)) : []),
    [schedules, selectedDay]
  );

  const dayBuildingOptions = useMemo(
    () => Array.from(new Set(dayJobs.map((job) => job.buildingName))).sort((a, b) => a.localeCompare(b, "th")),
    [dayJobs]
  );

  // Room options narrow to the selected building so the dropdown never
  // offers a room that has no job on this day under the current building
  // filter. Use a composite key (buildingId::roomName) to distinguish rooms
  // with the same name across different buildings.
  const dayRoomOptions = useMemo(() => {
    const jobsInBuilding =
      dayBuildingFilter === "all" ? dayJobs : dayJobs.filter((job) => job.buildingName === dayBuildingFilter);
    const seen = new Map<
      string,
      { value: string; label: string; buildingName: string; floor: number | null }
    >();
    for (const job of jobsInBuilding) {
      const value = `${job.buildingId}::${job.roomName}`;
      if (!seen.has(value)) {
        // No "ห้อง" prefix here — the field's own label already says it — but
        // the floor is spelled the way it is everywhere else.
        const room = roomWithFloor(job, { withRoomLabel: false });
        seen.set(value, {
          value,
          label: dayBuildingFilter === "all" ? `${job.buildingName} • ${room}` : room,
          buildingName: job.buildingName,
          floor: job.floor,
        });
      }
    }
    // Building, then floor, then room. Sorting by the label alone was fine
    // while the floor was invisible; now that every option shows one, an
    // alphabetical order running ชั้น 3, ชั้น 1, ชั้น 3 reads as a bug.
    // Building stays the first key so showing every building doesn't
    // interleave them by floor. Rooms with no floor recorded go last within
    // their building, as they do in the grouped lists.
    return Array.from(seen.values()).sort((a, b) => {
      const byBuilding = a.buildingName.localeCompare(b.buildingName, "th");
      if (byBuilding !== 0) return byBuilding;
      if (a.floor !== b.floor) {
        if (a.floor === null) return 1;
        if (b.floor === null) return -1;
        return a.floor - b.floor;
      }
      return a.label.localeCompare(b.label, "th");
    });
  }, [dayJobs, dayBuildingFilter]);

  const filteredDayJobs = useMemo(
    () =>
      dayJobs.filter(
        (job) =>
          (dayBuildingFilter === "all" || job.buildingName === dayBuildingFilter) &&
          (dayRoomFilter === "all" || `${job.buildingId}::${job.roomName}` === dayRoomFilter) &&
          (dayTypeFilter === "all" || job.jobType === dayTypeFilter)
      ),
    [dayJobs, dayBuildingFilter, dayRoomFilter, dayTypeFilter]
  );

  const handleDayBuildingFilterChange = (value: string) => {
    setDayBuildingFilter(value);
    // Changing the building can orphan the currently selected room, so
    // reset it rather than silently filtering to zero results.
    setDayRoomFilter("all");
  };

  const closeDaySheet = () => {
    setSelectedDay(null);
    setDayBuildingFilter("all");
    setDayRoomFilter("all");
    setDayTypeFilter("all");
  };

  const closeEventModal = () => {
    setSelectedEvent(null);
    setEventOrigin(null);
  };

  // Reopens whichever list the job was picked from. The day sheet comes back
  // with its filters cleared, since closing it cleared them — it reopens as a
  // fresh view of that day rather than pretending to restore one.
  const goBackFromEvent = () => {
    if (!eventOrigin) return;
    if (eventOrigin.kind === "building") {
      setSelectedDayBuilding(eventOrigin.building);
    } else {
      setSelectedDay(eventOrigin.date);
    }
    setSelectedEvent(null);
    setEventOrigin(null);
  };

  // Both of these are rendered by the helpers below, where a hook cannot go, so
  // they are switched on by the same state that puts the modal on screen. Only
  // one is ever on: opening either closes the other. The day sheet needs
  // nothing here — it is a Radix Sheet and handles Escape itself.
  useEscapeToClose(closeEventModal, selectedEvent !== null);
  useEscapeToClose(() => setSelectedDayBuilding(null), selectedDayBuilding !== null);

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between py-3 px-6 border-b border-border bg-card rounded-t-2xl shrink-0">
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
            aria-label="เดือนก่อนหน้า"
            className="p-1.5 hover:bg-card rounded-lg text-muted-foreground hover:text-foreground transition-colors hover:shadow-sm"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button 
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1.5 text-xs font-bold text-foreground hover:bg-card rounded-lg transition-colors hover:shadow-sm"
          >
            วันนี้
          </button>
          <button 
            onClick={nextMonth}
            aria-label="เดือนถัดไป"
            className="p-1.5 hover:bg-card rounded-lg text-muted-foreground hover:text-foreground transition-colors hover:shadow-sm"
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
            onClick={() => setSelectedDay(cloneDay)}
            className={`h-full flex flex-col border-b border-r border-border p-2 transition-all cursor-pointer ${
              !isCurrentMonth ? "bg-muted/50 text-muted-foreground" : "bg-card hover:bg-muted"
            }`}
          >
            <div className="flex justify-between items-start shrink-0">
              <button
                type="button"
                aria-label={format(cloneDay, "d MMMM yyyy", { locale: th })}
                className={`text-xs font-bold flex h-6 w-6 items-center justify-center rounded-full cursor-pointer transition-colors ${
                  isTodayDate
                    ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
                    : "text-foreground hover:bg-primary/10"
                }`}
              >
                {formattedDate}
              </button>
              {dayEvents.length > 0 && (
                <span className="text-[10px] font-bold text-muted-foreground">
                  {dayEvents.length} รายการ
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-col gap-1 overflow-y-auto flex-1 min-h-0 no-scrollbar">
              {/* Always grouped by building rather than only past some count
                  — a day with a single job still shows as one building pill,
                  which drills down to that job the same way a busier day
                  does, so the cell layout never depends on the seed data
                  underneath it. */}
              {Object.values(
                dayEvents.reduce<Record<string, { name: string; jobs: Schedule[] }>>((acc, job) => {
                  (acc[job.buildingId] ??= { name: job.buildingName, jobs: [] }).jobs.push(job);
                  return acc;
                }, {})
              ).map((group) => (
                // A button, not a clickable div: the keyboard could not reach
                // a building's jobs at all, and a day cell that scrolls must
                // hold something focusable or keyboard users cannot scroll it
                // (axe scrollable-region-focusable, 29 Oct 2026).
                <button
                  type="button"
                  key={group.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDayBuilding({ date: cloneDay, buildingName: group.name, jobs: group.jobs });
                  }}
                  className="w-full text-left cursor-pointer border px-1.5 py-1 rounded-md text-[10px] font-semibold flex items-start justify-between gap-1 transition-colors bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                >
                  {/* No truncate — building names that share a long common
                      prefix (e.g. two "Administration Building ######" seed
                      rows) become visually identical once cut with an
                      ellipsis, so this wraps to a second line instead. */}
                  <span className="min-w-0 flex items-start gap-1">
                    <Building2 className="h-3 w-3 shrink-0 mt-px" />
                    <span>{group.name} ({group.jobs.length})</span>
                  </span>
                  <ChevronRight className="h-3 w-3 shrink-0 ml-1 mt-px" />
                </button>
              ))}
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
    const backFromEventLabel = !eventOrigin
      ? ""
      : eventOrigin.kind === "building"
        ? `กลับไปรายการงานของ ${eventOrigin.building.buildingName}`
        : `กลับไปรายการงานวันที่ ${format(eventOrigin.date, "d MMMM yyyy", { locale: th })}`;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-xs p-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-xl animate-in fade-in zoom-in-95">
          <div className="p-5 border-b border-border flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                {eventOrigin ? (
                  // Names the list it goes back to rather than just "ย้อนกลับ":
                  // two different lists lead here, and which one is waiting is
                  // not otherwise visible from inside this modal.
                  <button
                    onClick={goBackFromEvent}
                    aria-label={backFromEventLabel}
                    title={backFromEventLabel}
                    className="-ml-1 p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                ) : (
                  <Wrench className="h-5 w-5 text-primary" />
                )}
                {JOB_TYPE_LABEL[selectedEvent.jobType]}
              </h3>
              <p className="text-xs text-muted-foreground font-medium">รหัสเครื่อง: {selectedEvent.acCode}</p>
            </div>
            <button aria-label="ปิด" onClick={closeEventModal} className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors">
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
                <span className="font-bold text-foreground text-xs">
                  {selectedEvent.brand}
                  <CatalogueMark
                    brandDeleted={selectedEvent.brandDeleted}
                    modelDeleted={selectedEvent.modelDeleted}
                    className="ml-1"
                  />
                </span>
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
                  status === "overdue" ? "text-red-600 dark:text-red-400" : status === "warning" ? "text-warning" : "text-primary"
                }`}>
                  {format(new Date(selectedEvent.nextDueDate), "dd MMM yyyy", { locale: th })}
                </span>
              </div>
            </div>

            {onCreateWorkOrder && (
              <button
                onClick={() => {
                  onCreateWorkOrder(selectedEvent.airConditionerId);
                  closeEventModal();
                }}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold text-xs py-2.5 rounded-xl hover:bg-primary/90 transition-colors"
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
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-xl animate-in fade-in zoom-in-95 max-h-[80vh] flex flex-col">
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
            <button aria-label="ปิด" onClick={() => setSelectedDayBuilding(null)} className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors">
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
                    setEventOrigin({ kind: "building", building: selectedDayBuilding });
                    setSelectedEvent(job);
                    setSelectedDayBuilding(null);
                  }}
                  className="cursor-pointer rounded-xl border border-border p-3 text-xs hover:bg-muted transition-colors flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-foreground truncate">{JOB_TYPE_LABEL[job.jobType]} - {job.acCode}</div>
                    <div className="text-muted-foreground text-[11px] truncate">{roomWithFloor(job)}</div>
                  </div>
                  {status === "overdue" && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderDaySheet = () => {
    return (
      <Sheet open={selectedDay !== null} onOpenChange={(open) => !open && closeDaySheet()}>
        <SheetContent side="right" className="data-[side=right]:sm:max-w-md">
          {selectedDay && (
            <>
              <SheetHeader>
                <SheetTitle>{format(selectedDay, "d MMMM yyyy", { locale: th })}</SheetTitle>
                <SheetDescription>
                  {filteredDayJobs.length} จาก {dayJobs.length} รายการ
                </SheetDescription>
              </SheetHeader>

              <div className="px-6 space-y-3 shrink-0">
                <div>
                  <label className="mb-1 block text-xs font-bold text-foreground">อาคาร</label>
                  <NativeSelect
                    value={dayBuildingFilter}
                    aria-label="อาคาร"
                    onChange={(e) => handleDayBuildingFilterChange(e.target.value)}
                  >
                    <NativeSelectOption value="all">ทุกอาคาร</NativeSelectOption>
                    {dayBuildingOptions.map((name) => (
                      <NativeSelectOption key={name} value={name}>
                        {name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-foreground">ห้อง</label>
                  <NativeSelect value={dayRoomFilter} onChange={(e) => setDayRoomFilter(e.target.value)} aria-label="ห้อง">
                    <NativeSelectOption value="all">ทุกห้อง</NativeSelectOption>
                    {dayRoomOptions.map((option) => (
                      <NativeSelectOption key={option.value} value={option.value}>
                        {option.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-foreground">ประเภทงาน</label>
                  <NativeSelect
                    value={dayTypeFilter}
                    aria-label="ประเภทงาน"
                    onChange={(e) => setDayTypeFilter(e.target.value as Schedule["jobType"] | "all")}
                  >
                    <NativeSelectOption value="all">ทุกประเภท</NativeSelectOption>
                    <NativeSelectOption value="repair">{JOB_TYPE_LABEL.repair}</NativeSelectOption>
                    <NativeSelectOption value="cleaning">{JOB_TYPE_LABEL.cleaning}</NativeSelectOption>
                  </NativeSelect>
                </div>
              </div>

              <div className="p-6 pt-4 space-y-1.5 overflow-y-auto flex-1 min-h-0">
                {dayJobs.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">ไม่มีงานในวันนี้</p>
                ) : filteredDayJobs.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    ไม่พบรายการที่ตรงกับตัวกรองที่เลือก
                  </p>
                ) : (
                  filteredDayJobs.map((job) => {
                    const status = getEventStatus(new Date(job.nextDueDate));
                    return (
                      <div
                        key={job.id}
                        onClick={() => {
                          setEventOrigin({ kind: "day", date: selectedDay });
                          setSelectedEvent(job);
                          closeDaySheet();
                        }}
                        className="cursor-pointer rounded-xl border border-border p-3 text-xs hover:bg-muted transition-colors flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-foreground truncate">
                            {JOB_TYPE_LABEL[job.jobType]} - {job.acCode}
                          </div>
                          <div className="text-muted-foreground text-[11px] truncate">
                            {job.buildingName} • {roomWithFloor(job)}
                          </div>
                        </div>
                        {status === "overdue" && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400" />}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    );
  };

  return (
    <div className="biz-card relative animate-in fade-in shadow-sm rounded-2xl overflow-hidden bg-card border border-border flex flex-col h-[600px]">
      {isLoading && (
        <div className="absolute inset-0 z-10 bg-card/50 backdrop-blur-sm flex items-center justify-center">
          <AnimatedIcon icon={Clock} size={24} animation="spin" className="text-primary" />
        </div>
      )}
      {renderHeader()}
      {renderDays()}
      {renderCells()}
      {renderEventModal()}
      {renderDayBuildingModal()}
      {renderDaySheet()}
    </div>
  );
}

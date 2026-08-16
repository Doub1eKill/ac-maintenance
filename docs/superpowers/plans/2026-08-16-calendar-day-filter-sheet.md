# Calendar Day-Click Filterable Work Order Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user click a day's date number in `MaintenanceCalendar` to open a Sheet listing every job scheduled that day, filterable by อาคาร (building) / ห้อง (room) / ประเภทงาน (job type), so busy days no longer require clicking each job pill one by one.

**Architecture:** A single self-contained addition to the existing `src/components/shared/maintenance-calendar.tsx` client component — new state, `useMemo`-derived filter data, a day-number click handler, and a new `renderDaySheet()` render function built on ReUI's `Sheet`. No new files, no new API route, no new Prisma query — it reads the `Schedule[]` the component already fetches into `schedules` state. The existing individual-job-click and building-group-click modals are untouched.

**Tech Stack:** React 19 (`useState`, `useMemo`), `date-fns` (already imported: `isSameDay`, `format`, `th` locale), ReUI `Sheet`/`SheetContent`/`SheetHeader`/`SheetTitle`/`SheetDescription` (`src/components/ui/sheet.tsx`), ReUI `NativeSelect`/`NativeSelectOption` (`src/components/ui/native-select.tsx`), `lucide-react` (`AlertTriangle`, already imported).

## Global Constraints

- No emojis anywhere in UI — use `lucide-react` icons only (project-wide rule, `AGENTS.md`).
- Do not modify any file under `src/app/api/**`, `src/lib/**`, or `prisma/**` — backend is off-limits (project rule, `HANDOFF.md` / `AGENTS.md`). This plan touches only `src/components/shared/maintenance-calendar.tsx`, so this constraint is satisfied by construction — no backend request needs to be logged in `HANDOFF.md` for this feature.
- Existing behavior must not change: clicking an individual job pill (≤4 jobs/day) still opens `renderEventModal`; clicking a building-group pill (>4 jobs/day) still opens the unfiltered `renderDayBuildingModal`. Both stay exactly as they are.
- No test framework exists in this project for UI (confirmed by precedent plans `2026-08-06-work-order-board-table-styling.md` and `2026-08-09-org-admin-profile-page.md`) — verification is `npx tsc --noEmit` + manual browser check, not automated tests.
- Use `interface`/explicit types per project TypeScript style; no `any`.

---

## Task 1: Add the day-click filterable Sheet to `MaintenanceCalendar`

**Files:**
- Modify: `src/components/shared/maintenance-calendar.tsx`

**Interfaces:**
- Consumes: nothing from other tasks (only task in this plan).
- Produces: nothing consumed elsewhere — this is a self-contained UI addition to an existing component. `MaintenanceCalendarProps` is unchanged, so `admin-dashboard-view.tsx` and `tech-mobile-view.tsx` (the two callers) need no changes.

- [ ] **Step 1: Add the new imports**

Locate this existing line (currently `maintenance-calendar.tsx:1-3`):

```tsx
"use client";

import { useState, useEffect } from "react";
```

Replace with:

```tsx
"use client";

import { useState, useEffect, useMemo } from "react";
```

Locate this existing line (currently `maintenance-calendar.tsx:30`):

```tsx
import { AnimatedIcon } from "@/components/ui/animated-icon";
```

Replace with:

```tsx
import { AnimatedIcon } from "@/components/ui/animated-icon";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
```

- [ ] **Step 2: Add the new state**

Locate this existing block (currently `maintenance-calendar.tsx:74-79`):

```tsx
  const [selectedEvent, setSelectedEvent] = useState<Schedule | null>(null);
  const [selectedDayBuilding, setSelectedDayBuilding] = useState<{
    date: Date;
    buildingName: string;
    jobs: Schedule[];
  } | null>(null);
```

Replace with:

```tsx
  const [selectedEvent, setSelectedEvent] = useState<Schedule | null>(null);
  const [selectedDayBuilding, setSelectedDayBuilding] = useState<{
    date: Date;
    buildingName: string;
    jobs: Schedule[];
  } | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [dayBuildingFilter, setDayBuildingFilter] = useState<string>("all");
  const [dayRoomFilter, setDayRoomFilter] = useState<string>("all");
  const [dayTypeFilter, setDayTypeFilter] = useState<Schedule["jobType"] | "all">("all");
```

- [ ] **Step 3: Add derived filter data and helper handlers**

Locate this existing block (currently `maintenance-calendar.tsx:113-118`):

```tsx
  const getEventStatus = (dueDate: Date) => {
    const daysDiff = differenceInDays(dueDate, today);
    if (daysDiff < 0) return "overdue";
    if (daysDiff <= 7) return "warning";
    return "upcoming";
  };
```

Replace with:

```tsx
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
  // filter.
  const dayRoomOptions = useMemo(() => {
    const jobsInBuilding =
      dayBuildingFilter === "all" ? dayJobs : dayJobs.filter((job) => job.buildingName === dayBuildingFilter);
    return Array.from(new Set(jobsInBuilding.map((job) => job.roomName))).sort((a, b) => a.localeCompare(b, "th"));
  }, [dayJobs, dayBuildingFilter]);

  const filteredDayJobs = useMemo(
    () =>
      dayJobs.filter(
        (job) =>
          (dayBuildingFilter === "all" || job.buildingName === dayBuildingFilter) &&
          (dayRoomFilter === "all" || job.roomName === dayRoomFilter) &&
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
```

- [ ] **Step 4: Make the day-number clickable**

Locate this existing block (currently `maintenance-calendar.tsx:201-206`):

```tsx
            <div className="flex justify-between items-start shrink-0">
              <span className={`text-xs font-bold flex h-6 w-6 items-center justify-center rounded-full ${
                isTodayDate ? "bg-primary text-white shadow-md" : "text-foreground"
              }`}>
                {formattedDate}
              </span>
```

Replace with:

```tsx
            <div className="flex justify-between items-start shrink-0">
              <span
                onClick={() => setSelectedDay(cloneDay)}
                className={`text-xs font-bold flex h-6 w-6 items-center justify-center rounded-full cursor-pointer transition-colors ${
                  isTodayDate
                    ? "bg-primary text-white shadow-md hover:bg-primary/90"
                    : "text-foreground hover:bg-primary/10"
                }`}
              >
                {formattedDate}
              </span>
```

- [ ] **Step 5: Add `renderDaySheet` and wire it into the returned JSX**

Locate this existing block (currently `maintenance-calendar.tsx:388-406`, the end of `renderDayBuildingModal` through the end of the component):

```tsx
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
```

Replace with:

```tsx
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
                  <NativeSelect value={dayRoomFilter} onChange={(e) => setDayRoomFilter(e.target.value)}>
                    <NativeSelectOption value="all">ทุกห้อง</NativeSelectOption>
                    {dayRoomOptions.map((name) => (
                      <NativeSelectOption key={name} value={name}>
                        {name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-foreground">ประเภทงาน</label>
                  <NativeSelect
                    value={dayTypeFilter}
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
                            {job.buildingName} • ห้อง {job.roomName}
                          </div>
                        </div>
                        {status === "overdue" && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-600" />}
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
      {renderDaySheet()}
    </div>
  );
}
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors attributable to `maintenance-calendar.tsx`.

- [ ] **Step 7: Manual browser verification**

Start the dev server if it isn't already running (`npm run dev`, or via the project's preview config), then open `/admin` and go to the ปฏิทินซ่อมบำรุง tab.

1. Click a day with 0 jobs → Sheet opens from the right, title shows the date, "0 จาก 0 รายการ", body shows "ไม่มีงานในวันนี้". All three dropdowns show only their "all" option.
2. Close the sheet (X button or click outside), click a day with 1-4 visible job pills → Sheet lists all of them; confirm the อาคาร/ห้อง dropdown options match only what's actually on that day (open DevTools if needed to cross-check against the API response for that date range).
3. Close, click a day with >4 jobs (shown as building-group pills in the cell) → Sheet lists every job on that day ungrouped, with working filters.
4. On that same >4-job day, separately click one of the building-group pills in the cell (not the date number) → confirm it still opens the old `renderDayBuildingModal` unfiltered list exactly as before (unchanged behavior).
5. In the Sheet, pick a building in the อาคาร dropdown → confirm the ห้อง dropdown narrows to that building's rooms and the list filters to only that building; switch to a different building → confirm ห้อง resets to "ทุกห้อง".
6. Pick ประเภทงาน = งานซ่อม → confirm only repair jobs remain; combine with a building/room selection at the same time and confirm all three filters compose (AND, not OR).
7. Pick a filter combination with zero matches → confirm "ไม่พบรายการที่ตรงกับตัวกรองที่เลือก" renders instead of an empty blank area.
8. Click a job card in the filtered list → confirm the Sheet closes and the existing single-job detail modal (`renderEventModal`) opens with the correct data; also confirm a normal individual pill click directly in the calendar cell (≤4-job day) still works unchanged.
9. Resize the browser to a narrow width (e.g. 375px) or open the Technician mobile view (`/tech`, same `MaintenanceCalendar` component) and repeat steps 1-3 there — confirm the Sheet remains usable at mobile width.

- [ ] **Step 8: Commit**

```bash
git add src/components/shared/maintenance-calendar.tsx
git commit -m "feat(calendar): add day-click filterable work order sheet (building/room/type)"
```

# Design Specification: Calendar — Day-Click Filterable Work Order List

**Date:** 2026-08-16
**Status:** Approved by User (Esther03u)
**Target:** `src/components/shared/maintenance-calendar.tsx`, shared by the Admin dashboard (`/admin`) calendar tab and the Technician mobile view (`tech-mobile-view.tsx`).

---

## 1. Overview & Objectives

Right now, to see everything scheduled on a given day, the user must click each job pill one at a time (or, once a day has more than 4 jobs, click a building-group pill to see an unfiltered list). This is tedious on busy days.

Add a click handler on the day-number itself that opens a Sheet listing every job scheduled that day, with three filters — **อาคาร** (building), **ห้อง** (room), **ประเภทงาน** (job type) — so the user can narrow a busy day down instead of scanning the whole list.

This is purely additive: clicking an individual job pill still opens the existing single-job modal (`renderEventModal`), and clicking a building-group pill (on days with >4 jobs) still opens the existing unfiltered `renderDayBuildingModal`. Both are unchanged.

This is a frontend-only change. No file under `src/app/api/**`, `src/lib/**`, or `prisma/schema.prisma` is touched (per `HANDOFF.md`'s "ห้ามแก้ Backend เอง" rule) — the calendar already fetches the full month's `Schedule[]` (including `buildingName`/`roomName`/`jobType`) via `/api/admin/maintenance-schedules`, and the new Sheet reads from that same in-memory array.

## 2. Scope of Changes

**[MODIFY]** `src/components/shared/maintenance-calendar.tsx`:
- Add `onClick` to the day-number `<span>` in `renderCells()` (line 202-206), setting a new `selectedDay: Date | null` state.
- Add a new `renderDaySheet()` render function using ReUI's `Sheet`/`SheetContent`/`SheetHeader`/`SheetTitle` (`src/components/ui/sheet.tsx`), `side="right"`.
- Add three `NativeSelect` filter dropdowns inside the sheet (`src/components/ui/native-select.tsx`, same pattern as `asset-manager.tsx:381-399`).
- Filtered list items reuse the existing job-card markup/styling from `renderDayBuildingModal` (lines 366-386) and clicking one calls the existing `setSelectedEvent(job)` — opening the existing `renderEventModal`, unchanged.

No other files change. No new API route, no new Prisma query.

## 3. Component Design

### Trigger

The day-number circle (`renderCells()`, line 202) gets `onClick={() => setSelectedDay(cloneDay)}` and `cursor-pointer`, regardless of whether that day has 0, a few, or many events. Clicking a day with 0 events opens the sheet with an empty state (see Error Handling).

### Sheet layout (`renderDaySheet`)

- **Header:** `{format(selectedDay, "d MMMM yyyy", { locale: th })}` as `SheetTitle`, plus a `SheetDescription` showing `"{filteredJobs.length} จาก {dayJobs.length} รายการ"`.
- **Filter row:** three `NativeSelect` dropdowns, stacked or in a row depending on width:
  1. **อาคาร** — options = unique `buildingName` values among that day's jobs (`dayJobs`), plus a leading "ทุกอาคาร" (all) option, which is the default.
  2. **ห้อง** — options = unique `roomName` values among `dayJobs` filtered to the currently-selected building (or all of `dayJobs` if building is "all"), plus "ทุกห้อง" default. Changing the building resets this to "ทุกห้อง".
  3. **ประเภทงาน** — "ทุกประเภท" / "งานซ่อม" / "งานล้าง" (from `JOB_TYPE_LABEL`), default "ทุกประเภท".
- **List:** filtered jobs render as clickable cards using the same markup as today's `renderDayBuildingModal` job rows (job-type + acCode, room name, overdue icon), `onClick={() => { setSelectedEvent(job); setSelectedDay(null); }}` — opens the existing detail modal.
- **Empty state:** if `dayJobs.length === 0`, show "ไม่มีงานในวันนี้". If `dayJobs.length > 0` but the filtered list is empty, show "ไม่พบรายการที่ตรงกับตัวกรองที่เลือก".

### State

```ts
const [selectedDay, setSelectedDay] = useState<Date | null>(null);
const [dayBuildingFilter, setDayBuildingFilter] = useState<string>("all");
const [dayRoomFilter, setDayRoomFilter] = useState<string>("all");
const [dayTypeFilter, setDayTypeFilter] = useState<Schedule["jobType"] | "all">("all");
```

All four reset to their defaults (`null`/`"all"`) when the sheet closes, so reopening a different day doesn't carry over stale filters.

`dayJobs` (jobs for `selectedDay`) and the further-filtered list are both derived with `useMemo`, keyed off `schedules`, `selectedDay`, and the three filter values — no new state duplicating `schedules`.

## 4. Interaction with Existing Modals

Unchanged:
- Clicking an individual job pill on a day with ≤4 jobs → `setSelectedEvent(event)` → `renderEventModal`.
- Clicking a building-group pill on a day with >4 jobs → `setSelectedDayBuilding(...)` → `renderDayBuildingModal`.

New, additive:
- Clicking the day number → `setSelectedDay(cloneDay)` → `renderDaySheet`, always available regardless of job count.

All three can be open independently (they're separate state), but in practice only one is opened at a time by user action; no explicit mutual-exclusion logic is needed since each sets its own state and the others remain `null`.

## 5. Error Handling

- No new failure modes: filtering is pure client-side array logic over data already loaded and already rendered without error today.
- Empty states handled explicitly (Section 3) rather than rendering a blank list.
- If `schedules` is still loading (`isLoading`) when a day is clicked, the sheet opens showing whatever is currently in `schedules` (possibly empty/stale from the previous month fetch) — acceptable since the existing loading overlay already covers this same window for the rest of the calendar.

## 6. Testing

Manual, in-browser (no test framework in this project for UI):
1. Dev server running, open `/admin` → ปฏิทินซ่อมบำรุง tab.
2. Click a day with 0 jobs → sheet opens with "ไม่มีงานในวันนี้", filters show only "ทุกอาคาร/ทุกห้อง/ทุกประเภท".
3. Click a day with 1-4 jobs (individually visible in the cell) → sheet opens listing all of them; confirm building/room dropdown options match what's actually on that day.
4. Click a day with >4 jobs (grouped into building pills) → sheet opens listing all of them ungrouped, with working filters; separately confirm the building-pill click still opens the old unfiltered `renderDayBuildingModal` unchanged.
5. Select a building → confirm room options narrow to that building's rooms and the list filters correctly; switch building again → confirm room resets to "ทุกห้อง".
6. Select ประเภทงาน = งานซ่อม → confirm only repair jobs remain, combine with building/room filters together.
7. Click a filtered job card → confirm it opens the existing single-job detail modal with correct data, and the sheet closes.
8. Repeat steps 2-4 on the Technician mobile view (`tech-mobile-view.tsx`) at a mobile viewport width, since it renders the same `MaintenanceCalendar` component.
9. `npx tsc --noEmit` — no new errors.

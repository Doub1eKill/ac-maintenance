# Design Specification: Org Admin — Split Repair/Cleaning Metrics + Urgent Work List

**Date:** 2026-08-03
**Status:** Approved by User
**Target:** Backlog items #5 and #6 from `HANDOFF.md` (27 July 2026 backlog, Org Admin section)

---

## 1. Overview & Objectives

The Org Admin Overview tab currently shows a single combined "เสีย/รอซ่อม" (broken-or-needs-cleaning) count, and a forward-looking "กำหนดล้างแอร์" table that only lists units by upcoming cleaning due date — it has no way to surface units that are broken or overdue *right now*.

The backend already computed everything needed for both fixes in `getOrgAdminData()` (`src/app/admin/actions.ts`, commit `df3bd1a`): `metrics.repairUnits`, `metrics.cleaningUnits`, and a pre-shaped `urgentUnits` array. None of this is wired to the frontend yet — `urgentUnits` isn't even destructured in `src/app/admin/page.tsx`. This is a pure frontend wiring + presentation task; no backend changes are required.

---

## 2. Scope of Changes

### A. Data Plumbing (currently missing entirely)
- **[MODIFY]** `src/app/admin/page.tsx`
  - Add `urgentUnits` to the destructured result of `getOrgAdminData()`.
  - Pass `urgentUnits` as a new prop to `<AdminDashboardView>`.
- **[MODIFY]** `src/components/admin/admin-dashboard-view.tsx`
  - Widen the `metrics` type in `AdminDashboardViewProps` to include `repairUnits: number` and `cleaningUnits: number` (already returned by `getOrgAdminData()`, just not typed/read yet).
  - Add `urgentUnits: UrgentUnit[]` to `AdminDashboardViewProps`, with a matching type: `{ id: string; acCode: string; location: string; brand: string; model: string | null; btu: number | null; status: string; priority: string | null; issueDescription: string | null; reportedAt: string | null }`.

### B. System Status Summary Card (backlog #5)
- **[MODIFY]** `src/components/admin/admin-dashboard-view.tsx` (~line 488-557, the "สรุปสถานะระบบ" card)
  - Change grid from `grid-cols-2` (4 items) to `grid-cols-3` (6 items).
  - Split the existing "เสีย/รอซ่อม" tile into two tiles: **"รอซ่อม"** (`metrics.repairUnits`, red) and **"รอล้าง"** (`metrics.cleaningUnits`, amber).
  - Keep "ทั้งหมด", "รอดำเนินการ", "ช่างดูแล" tiles unchanged.
  - Add a 6th tile, **"เสร็จสิ้นสัปดาห์นี้"**, computed as `weeklyActivity.reduce((sum, d) => sum + d.repairs, 0)` (data already available client-side, no new prop needed).
  - The readiness progress bar below the grid keeps its existing formula (`totalUnits - brokenOrCleaningUnits`) — `brokenOrCleaningUnits` is unchanged and still equals `repairUnits + cleaningUnits`.

### C. Urgent Work List (backlog #6, replaces `UpcomingMaintenanceTable` usage)
- **[MODIFY]** `src/components/admin/upcoming-maintenance-table.tsx`
  - Rename the exported type `UpcomingMaintenanceAC` → keep as-is for the upcoming-only shape, and add a new discriminated type/field so a row can be either an urgent row or an upcoming row, e.g. add `kind: "urgent" | "upcoming"` plus optional urgent-only fields (`status`, `priority`, `issueDescription`, `reportedAt`).
  - Add a new **"ประเภท"** column rendering a badge: red "ซ่อมด่วน" (`status === "broken"`), amber "ค้างล้าง" (`status === "needs_cleaning"`), neutral "กำหนดล้าง" (upcoming rows).
  - Change the "วันครบกำหนด" column to branch on `kind`: urgent rows show `reportedAt` under a "แจ้งเมื่อ" label; upcoming rows keep the existing `nextDueDate` display (including the overdue-red styling already in place).
  - Change the row-actions dropdown: upcoming rows keep "สร้างใบงานล้างแอร์" (`onCreateWorkOrder`); urgent rows show "มอบหมายช่าง" instead, calling a new `onAssignWorkOrder?: (workOrderId: string) => void` meta callback (urgent units already have an open pending WorkOrder — creating another would duplicate it).
  - **Note:** `urgentUnits` (per `src/app/admin/actions.ts`) only carries the AC unit's `id`, not the pending work order's own id — `assignWorkOrderAction(workOrderId, assignToUserId)` needs the latter. Rather than requesting a backend change (per the `HANDOFF.md` rule that schema/backend edits need a written request first), resolve it client-side: the full `workOrders` prop is already available in `admin-dashboard-view.tsx` and each entry has `airConditionerId` + `status` + `id`, so look up `workOrders.find(wo => wo.airConditionerId === row.id && wo.status === "pending")` to get the work order id before calling `onAssignWorkOrder`.
  - Rename the card title from "กำหนดล้างแอร์" → **"รอซ่อมด่วน"**, and its empty-state text accordingly.
- **[MODIFY]** `src/components/admin/admin-dashboard-view.tsx`
  - Replace the `upcomingMaintenanceAcs` `useMemo` with a combined memo that:
    1. Maps `urgentUnits` → rows with `kind: "urgent"`.
    2. Maps the existing building-schedule walk → rows with `kind: "upcoming"`, **excluding any AC id already present in the urgent set** (avoid duplicate rows for a unit that is both broken and has an active schedule).
    3. Sorts urgent rows by priority rank (`ด่วนที่สุด` > `ด่วน` > default) then by `reportedAt` ascending; sorts upcoming rows by `nextDueDate` ascending; concatenates urgent-first.
  - Pass `onAssignWorkOrder` to `<UpcomingMaintenanceTable>`, implemented by reusing the existing assign-modal state machine already in this file (`showAssignModal`, `selectedOrderToAssign`, `handleAssignSubmit` → `assignWorkOrderAction`, ~lines 166-329): `onAssignWorkOrder` sets `selectedOrderToAssign` to the resolved work order id and calls `setShowAssignModal(true)` — no new modal needed.

---

## 3. Out of Scope

- No changes to `src/app/admin/actions.ts` or `prisma/schema.prisma` — all required data already exists.
- No changes to the Technician (`/tech`) or Super Admin (`/super-admin`) dashboards.
- Backlog #7, #8, #9 (calendar component reuse, BTU on kanban cards, cascading work-order form) are separate, not covered here.

## 4. Verification & Safety

1. Run `npx tsc --noEmit` to confirm the widened `metrics`/new `urgentUnits` types compile cleanly (this project has no test framework — see `HANDOFF.md`/`CLAUDE.md` — so typecheck + manual QA is the verification bar).
2. Manually check `/admin` Overview tab: confirm the 6-tile summary grid renders correctly at both desktop and mobile widths, and the urgent+upcoming merged table shows no duplicate AC rows.
3. Confirm the "มอบหมายช่าง" action on an urgent row and "สร้างใบงานล้างแอร์" on an upcoming row both still work end-to-end (existing actions, just newly wired from this table).

## 5. Next Steps

Upon user approval of this spec file, transition to the `writing-plans` skill to generate a step-by-step implementation plan.

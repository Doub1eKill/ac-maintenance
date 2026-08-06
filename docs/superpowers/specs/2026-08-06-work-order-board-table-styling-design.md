# Design Specification: Work Order Board — Scannable Table Styling

**Date:** 2026-08-06
**Status:** Approved by User
**Target:** Ad-hoc UI request from Esther03u ("ตารางอ่านยาก/ไม่โดดเด่น" — improve scanability of the ระบบจัดการงานซ่อมบำรุง / "กระดานใบงาน" table)

---

## 1. Overview & Objectives

The work order board table (`activeTab === "kanban"` in `admin-dashboard-view.tsx`, ~line 630-736) lists every work order with plain text rows and a single colored status pill. Users report it's hard to scan — nothing draws the eye to urgent or in-progress work, and all rows carry equal visual weight regardless of status or priority.

This is a pure frontend styling task. All data needed (`status`, `priority`) already exists on the `WorkOrderItem` prop shape — no backend changes required.

Separately, during scoping the user also asked for a "ประเภทงาน" (job type: repair vs. cleaning) column. That is **out of scope** here — it requires `airConditioner.status` to be added to the `workOrders` array returned by `getOrgAdminData()` (`src/app/admin/actions.ts`), which is backend and off-limits per `AGENTS.md`. That request is tracked separately in `HANDOFF.md` for DoubleKill.

---

## 2. Scope of Changes

**[MODIFY]** `src/components/admin/admin-dashboard-view.tsx` — only the `<tbody>` row rendering inside the kanban table (~line 663-732). No prop/type changes, no other tabs touched.

### A. Left status accent border (per `<tr>`)
Add `border-l-4` to each row, colored by `wo.status`:
- `pending` → `border-warning`
- `claimed` → `border-primary`
- `completed` → `border-success`

### B. Status icon inside the existing pill
Add a `lucide-react` icon before the label text in each of the three status `<span>` blocks (lines 694-708), reusing their existing background/text/border classes as-is:
- `pending` → `Clock`
- `claimed` → `Wrench`
- `completed` → `CheckCircle2`

All three (`Clock`, `Wrench`, `CheckCircle2`) are already imported from `lucide-react` in this file (line 5-30) — no import changes needed.

### C. Priority/age background tint (per `<tr>`)
Layered with (A), applied via conditional class on the same `<tr>`:
- `wo.priority === "critical"` → `bg-red-50/60`
- `wo.priority === "high"` → `bg-orange-50/40`
- `wo.status === "completed"` → `opacity-60` (overrides/combines to visually recede finished work)
- Anything else (`low`/`null`/unrecognized) → no extra tint, falls back to existing `hover:bg-muted` behavior

Priority tint and completed-opacity are independent conditions and can co-occur (e.g., a completed critical job keeps its tint but also fades).

### D. AC code emphasis
`รหัสแอร์` cell (line 669-671): bump from inherited `text-sm` to `text-base font-mono font-bold` so it anchors the row.

---

## 3. Error Handling

No new failure modes. All branches are additive ternary/conditional class strings with a no-op fallback (empty string) for unrecognized `status`/`priority` values — matches the existing pattern already used for the status pills. Nothing throws; worst case is a row with no extra tint/icon, which is the current behavior today.

---

## 4. Testing

Manual, in-browser (no test framework in this project for UI styling):
1. Dev server already running at `localhost:3000`.
2. Log in as `org_admin`, go to "กระดานใบงาน" tab.
3. Verify each status (pending/claimed/completed) shows correct border color + icon in the pill.
4. Verify `critical`/`high` priority work orders show the red/orange row tint; verify completed rows look visually receded.
5. Check responsive layout (narrow viewport) — border/tint shouldn't break the existing `overflow-x-auto` horizontal scroll.
6. Spot-check no TypeScript errors (`npx tsc --noEmit`).

---

## 5. Explicitly Out of Scope

- "ประเภทงาน" (job type) column — blocked on backend field, tracked in `HANDOFF.md` for DoubleKill.
- Any change to table columns, pagination, filtering, or sorting.
- Any change to the row click / modal / assign-technician behavior.

# Work Order Board Table Styling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the work order board table (`ระบบจัดการงานซ่อมบำรุง` / "กระดานใบงาน" tab) scannable at a glance via status-colored left borders, status icons inside the existing pills, priority/age background tint, and a more prominent AC code.

**Architecture:** Single-file, additive CSS-class change inside the existing `<tbody>` row-mapping block of `src/components/admin/admin-dashboard-view.tsx`. One small pure helper function computes the row's extra class string from `wo.status`/`wo.priority`; the three existing status `<span>` pills each gain a leading `lucide-react` icon. No new props, no backend changes, no new dependencies.

**Tech Stack:** React (client component, `"use client"`), Tailwind CSS utility classes, semantic theme tokens (`bg-warning`, `border-primary`, etc.) already used throughout this file, `lucide-react` icons already imported in this file.

## Global Constraints

- No emojis anywhere in UI — use `lucide-react` icons only (project-wide rule, `AGENTS.md`).
- Do not modify any file under `src/app/**/actions.ts`, `src/lib/**`, `src/app/api/**`, or `prisma/**` — backend is off-limits for this session (project rule, `HANDOFF.md` / `AGENTS.md`).
- Do not change the `WorkOrderItem` prop shape, table columns, pagination, filtering, sorting, or row click/modal behavior — out of scope per the approved design spec (`docs/superpowers/specs/2026-08-06-work-order-board-table-styling-design.md`, Section 5).
- Reuse existing semantic Tailwind tokens already in this file; do not introduce new color tokens outside the ones named in the spec (`bg-warning`, `border-primary`, `border-success`, `bg-red-50`, `bg-orange-50`).

---

## Task 1: Row accent border + priority/completed tint + AC code emphasis + status icons

**Files:**
- Modify: `src/components/admin/admin-dashboard-view.tsx:190` (add helper function near existing `priorityRank`)
- Modify: `src/components/admin/admin-dashboard-view.tsx:663-732` (kanban table row rendering)

**Interfaces:**
- Consumes: `WorkOrderItem` fields already in scope inside the component — `wo.status: string`, `wo.priority: string | null` (both already defined in the `WorkOrderItem` interface at line 67-86; no changes to that interface).
- Produces: nothing consumed by other tasks — this is the only task in this plan.

- [ ] **Step 1: Add the row class-name helper**

Locate this existing line (currently at `src/components/admin/admin-dashboard-view.tsx:190`):

```tsx
  const priorityRank = (p: string | null) => (p === "critical" ? 0 : p === "high" ? 1 : 2);
```

Add a new helper directly below it:

```tsx
  const priorityRank = (p: string | null) => (p === "critical" ? 0 : p === "high" ? 1 : 2);

  const getWorkOrderRowClassName = (wo: WorkOrderItem) => {
    const borderClass =
      wo.status === "pending" ? "border-warning" :
      wo.status === "claimed" ? "border-primary" :
      wo.status === "completed" ? "border-success" :
      "border-transparent";

    const tintClass =
      wo.priority === "critical" ? "bg-red-50/60" :
      wo.priority === "high" ? "bg-orange-50/40" :
      "";

    const fadeClass = wo.status === "completed" ? "opacity-60" : "";

    return `border-l-4 ${borderClass} ${tintClass} ${fadeClass}`.trim();
  };
```

- [ ] **Step 2: Apply the helper to the row `<tr>` and bump the AC code cell**

Locate this existing block (currently at `src/components/admin/admin-dashboard-view.tsx:663-671`):

```tsx
                    paginatedWorkOrders.map((wo) => (
                      <tr 
                        key={wo.id} 
                        className="hover:bg-muted transition-colors cursor-pointer"
                        onClick={() => setSelectedWorkOrderDetails(wo)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-foreground">
                          {wo.acCode}
                        </td>
```

Replace with:

```tsx
                    paginatedWorkOrders.map((wo) => (
                      <tr 
                        key={wo.id} 
                        className={`hover:bg-muted transition-colors cursor-pointer ${getWorkOrderRowClassName(wo)}`}
                        onClick={() => setSelectedWorkOrderDetails(wo)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-base text-foreground">
                          {wo.acCode}
                        </td>
```

- [ ] **Step 3: Add status icons to the three status pills**

Locate this existing block (currently at `src/components/admin/admin-dashboard-view.tsx:693-709`):

```tsx
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {wo.status === "pending" && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-warning/20 text-warning-foreground border border-warning/30">
                              รอดำเนินการ
                            </span>
                          )}
                          {wo.status === "claimed" && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/20 text-primary border border-primary/30">
                              กำลังดำเนินการ
                            </span>
                          )}
                          {wo.status === "completed" && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-success/20 text-success-foreground border border-success/30">
                              เสร็จสิ้น
                            </span>
                          )}
                        </td>
```

Replace with:

```tsx
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {wo.status === "pending" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-warning/20 text-warning-foreground border border-warning/30">
                              <Clock className="h-3 w-3" />
                              รอดำเนินการ
                            </span>
                          )}
                          {wo.status === "claimed" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/20 text-primary border border-primary/30">
                              <Wrench className="h-3 w-3" />
                              กำลังดำเนินการ
                            </span>
                          )}
                          {wo.status === "completed" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-success/20 text-success-foreground border border-success/30">
                              <CheckCircle2 className="h-3 w-3" />
                              เสร็จสิ้น
                            </span>
                          )}
                        </td>
```

`Clock`, `Wrench`, and `CheckCircle2` are already imported from `lucide-react` at the top of this file (line 5-30) — no import changes needed.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors (project currently builds with 0 TypeScript errors per `HANDOFF.md`; this change is class-string and JSX-only, so no type errors should be introduced).

- [ ] **Step 5: Manual browser verification**

The dev server is already running at `http://localhost:3000`.

1. Log in as an `org_admin` user.
2. Go to the "กระดานใบงาน" tab (`ระบบจัดการงานซ่อมบำรุง` section).
3. Confirm each row has a colored left border matching its status pill color: amber/warning for "รอดำเนินการ", primary/blue for "กำลังดำเนินการ", green for "เสร็จสิ้น".
4. Confirm each status pill now shows a small icon (clock / wrench / check) before its label.
5. If any work orders have `priority` "critical" or "high", confirm those rows show a light red/orange background tint.
6. Confirm "เสร็จสิ้น" (completed) rows look visually faded (`opacity-60`) compared to pending/claimed rows.
7. Confirm the รหัสแอร์ column text is visibly larger/more prominent than before.
8. Narrow the browser window (or use device toolbar) to confirm the table's existing `overflow-x-auto` horizontal scroll still works and nothing overflows/breaks.
9. Click a row to confirm the existing modal-open behavior (`onClick={() => setSelectedWorkOrderDetails(wo)}`) still works unchanged.
10. Click "จ่ายงาน" on a pending row to confirm `e.stopPropagation()` still prevents the modal from opening (button click shouldn't also trigger row click).

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/admin-dashboard-view.tsx
git commit -m "feat(admin): style work order board rows by status and priority"
```

---

## Post-Plan Follow-Up (not part of this plan's scope)

Per the design spec Section 5, write the "ประเภทงาน" (job type) backend request into `HANDOFF.md` (add `airConditioner.status` to the `workOrders` mapping in `getOrgAdminData()`, `src/app/admin/actions.ts:186-205`) so DoubleKill can pick it up. This is a separate, quick documentation edit — not a coding task — and should be done after this plan's Task 1 is committed.

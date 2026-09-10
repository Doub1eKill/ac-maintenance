# Implementation Plan: Admin Overview KPI, Table Filter & Technician Mobile Bottom Nav

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 3 key UX/UI upgrades: Top KPI Cards on Admin Overview, Segmented Tab Filtering on Upcoming Maintenance Table, and Mobile Bottom Navigation Bar for Technicians.

**Architecture:** Component-driven enhancement leveraging ReUI/Tailwind CSS v4 and Lucide SVG icons. Keep components modular, accessible, and responsive.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Lucide React, TanStack Table, ReUI / shadcn.

**Spec:** [docs/superpowers/specs/2026-09-11-admin-overview-kpi-filter-and-tech-mobile-nav-design.md](file:///c:/Users/LENOVO/OneDrive%20-%20Phuket%20Rajabhat%20University/Study/ปี_3/Project/ac-maintenance/docs/superpowers/specs/2026-09-11-admin-overview-kpi-filter-and-tech-mobile-nav-design.md)

## Global Constraints
- STRICT UI ICON STANDARD: ALWAYS use Lucide SVG icons. NEVER use emojis in UI.
- Adhere to ReUI theme tokens (`bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`, etc.).
- Maintain zero build errors (`npm run build`).

---

### Task 1: Executive Metric Cards (KPI Summary Grid) on `/admin` Overview

**Files:**
- Create: `src/components/admin/overview-metrics-grid.tsx`
- Modify: `src/components/admin/overview-panel.tsx`

**Interfaces:**
- Consumes: `metrics: { totalUnits: number; brokenOrCleaningUnits: number; repairUnits: number; cleaningUnits: number; pendingWorkOrders: number; activeTechsCount: number }`
- Produces: `<OverviewMetricsGrid metrics={metrics} />` component.

- [ ] **Step 1: Create `src/components/admin/overview-metrics-grid.tsx`**
- [ ] **Step 2: Modify `src/components/admin/overview-panel.tsx` to insert `<OverviewMetricsGrid />`**
- [ ] **Step 3: Test build & verify visual styling**

---

### Task 2: Segmented Filter on `UpcomingMaintenanceTable`

**Files:**
- Modify: `src/components/admin/upcoming-maintenance-table.tsx`

**Interfaces:**
- Consumes: `MaintenanceRow` data (`kind: "urgent" | "upcoming"`)
- Produces: Segmented tab controls (`all` | `urgent` | `upcoming`) with counts, filtering grouped lists dynamically.

- [ ] **Step 1: Add `filterKind` state and counts calculation in `UpcomingMaintenanceTable`**
- [ ] **Step 2: Render Segmented Control / Tab Filter buttons above table**
- [ ] **Step 3: Filter rows before passing into `groupByBuilding`**
- [ ] **Step 4: Update header label and empty states based on selected tab**
- [ ] **Step 5: Verify table filtering interactions**

---

### Task 3: Mobile Bottom Navigation Bar for Technicians (`/tech`)

**Files:**
- Create: `src/components/tech/tech-bottom-nav.tsx`
- Modify: `src/components/tech/tech-shell.tsx`

**Interfaces:**
- Consumes: `badges: { jobPool: number; myJobs: number }`, `onScanQr: () => void`
- Produces: `<TechBottomNav />` floating bottom bar for mobile screens (`md:hidden`).

- [ ] **Step 1: Create `src/components/tech/tech-bottom-nav.tsx`**
- [ ] **Step 2: Update `src/components/tech/tech-shell.tsx` to include `<TechBottomNav />` and bottom padding**
- [ ] **Step 3: Run `npm run build` and verify full system build**

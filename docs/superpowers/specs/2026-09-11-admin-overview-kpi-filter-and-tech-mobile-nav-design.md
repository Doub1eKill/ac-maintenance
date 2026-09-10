# Spec: Admin Overview KPI, Table Filter & Technician Mobile Bottom Nav

**Date:** 2026-09-11  
**Project:** AC Maintenance System (`ac-maintenance`)  
**Status:** Approved by User  

---

## 1. Objectives

Enhance UX/UI across both Admin and Field Technician experiences in 3 key areas:
1. **Admin Overview KPI Cards (`/admin`)**: Expose the passed-in `metrics` (`totalUnits`, `repairUnits`, `cleaningUnits`, `activeTechsCount`, `brokenOrCleaningUnits`) in a 4-column executive metric card grid at the top of the Overview panel.
2. **UpcomingMaintenanceTable Segmented Filter**: Allow admins to switch between `All`, `Urgent Only` (รอซ่อมด่วน), and `Upcoming Cleaning Only` (ถึงรอบล้าง) with badge counters to avoid scanning mixed rows.
3. **Technician Mobile Bottom Navigation Bar (`/tech`)**: Provide mobile-first thumb-zone navigation for field technicians with quick access to Job Pool, My Jobs (with badges), Center QR Scan button, Calendar, and Profile.

---

## 2. Design Specifications

### 2.1 Admin Overview KPI Cards (`src/components/admin/overview-metrics-grid.tsx`)
- **Card 1: เครื่องปรับอากาศทั้งหมด (Total Units)**
  - Value: `metrics.totalUnits`
  - Subtext / Gauge: Fleet Health % = `((totalUnits - brokenOrCleaningUnits) / totalUnits) * 100%`
  - Icon: `Snowflake` (ReUI primary brand tint)
- **Card 2: รอซ่อมด่วน (Urgent Repairs)**
  - Value: `metrics.repairUnits`
  - Subtext: "ต้องได้รับการซ่อมแซม"
  - Icon: `Wrench` (Destructive/Warning tint)
- **Card 3: ถึงรอบล้าง (Cleaning Due)**
  - Value: `metrics.cleaningUnits`
  - Subtext: "รอบบำรุงรักษาเชิงป้องกัน"
  - Icon: `Sparkles` (Amber/Warning tint)
- **Card 4: ช่างเทคนิคพร้อมปฏิบัติงาน (Active Techs)**
  - Value: `metrics.activeTechsCount`
  - Subtext: "กำลังออนไลน์ในระบบ"
  - Icon: `Users` (Success/Emerald tint)

### 2.2 Segmented Filter on `UpcomingMaintenanceTable`
- Add segmented control buttons:
  - `ทั้งหมด` (Count: total combined rows)
  - `แจ้งซ่อมด่วน` (Count: urgent count, `kind === 'urgent'`)
  - `ถึงรอบล้าง` (Count: upcoming count, `kind === 'upcoming'`)
- When switched, filter rows before grouping to ensure buildings/floors/rooms collapse or display only matching items.

### 2.3 Technician Mobile Bottom Nav (`src/components/tech/tech-bottom-nav.tsx`)
- Displayed only on `< md` screens (`md:hidden`).
- Floating or fixed at bottom with backdrop blur and border-t.
- 5 items:
  1. Job Pool (`/tech`) - `ClipboardList` + badge
  2. My Jobs (`/tech/my-jobs`) - `Wrench` + badge
  3. QR Scanner - Center primary action button - `QrCode` (calls `onScanQr`)
  4. Calendar (`/tech/calendar`) - `Calendar`
  5. Profile (`/tech/profile`) - `User`
- Prevent content obscuration with `pb-20 md:pb-0` in `tech-shell.tsx`.

---

## 3. Strict Guidelines
- Strict Vector SVG icons from `lucide-react`. Absolutely NO emojis.
- ReUI styling tokens (`bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`).

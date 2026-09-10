# Motion Design System Specification (`motion.dev`)

## Overview
Enhance the user experience (UX/UI) of the AC Maintenance system with a unified, high-performance Motion Design System using `motion` (v12 / `motion/react`). The goal is to provide fluid, responsive, micro-delight interactions across both the Admin Dashboard and Technician Mobile Portal while maintaining high accessibility, zero emoji usage (strict SVG icons only), and smooth 60fps performance.

## Design Principles
1. **Snappy & Natural**: Spring-based physics over static linear eases. Never make interactions feel sluggish or block workflows.
2. **Contextual Continuity**: Shared layout transitions (`layoutId`) for tabs and navigation to guide visual focus.
3. **Restraint & Purpose**: Animations serve functional communication (hierarchy, state change, feedback), not gratuitous distraction.
4. **Strict Accessibility**: Respect `prefers-reduced-motion` settings cleanly.

---

## 1. Core Motion Tokens & Primitives (`src/components/ui/motion/`)

### 1.1 Spring Tokens (`motion-tokens.ts`)
- **`snappy`**: `{ type: "spring", stiffness: 400, damping: 25 }` (Buttons, micro-taps, active tab pill)
- **`gentle`**: `{ type: "spring", stiffness: 260, damping: 20 }` (Cards, drawers, modals, accordion rows)
- **`bouncy`**: `{ type: "spring", stiffness: 500, damping: 15 }` (Badges, icon pulses)

### 1.2 Primitives
- **`MotionFade` & `MotionStagger`**:
  - Container variants with configurable `staggerChildren: 0.05` and `delayChildren: 0.02`.
  - Child variants with subtle `y: 12 -> 0` and `opacity: 0 -> 1`.
- **`MotionCard`**:
  - Drops into existing Card components.
  - Hover elevation: `y: -3`, slight shadow expansion.
  - Tap feedback: `scale: 0.985`.
- **`MotionActivePill`**:
  - Floating pill using `layoutId` (e.g. `admin-tab-indicator` or `tech-nav-pill`) with `borderRadius: "inherit"`.
- **`MotionNumber`**:
  - Numeric rolling/interpolating counter component for dashboard metrics.
- **`MotionModalContainer`**:
  - Dialog content wrapper with `scale: 0.95 -> 1`, `opacity: 0 -> 1` on enter, exit with clean fade-scale.

---

## 2. Admin Portal Enhancements

### 2.1 Overview Metrics & Charts (`overview-metrics-grid.tsx`)
- Wrap metrics cards in `<MotionStagger>` for initial page entry.
- Integrate `<MotionNumber>` for key figures (Total ACs, Pending Work Orders, Urgent Alerts).
- Add `<MotionCard>` hover lift and subtle border glow.

### 2.2 Navigation Tabs (`admin-shell.tsx`)
- Active tab pill with `layoutId="admin-active-tab"`.
- Smooth slide between Overview, Assets, Maintenance, QR Codes, Team, Settings.

### 2.3 Tables & Asset Manager (`upcoming-maintenance-table.tsx`, `asset-manager.tsx`)
- Staggered row appearance on initial load and search/filter changes.
- Smooth row expand/collapse animation for unit details and maintenance logs using `layout`.
- Action buttons with snappy spring tap feedback.

### 2.4 Modals & Dialogs (`work-order-detail-dialog.tsx`, `create-work-order-modal.tsx`)
- Spring modal entrance with `AnimatePresence`.
- Tab transitions within work order details.

---

## 3. Technician Mobile Portal Enhancements

### 3.1 Mobile Bottom Navigation (`tech-bottom-nav.tsx`)
- Floating active pill indicator (`layoutId="tech-nav-pill"`).
- Icon micro-tap spring bounce on tab selection.

### 3.2 Shell & Tab Page Content (`tech-shell.tsx`)
- Fluid horizontal slide/fade transition when switching between Job Pool, My Tasks, Catalogue, and Assets.

### 3.3 Job Lists & Cards (`job-pool-panel.tsx`, `my-jobs-panel.tsx`)
- Staggered list cascade on load.
- Gentle pulse on Urgent job status badge.
- `AnimatePresence` exit animation when a job is accepted or completed.

### 3.4 Modals & Sheets (`log-action-modal.tsx`, `qr-scan-modal.tsx`)
- Slide-up bottom sheet physics on mobile viewport.
- Smooth photo upload thumbnail pop-in with layout animation on deletion.

---

## 4. Verification & Testing
- Automated build check: `npm run build` to ensure all `motion/react` imports and TypeScript types compile cleanly.
- Browser DevTools & Motion verification: Inspect 60fps frame rate, verify reduced-motion behavior, and confirm zero layout jumps.

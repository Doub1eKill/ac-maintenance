# Design Specification: Remove Financial and Budget Management System

**Date:** 2026-07-26  
**Status:** Approved by User (Option 2 - Total Purge)  
**Target:** Focus system strictly on Maintenance History, Equipment Tracking, and Cleaning Schedules.

---

## 1. Overview & Objectives

The user requested the complete removal of the Financial and Budget Management System ("ระบบการเงินและงบประมาณ") from the `ac-maintenance` application. The application will center exclusively on tracking air conditioner assets, maintenance logs, work order lifecycle, and cleaning due dates.

All cost calculations, expense breakdowns, budget tabs, and `estimatedCost` data model fields will be completely removed across the frontend, server actions, API routes, and Prisma schema.

---

## 2. Scope of Changes

### A. Prisma Database Schema (`prisma/schema.prisma`)
- **[MODIFY]** `prisma/schema.prisma`
  - Remove `estimatedCost Decimal? @map("estimated_cost") @db.Decimal(10, 2)` field from `model WorkOrder`.
  - Regenerate Prisma client using `npx prisma generate`.

### B. UI Components & Layouts
- **[DELETE]** `src/components/admin/financial-dashboard-view.tsx`
  - Completely delete this component file.
- **[MODIFY]** `src/components/admin/admin-dashboard-view.tsx`
  - Remove `FinancialDashboardView` import.
  - Remove `financialMetrics` prop from `AdminDashboardViewProps`.
  - Remove `financials` tab item (`id: "financials"`, `label: "การเงิน & งบประมาณ"`).
  - Remove rendering container `{activeTab === "financials" && ...}`.

### C. Server Actions & Page Loaders
- **[MODIFY]** `src/app/admin/actions.ts`
  - Remove financial calculations (YTD spend, building costs, monthly costs, action costs, AC repair costs, expense ledgers).
  - Remove `financialMetrics` from return payload of `getAdminDashboardData()`.
- **[MODIFY]** `src/app/admin/page.tsx`
  - Remove passing of `financialMetrics` prop to `AdminDashboardView`.

### D. Work Order Completion API
- **[MODIFY]** `src/app/api/tech/work-orders/[id]/complete/route.ts`
  - Remove `estimatedCost` from request body destructuring.
  - Remove `estimatedCost` assignment in `prisma.workOrder.update`.
  - Remove `estimatedCost` from audit log `newValues`.

---

## 3. Verification & Safety

1. Run `npx prisma generate` to ensure the Prisma client schema is re-generated cleanly without `estimatedCost`.
2. Run `npm run build` or typecheck to confirm zero TypeScript compilation errors across all pages and actions.
3. Test Admin Dashboard to verify tab navigation operates cleanly without the financial tab.

---

## 4. Next Steps
Upon user approval of this spec file, transition to the `writing-plans` skill to generate a step-by-step implementation plan.

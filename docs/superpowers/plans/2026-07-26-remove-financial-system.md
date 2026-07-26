# Remove Financial and Budget System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely purge all financial, budget, cost, and expense tracking features from the application, focusing the system purely on air conditioner maintenance history and cleaning schedules.

**Architecture:** Remove `estimatedCost` from Prisma model `WorkOrder`, delete `FinancialDashboardView` UI component, remove financial metric calculations from admin server actions, and strip `estimatedCost` parameters from API handlers.

**Tech Stack:** Next.js 16 (App Router), Prisma 7, React, TypeScript, Tailwind CSS v4, Lucide Icons.

## Global Constraints

- **Strict UI Icon Standard:** Use `lucide-react` SVG icons exclusively for all UI elements (No emojis in UI components).
- **Prisma v7 Driver Adapter:** Maintain `@prisma/adapter-mariadb` configuration in `src/lib/prisma.ts`.
- **Tenant Isolation:** Enforce `university_id` boundaries across all routes and actions.

---

### Task 1: Clean Prisma Database Schema & Regenerate Client

**Files:**
- Modify: `prisma/schema.prisma:220-251`

**Interfaces:**
- Consumes: Prisma schema specification
- Produces: Updated `@/generated/prisma` client without `estimatedCost` field on `WorkOrder`

- [ ] **Step 1: Remove `estimatedCost` field from `prisma/schema.prisma`**

Edit `prisma/schema.prisma` inside `model WorkOrder`:
```prisma
model WorkOrder {
  id               BigInt          @id @default(autoincrement()) @db.UnsignedBigInt
  airConditionerId BigInt          @map("air_conditioner_id") @db.UnsignedBigInt
  universityId     BigInt          @map("university_id") @db.UnsignedBigInt
  status           WorkOrderStatus @default(pending)
  claimedBy        BigInt?         @map("claimed_by") @db.UnsignedBigInt
  claimedAt        DateTime?       @map("claimed_at") @db.Timestamp(0)
  completedAt      DateTime?       @map("completed_at") @db.Timestamp(0)
  createdAt        DateTime?       @map("created_at") @db.Timestamp(0)
  updatedAt        DateTime?       @map("updated_at") @db.Timestamp(0)
```

- [ ] **Step 2: Regenerate Prisma Client**

Run command:
`npx prisma generate`
Expected: `✔ Generated Prisma Client`

---

### Task 2: Remove Financial Component & Update Admin Dashboard UI

**Files:**
- Delete: `src/components/admin/financial-dashboard-view.tsx`
- Modify: `src/components/admin/admin-dashboard-view.tsx:30-40,100-120,240-250,630-638`

**Interfaces:**
- Consumes: Cleaned `AdminDashboardViewProps`
- Produces: Admin Dashboard UI without Financials tab

- [ ] **Step 1: Delete `financial-dashboard-view.tsx` file**

Delete file: `src/components/admin/financial-dashboard-view.tsx`

- [ ] **Step 2: Update `admin-dashboard-view.tsx`**

1. Remove import: `import { FinancialDashboardView } from "@/components/admin/financial-dashboard-view";`
2. Remove `financialMetrics` prop from `AdminDashboardViewProps` interface.
3. Remove `financialMetrics` destructuring in `AdminDashboardView` function signature.
4. Remove nav item `{ id: "financials", label: "การเงิน & งบประมาณ", icon: DollarSign/Receipt }` from `navItems` array.
5. Remove `{activeTab === "financials" && <FinancialDashboardView ... />}` section from JSX.

---

### Task 3: Strip Financial Calculations from Admin Server Actions & Page

**Files:**
- Modify: `src/app/admin/actions.ts:200-350`
- Modify: `src/app/admin/page.tsx:30-55`

**Interfaces:**
- Consumes: Cleaned `getAdminDashboardData()` payload
- Produces: Admin Dashboard page free of financial data processing

- [ ] **Step 1: Update `src/app/admin/actions.ts`**

Remove the `buildingCosts`, `monthlyCosts`, `actionCosts`, `acCosts`, and `financialMetrics` calculation logic. Ensure `getAdminDashboardData()` returns only:
`{ stats, latestWorkOrders, upcomingMaintenance, maintenanceHistory, users, acUnits, dbError }`

- [ ] **Step 2: Update `src/app/admin/page.tsx`**

Remove destructuring of `financialMetrics` from `await getAdminDashboardData()` and remove `financialMetrics` prop passed to `<AdminDashboardView />`.

---

### Task 4: Clean Work Order Complete API Route

**Files:**
- Modify: `src/app/api/tech/work-orders/[id]/complete/route.ts:35,56,86`

**Interfaces:**
- Consumes: Technician work order completion request
- Produces: Work order completion handler without `estimatedCost`

- [ ] **Step 1: Update `route.ts`**

1. Remove `estimatedCost` from body destructuring (`const { action, notes, beforePhotoUrl, afterPhotoUrl, customerSignatureUrl } = body;`).
2. Remove `estimatedCost: estimatedCost ? Number(estimatedCost) : null,` from `tx.workOrder.update` data payload.
3. Remove `estimatedCost` from `logAudit` `newValues` object.

---

### Task 5: Build & Typecheck Verification

**Files:**
- Verification only

- [ ] **Step 1: Run TypeScript compiler / Next.js build verification**

Run command:
`npx tsc --noEmit`
Expected output: No errors.

- [ ] **Step 2: Commit changes**

Git commit message: `refactor: purge financial and budget system from codebase`

# Financial & Asset Dashboard Design Spec

## 1. Goal
Provide organization administrators (org_admin) with a professional, enterprise-grade Financial Dashboard to track maintenance budgets, analyze asset lifecycles, and optimize maintenance costs via actionable insights (identifying high-cost AC units).

## 2. Architecture & Data Flow
- **Data Source:** `MaintenanceLog` and `WorkOrder` tables.
- **Server Actions (`src/app/admin/actions.ts`):** 
  - Need a new function `getFinancialMetrics()` or augment `getOrgAdminData()` to return financial aggregates.
  - Query total `estimatedCost` for YTD spend.
  - Query maintenance logs/work orders with cost breakdown (parts vs. labor).
  - Aggregate costs per `AirConditioner` to rank the Top 10 most expensive units.
- **Frontend Components (`src/components/admin/financial-dashboard-view.tsx`):**
  - KPI Cards: YTD Spend, Avg Cost/Repair, Top Expensive Building, Total Work Orders.
  - Charts (Recharts): Monthly Trend (Bar), Cost Breakdown (Donut/Pie).
  - Data Tables: "Top 10 Expensive ACs" and "Detailed Financial Ledger" (with Excel export placeholder).

## 3. UI/UX Considerations
- Use the established "BizLink" enterprise aesthetic (slate colors, clean borders).
- Ensure Recharts visualizations are responsive.
- Empty states for when there's no financial data recorded yet.

## 4. Required Database Updates
- `schema.prisma` currently has `estimatedCost` on `WorkOrder`.
- To provide a true "Parts vs Labor" breakdown, we may need to use `notes` or add `partsCost` / `laborCost` if not already present. For now, we will simulate the breakdown or rely on standard estimates, or use action types (cleaning vs repair) to categorize costs if fields aren't added. *Assumption: We will rely on `estimatedCost` and categorize by `action` (Cleaning, Repair, Refill) to determine cost breakdown.*

## 5. Security & Access
- Route restricted to `org_admin` or `super_admin` only.
- Tenant isolation: Queries must be scoped to the user's `universityId`.

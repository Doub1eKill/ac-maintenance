# Org Admin System Settings Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the "ตั้งค่าระบบ" (System Settings) tab for org_admin — currently a dead sidebar nav item with no content — as four cards: default maintenance frequency, organisation info, AC brand/model management (merged in from the standalone `/admin/master-data` route), and an audit log placeholder. Also add a "รีเซ็ตรหัสผ่าน" action to the existing team management table.

**Architecture:** A new self-contained tab-content component (`settings-panel.tsx`, following the existing `profile-panel.tsx` pattern) rendered from `admin-dashboard-view.tsx` when `activeTab === "settings"`. One card (AC brand/model) reuses the existing, fully-functional `MasterDataClient` component and its Server Actions unchanged. The other three cards are editable-but-not-yet-persisted placeholders — per project rule, this session cannot write `prisma/schema.prisma`, `src/app/**/actions.ts`, `src/app/api/**`, or `src/lib/**`, so anything needing new backend logic ships as a working UI that shows a "not connected to backend yet" notice on save, with the exact backend request logged in `HANDOFF.md` for a separate backend developer.

**Tech Stack:** React 19 (`useState`), Next.js App Router (`next/navigation`'s `useRouter` for a client-side refresh), existing `src/components/ui/*` primitives (`Alert`/`AlertTitle`/`AlertDescription`, `NativeSelect`/`NativeSelectOption`, `ConfirmActionDialog` from `thai-alert-dialogs.tsx`), `lucide-react` icons, Tailwind CSS v4 with the project's existing `biz-card` hand-styled convention (not a new ReUI `Card` — matches neighboring `profile-panel.tsx`/`team-panel.tsx`).

## Global Constraints

- **Backend is off-limits this round** (`HANDOFF.md:3-11`): do not modify `prisma/schema.prisma`, any `src/app/**/actions.ts`, `src/app/api/**`, or `src/lib/**`. Every task below only touches component files, one page-component wiring file (`src/app/admin/page.tsx`, not an actions file), and `HANDOFF.md` itself. Calling an *existing, already-exported* Server Action (`getAcMasterData`, `createAcBrandAction`, `createAcModelAction`) from a new call site is allowed — that's using backend, not writing it.
- No emojis anywhere in UI — use `lucide-react` icons only (project-wide rule, `AGENTS.md`).
- No test framework exists in this project for UI (confirmed by precedent plans `2026-08-06-work-order-board-table-styling.md` and `2026-08-09-org-admin-profile-page.md`) — verification is `npx tsc --noEmit` + manual browser check, not automated tests.
- Use `interface`/explicit types per project TypeScript style; no new `any` (an existing `brands: any[]` in `admin-dashboard-view.tsx` predates this plan and is left untouched — not this plan's scope to fix).
- All new UI copy is Thai, matching the tone/phrasing already used in `profile-panel.tsx` and `team-panel.tsx`.
- Design spec: `docs/superpowers/specs/2026-08-16-org-admin-system-settings-page-design.md` — every task below implements a section of it.

---

## Task 1: Prepare `master-data-client.tsx` for reuse inside the settings tab

**Files:**
- Modify: `src/app/admin/master-data/master-data-client.tsx`

**Interfaces:**
- Consumes: nothing from other tasks (first task in this plan).
- Produces: exported types `BrandType` and `ModelType`, consumed by Task 2 (`settings-panel.tsx`) and Task 3 (`admin-dashboard-view.tsx`).

- [ ] **Step 1: Export the existing local types and add the router import**

Locate this existing block (currently `master-data-client.tsx:1-20`):

```tsx
"use client";

import { useState, useRef, useTransition } from "react";
import { createAcBrandAction, createAcModelAction } from "./actions";
import { Plus, Check, ChevronDown, ChevronRight, Wind } from "lucide-react";

type ModelType = {
  id: string;
  brandId: string;
  name: string;
  defaultBtu: number | null;
};

type BrandType = {
  id: string;
  name: string;
  modelsCount: number;
  acCount: number;
  models: ModelType[];
};
```

Replace with:

```tsx
"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAcBrandAction, createAcModelAction } from "./actions";
import { Plus, Check, ChevronDown, ChevronRight, Wind } from "lucide-react";

export type ModelType = {
  id: string;
  brandId: string;
  name: string;
  defaultBtu: number | null;
};

export type BrandType = {
  id: string;
  name: string;
  modelsCount: number;
  acCount: number;
  models: ModelType[];
};
```

- [ ] **Step 2: Refresh the page after a successful brand creation**

Locate this existing block (currently `master-data-client.tsx:52-65`, the start of `AddBrandCard`):

```tsx
function AddBrandCard() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await createAcBrandAction(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(true);
        formRef.current?.reset();
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  };
```

Replace with:

```tsx
function AddBrandCard() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await createAcBrandAction(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(true);
        formRef.current?.reset();
        setTimeout(() => setSuccess(false), 3000);
        router.refresh();
      }
    });
  };
```

Why this is needed: `createAcBrandAction` calls `revalidatePath("/admin/master-data")` (inside `actions.ts`, which this plan does not touch). Once Task 4 deletes that route, revalidating it becomes a no-op — without an explicit client-side refresh, a newly-created brand would not appear in the list until a manual page reload.

- [ ] **Step 3: Refresh the page after a successful model creation**

Locate this existing block (currently `master-data-client.tsx:109-128`, the start of `BrandItem`):

```tsx
function BrandItem({ brand, isExpanded, onToggle }: { brand: BrandType, isExpanded: boolean, onToggle: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleAddModel = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("brandId", brand.id);
    setError(null);

    startTransition(async () => {
      const result = await createAcModelAction(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        formRef.current?.reset();
      }
    });
  };
```

Replace with:

```tsx
function BrandItem({ brand, isExpanded, onToggle }: { brand: BrandType, isExpanded: boolean, onToggle: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleAddModel = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("brandId", brand.id);
    setError(null);

    startTransition(async () => {
      const result = await createAcModelAction(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        formRef.current?.reset();
        router.refresh();
      }
    });
  };
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors attributable to `master-data-client.tsx`.

- [ ] **Step 5: Manual browser verification (old route still works, unchanged behavior)**

Start the dev server if it isn't already running, log in as `org_admin`, navigate to `/admin/master-data` (still exists until Task 4).

1. Add a new brand → confirm it appears in the list without a manual reload (this is the `router.refresh()` addition; previously it also worked, via `revalidatePath`, so behavior should look identical).
2. Expand a brand, add a new model → confirm it appears in that brand's model list without a manual reload.
3. Try adding a brand with a name that already exists → confirm the existing inline error message ("มียี่ห้อนี้อยู่ในระบบแล้ว") still renders correctly.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/master-data/master-data-client.tsx
git commit -m "refactor(master-data): export shared types and refresh after mutations"
```

---

## Task 2: Build the `SettingsPanel` component

**Files:**
- Create: `src/components/admin/settings-panel.tsx`

**Interfaces:**
- Consumes: `BrandType` from `src/app/admin/master-data/master-data-client.tsx` (Task 1), `MasterDataClient` component (existing, unmodified), `Alert`/`AlertTitle`/`AlertDescription` from `src/components/ui/alert.tsx` (existing), `NativeSelect`/`NativeSelectOption` from `src/components/ui/native-select.tsx` (existing).
- Produces: `SettingsPanel` component with props `{ brands: BrandType[]; universityName: string }`, consumed by Task 3.

- [ ] **Step 1: Create the file**

Create `src/components/admin/settings-panel.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Clock, Building2, History, Wind, AlertTriangle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { MasterDataClient, type BrandType } from "@/app/admin/master-data/master-data-client";

interface SettingsPanelProps {
  brands: BrandType[];
  universityName: string;
}

// Shared by every card whose "save" action has no backend to persist to
// yet — see docs/superpowers/specs/2026-08-16-org-admin-system-settings-page-design.md
// Section 0. The corresponding backend request is logged in HANDOFF.md (S4/S5/S6).
function NotConnectedAlert() {
  return (
    <Alert className="border-warning/30 bg-warning/10">
      <AlertTriangle className="text-warning" />
      <AlertTitle>ยังไม่เชื่อมต่อกับระบบหลังบ้าน</AlertTitle>
      <AlertDescription>
        มีการฝากคำขอไว้ให้ทีม Backend แล้ว การเปลี่ยนแปลงนี้ยังไม่ถูกบันทึก
      </AlertDescription>
    </Alert>
  );
}

export function SettingsPanel({ brands, universityName }: SettingsPanelProps) {
  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in">
      <DefaultFrequencyCard />
      <OrganisationInfoCard universityName={universityName} />
      <MasterDataCard brands={brands} />
      <AuditLogCard />
    </div>
  );
}

function DefaultFrequencyCard() {
  const [value, setValue] = useState("6");
  const [unit, setUnit] = useState("months");
  const [showNotice, setShowNotice] = useState(false);

  return (
    <div className="biz-card p-6 space-y-4">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" />
        รอบซ่อมบำรุงเริ่มต้น
      </h3>
      <p className="text-xs text-muted-foreground">
        ใช้เป็นค่าเริ่มต้นเมื่อเพิ่มเครื่องปรับอากาศใหม่เข้าระบบ มีผลกับเครื่องที่เพิ่มใหม่เท่านั้น
        ไม่กระทบเครื่องที่มีรอบตั้งไว้แล้ว
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label htmlFor="default-frequency-value" className="mb-1.5 block text-xs font-bold text-foreground">
            จำนวน
          </label>
          <input
            id="default-frequency-value"
            type="number"
            min={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="default-frequency-unit" className="mb-1.5 block text-xs font-bold text-foreground">
            หน่วย
          </label>
          <NativeSelect id="default-frequency-unit" value={unit} onChange={(e) => setUnit(e.target.value)}>
            <NativeSelectOption value="days">วัน</NativeSelectOption>
            <NativeSelectOption value="months">เดือน</NativeSelectOption>
            <NativeSelectOption value="years">ปี</NativeSelectOption>
          </NativeSelect>
        </div>
      </div>

      {showNotice && <NotConnectedAlert />}

      <button
        type="button"
        onClick={() => setShowNotice(true)}
        className="w-full sm:w-auto rounded-xl bg-foreground px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90 transition-colors"
      >
        บันทึก
      </button>
    </div>
  );
}

function OrganisationInfoCard({ universityName }: { universityName: string }) {
  const [name, setName] = useState(universityName);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [showNotice, setShowNotice] = useState(false);

  return (
    <div className="biz-card p-6 space-y-4">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" />
        ข้อมูลองค์กร
      </h3>

      <div className="space-y-4">
        <div>
          <label htmlFor="org-name" className="mb-1.5 block text-xs font-bold text-foreground">
            ชื่อหน่วยงาน
          </label>
          <input
            id="org-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
          />
        </div>
        <div>
          <label htmlFor="org-address" className="mb-1.5 block text-xs font-bold text-foreground">
            ที่อยู่
          </label>
          <input
            id="org-address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="ยังไม่ได้ระบุ"
            className="w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
          />
        </div>
        <div>
          <label htmlFor="org-phone" className="mb-1.5 block text-xs font-bold text-foreground">
            เบอร์โทร
          </label>
          <input
            id="org-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="ยังไม่ได้ระบุ"
            className="w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
          />
        </div>
      </div>

      {showNotice && <NotConnectedAlert />}

      <button
        type="button"
        onClick={() => setShowNotice(true)}
        className="w-full sm:w-auto rounded-xl bg-foreground px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90 transition-colors"
      >
        บันทึก
      </button>
    </div>
  );
}

function MasterDataCard({ brands }: { brands: BrandType[] }) {
  const totalModels = brands.reduce((sum, b) => sum + b.modelsCount, 0);

  return (
    <div className="biz-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Wind className="h-4 w-4 text-primary" />
          จัดการยี่ห้อ/รุ่นแอร์
        </h3>
        <span className="text-xs font-bold text-muted-foreground">
          {brands.length} ยี่ห้อ • {totalModels} รุ่น
        </span>
      </div>
      <MasterDataClient initialBrands={brands} />
    </div>
  );
}

function AuditLogCard() {
  return (
    <div className="biz-card p-6 space-y-4">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <History className="h-4 w-4 text-primary" />
        ประวัติการใช้งานระบบ
      </h3>
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
        <History className="h-6 w-6 text-muted-foreground" />
        <p className="text-xs text-muted-foreground max-w-xs">
          ประวัติการใช้งานระบบจะแสดงที่นี่ เมื่อ Backend เปิดให้ดึงข้อมูลจากตาราง audit log
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors from `settings-panel.tsx` (it is not imported anywhere yet, so this only validates the file compiles in isolation — full end-to-end rendering is verified in Task 3).

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/settings-panel.tsx
git commit -m "feat(admin): add SettingsPanel component with 4 cards"
```

---

## Task 3: Wire `SettingsPanel` into the admin dashboard and merge in AC master data

**Files:**
- Modify: `src/app/admin/page.tsx`
- Modify: `src/components/admin/admin-dashboard-view.tsx`

**Interfaces:**
- Consumes: `SettingsPanel` (Task 2), `BrandType` + `getAcMasterData()` (Task 1 / existing `src/app/admin/master-data/actions.ts`, unmodified).
- Produces: the "ตั้งค่าระบบ" tab fully renders in the browser; `master_data` nav item removed (superseded by the settings tab's third card).

- [ ] **Step 1: Fetch AC master data in `admin/page.tsx` and pass it down**

Locate this existing block (currently `src/app/admin/page.tsx:1-9`):

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOrgAdminData } from "./actions";
import { AdminDashboardView } from "@/components/admin/admin-dashboard-view";

export const metadata = {
  title: "Org Admin Dashboard | AC Maintenance System",
  description: "ระบบบริหารจัดการเครื่องปรับอากาศและออกใบงานซ่อมบำรุงมหาวิทยาลัย",
};
```

Replace with:

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOrgAdminData } from "./actions";
import { getAcMasterData } from "./master-data/actions";
import { AdminDashboardView } from "@/components/admin/admin-dashboard-view";

export const metadata = {
  title: "Org Admin Dashboard | AC Maintenance System",
  description: "ระบบบริหารจัดการเครื่องปรับอากาศและออกใบงานซ่อมบำรุงมหาวิทยาลัย",
};
```

Locate this existing block (currently `src/app/admin/page.tsx:21-56`):

```tsx
  const {
    dbError,
    universityName,
    profile,
    metrics,
    workOrders,
    buildings,
    allAcUnits,
    pendingUsers,
    allUsers,
    brands,
    weeklyActivity,
    urgentUnits,
  } = await getOrgAdminData();

  return (
    <AdminDashboardView
      user={{
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      }}
      dbError={dbError}
      universityName={universityName}
      profile={profile}
      metrics={metrics}
      workOrders={workOrders}
      buildings={buildings}
      allAcUnits={allAcUnits}
      pendingUsers={pendingUsers}
      allUsers={allUsers}
      brands={brands || []}
      weeklyActivity={weeklyActivity}
      urgentUnits={urgentUnits}
    />
  );
}
```

Replace with:

```tsx
  const {
    dbError,
    universityName,
    profile,
    metrics,
    workOrders,
    buildings,
    allAcUnits,
    pendingUsers,
    allUsers,
    brands,
    weeklyActivity,
    urgentUnits,
  } = await getOrgAdminData();
  const { brands: masterDataBrands } = await getAcMasterData();

  return (
    <AdminDashboardView
      user={{
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      }}
      dbError={dbError}
      universityName={universityName}
      profile={profile}
      metrics={metrics}
      workOrders={workOrders}
      buildings={buildings}
      allAcUnits={allAcUnits}
      pendingUsers={pendingUsers}
      allUsers={allUsers}
      brands={brands || []}
      masterDataBrands={masterDataBrands}
      weeklyActivity={weeklyActivity}
      urgentUnits={urgentUnits}
    />
  );
}
```

- [ ] **Step 2: Update imports in `admin-dashboard-view.tsx`**

Locate this existing block (currently `admin-dashboard-view.tsx:1-39`):

```tsx
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createWorkOrderAction, updateUserStatusByOrgAdminAction, assignWorkOrderAction } from "@/app/admin/actions";
import {
  Building2,
  Snowflake,
  AlertTriangle,
  ClipboardList,
  Clock,
  X,
  Calendar,
  Users,
  QrCode,
  User,
  Settings,
  Database,
} from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";
import dynamic from "next/dynamic";
import { DashboardLayout, NavItem } from "@/components/layout/dashboard-layout";
import { AssetManager } from "@/components/admin/asset-manager";
import { ProfilePanel } from "@/components/admin/profile-panel";
import { QrCodeManager } from "@/components/admin/qr-code-manager";
import { OverviewPanel } from "@/components/admin/overview-panel";
import { WorkOrderBoard } from "@/components/admin/work-order-board";
import { UserApprovalsPanel } from "@/components/admin/user-approvals-panel";
import { TeamPanel } from "@/components/admin/team-panel";
import { CreateWorkOrderModal } from "@/components/admin/create-work-order-modal";
import { AssignWorkOrderModal } from "@/components/admin/assign-work-order-modal";
import { WorkOrderDetailDialog } from "@/components/admin/work-order-detail-dialog";
import type { WorkOrderItem, BuildingItem, PendingUser } from "@/components/admin/types";
import type { UrgentMaintenanceAC } from "@/components/admin/upcoming-maintenance-table";
```

Replace with (drops the now-unused `Database` icon import, adds `SettingsPanel` and `BrandType`):

```tsx
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createWorkOrderAction, updateUserStatusByOrgAdminAction, assignWorkOrderAction } from "@/app/admin/actions";
import {
  Building2,
  Snowflake,
  AlertTriangle,
  ClipboardList,
  Clock,
  X,
  Calendar,
  Users,
  QrCode,
  User,
  Settings,
} from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";
import dynamic from "next/dynamic";
import { DashboardLayout, NavItem } from "@/components/layout/dashboard-layout";
import { AssetManager } from "@/components/admin/asset-manager";
import { ProfilePanel } from "@/components/admin/profile-panel";
import { SettingsPanel } from "@/components/admin/settings-panel";
import { QrCodeManager } from "@/components/admin/qr-code-manager";
import { OverviewPanel } from "@/components/admin/overview-panel";
import { WorkOrderBoard } from "@/components/admin/work-order-board";
import { UserApprovalsPanel } from "@/components/admin/user-approvals-panel";
import { TeamPanel } from "@/components/admin/team-panel";
import { CreateWorkOrderModal } from "@/components/admin/create-work-order-modal";
import { AssignWorkOrderModal } from "@/components/admin/assign-work-order-modal";
import { WorkOrderDetailDialog } from "@/components/admin/work-order-detail-dialog";
import type { WorkOrderItem, BuildingItem, PendingUser } from "@/components/admin/types";
import type { UrgentMaintenanceAC } from "@/components/admin/upcoming-maintenance-table";
import type { BrandType } from "@/app/admin/master-data/master-data-client";
```

- [ ] **Step 3: Add the `masterDataBrands` prop**

Locate this existing block (currently `admin-dashboard-view.tsx:57-103`):

```tsx
interface AdminDashboardViewProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
  dbError?: string | null;
  universityName: string;
  profile: {
    name: string;
    email: string;
    role?: string | null;
    phone: string | null;
  };
  metrics: {
    totalUnits: number;
    brokenOrCleaningUnits: number;
    repairUnits: number;
    cleaningUnits: number;
    pendingWorkOrders: number;
    activeTechsCount: number;
    pendingUsersCount?: number;
  };
  weeklyActivity: Array<{ day: string; repairs: number }>;
  urgentUnits: UrgentMaintenanceAC[];
  workOrders: WorkOrderItem[];
  buildings: BuildingItem[];
  allAcUnits: Array<{ id: string; label: string }>;
  pendingUsers?: PendingUser[];
  allUsers?: PendingUser[];
  brands: any[];
}

export function AdminDashboardView({
  user,
  dbError,
  universityName,
  profile,
  metrics,
  weeklyActivity = [],
  workOrders,
  buildings,
  pendingUsers = [],
  allUsers = [],
  brands = [],
  urgentUnits = [],
}: AdminDashboardViewProps) {
```

Replace with:

```tsx
interface AdminDashboardViewProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
  dbError?: string | null;
  universityName: string;
  profile: {
    name: string;
    email: string;
    role?: string | null;
    phone: string | null;
  };
  metrics: {
    totalUnits: number;
    brokenOrCleaningUnits: number;
    repairUnits: number;
    cleaningUnits: number;
    pendingWorkOrders: number;
    activeTechsCount: number;
    pendingUsersCount?: number;
  };
  weeklyActivity: Array<{ day: string; repairs: number }>;
  urgentUnits: UrgentMaintenanceAC[];
  workOrders: WorkOrderItem[];
  buildings: BuildingItem[];
  allAcUnits: Array<{ id: string; label: string }>;
  pendingUsers?: PendingUser[];
  allUsers?: PendingUser[];
  brands: any[];
  masterDataBrands: BrandType[];
}

export function AdminDashboardView({
  user,
  dbError,
  universityName,
  profile,
  metrics,
  weeklyActivity = [],
  workOrders,
  buildings,
  pendingUsers = [],
  allUsers = [],
  brands = [],
  masterDataBrands = [],
  urgentUnits = [],
}: AdminDashboardViewProps) {
```

- [ ] **Step 4: Remove the standalone `master_data` nav item**

Locate this existing block (currently `admin-dashboard-view.tsx:214-226`):

```tsx
    {
      id: "assets",
      label: "ระบบสินทรัพย์",
      icon: Building2,
      group: "ระบบทรัพย์สิน",
    },
    {
      id: "qr_codes",
      label: "จัดการ QR Code",
      icon: QrCode,
      group: "ระบบทรัพย์สิน",
    },
    {
      id: "master_data",
      label: "จัดการยี่ห้อ/รุ่นแอร์",
      icon: Database,
      group: "ระบบทรัพย์สิน",
      href: "/admin/master-data",
    },
```

Replace with:

```tsx
    {
      id: "assets",
      label: "ระบบสินทรัพย์",
      icon: Building2,
      group: "ระบบทรัพย์สิน",
    },
    {
      id: "qr_codes",
      label: "จัดการ QR Code",
      icon: QrCode,
      group: "ระบบทรัพย์สิน",
    },
```

- [ ] **Step 5: Exclude "settings" from the global search bar**

Locate this existing line (currently `admin-dashboard-view.tsx:253`):

```tsx
      onSearchChange={["overview", "approvals", "calendar", "profile"].includes(activeTab) ? undefined : setGlobalSearch}
```

Replace with:

```tsx
      onSearchChange={["overview", "approvals", "calendar", "profile", "settings"].includes(activeTab) ? undefined : setGlobalSearch}
```

- [ ] **Step 6: Render `SettingsPanel` for the settings tab**

Locate this existing block (currently `admin-dashboard-view.tsx:344-349`):

```tsx
      {/* QR Code Manager */}
      {activeTab === "qr_codes" && (
        <QrCodeManager buildings={buildings} globalSearch={globalSearch} />
      )}

      {/* Modal: Create Work Order */}
```

Replace with:

```tsx
      {/* QR Code Manager */}
      {activeTab === "qr_codes" && (
        <QrCodeManager buildings={buildings} globalSearch={globalSearch} />
      )}

      {/* Settings View */}
      {activeTab === "settings" && (
        <SettingsPanel brands={masterDataBrands} universityName={universityName} />
      )}

      {/* Modal: Create Work Order */}
```

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors attributable to `admin/page.tsx` or `admin-dashboard-view.tsx`.

- [ ] **Step 8: Manual browser verification**

Start the dev server, log in as `org_admin`, open `/admin`.

1. Sidebar no longer shows "จัดการยี่ห้อ/รุ่นแอร์" as its own item under "ระบบทรัพย์สิน" — only "ระบบสินทรัพย์" and "จัดการ QR Code" remain there.
2. Click "ตั้งค่าระบบ" under "บัญชีและการตั้งค่า" → the page renders all 4 cards (previously blank).
3. Global search bar is hidden while on this tab (same as the profile tab).
4. In the "จัดการยี่ห้อ/รุ่นแอร์" card, confirm existing brands/models list correctly (counts in the header match `brands.length` / total models), add a new brand and a new model under it → both appear immediately without a manual reload.
5. In "รอบซ่อมบำรุงเริ่มต้น" and "ข้อมูลองค์กร", edit fields and click "บันทึก" → confirm the warning `Alert` ("ยังไม่เชื่อมต่อกับระบบหลังบ้าน") appears and no network request fires (check the Network tab).
6. "ประวัติการใช้งานระบบ" renders the empty-state block, no console errors.
7. Switch to another tab (e.g. "ระบบสินทรัพย์") and confirm it still works exactly as before — `brands` (the pre-existing prop used by `AssetManager`) is unaffected by the new `masterDataBrands` prop.

- [ ] **Step 9: Commit**

```bash
git add src/app/admin/page.tsx src/components/admin/admin-dashboard-view.tsx
git commit -m "feat(admin): render SettingsPanel and merge AC master data into it"
```

---

## Task 4: Delete the standalone `/admin/master-data` route

**Files:**
- Delete: `src/app/admin/master-data/page.tsx`

**Interfaces:**
- Consumes: Task 3 must be complete and verified first (the settings tab must already fully replace this route's functionality before it's removed).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Delete the file**

```bash
git rm src/app/admin/master-data/page.tsx
```

- [ ] **Step 2: Confirm nothing else references the old route**

Run: `grep -rn "admin/master-data" src --include=*.tsx --include=*.ts`
Expected: only `src/app/admin/master-data/actions.ts` (the `revalidatePath("/admin/master-data")` calls, intentionally left as-is per the design spec — see the `HANDOFF.md` note added in Task 6) and `src/app/admin/master-data/master-data-client.tsx` (its own `./actions` import). No `<Link>` or `href` anywhere still points at `/admin/master-data`.

- [ ] **Step 3: Manual browser verification**

With the dev server running:
1. Navigate directly to `/admin/master-data` → confirm Next.js renders its default 404 page (the route no longer exists).
2. Navigate to `/admin` → "ตั้งค่าระบบ" tab still works exactly as verified in Task 3, Step 8.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(admin): remove standalone master-data route, superseded by settings tab"
```

---

## Task 5: Add a "รีเซ็ตรหัสผ่าน" action to the team panel

**Files:**
- Modify: `src/components/admin/team-panel.tsx`

**Interfaces:**
- Consumes: `ConfirmActionDialog` from `src/components/ui/thai-alert-dialogs.tsx` (existing, unmodified), `Alert`/`AlertTitle`/`AlertDescription` from `src/components/ui/alert.tsx` (existing).
- Produces: nothing consumed elsewhere (self-contained placeholder, per the design spec — no new prop on `TeamPanelProps`).

- [ ] **Step 1: Add imports and local state**

Locate this existing block (currently `team-panel.tsx:1-24`):

```tsx
"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { PendingUser } from "@/components/admin/types";

interface TeamPanelProps {
  allUsers: PendingUser[];
  globalSearch: string;
  isPending: boolean;
  onUserStatus: (userId: string, status: "active" | "suspended") => void;
}

const ITEMS_PER_PAGE = 10;

export function TeamPanel({ allUsers, globalSearch, isPending, onUserStatus }: TeamPanelProps) {
  const [teamPage, setTeamPage] = useState(1);

  useEffect(() => {
    setTeamPage(1);
  }, [globalSearch]);
```

Replace with:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Users, AlertTriangle } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ConfirmActionDialog } from "@/components/ui/thai-alert-dialogs";
import type { PendingUser } from "@/components/admin/types";

interface TeamPanelProps {
  allUsers: PendingUser[];
  globalSearch: string;
  isPending: boolean;
  onUserStatus: (userId: string, status: "active" | "suspended") => void;
}

const ITEMS_PER_PAGE = 10;

export function TeamPanel({ allUsers, globalSearch, isPending, onUserStatus }: TeamPanelProps) {
  const [teamPage, setTeamPage] = useState(1);
  const [resetTarget, setResetTarget] = useState<PendingUser | null>(null);
  const [showResetNotice, setShowResetNotice] = useState(false);

  useEffect(() => {
    setTeamPage(1);
  }, [globalSearch]);
```

- [ ] **Step 2: Show the header, then the not-connected notice, then the table**

Locate this existing block (currently `team-panel.tsx:39-48`):

```tsx
  return (
    <div className="biz-card p-6 space-y-5 animate-in fade-in">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Users className="h-5 w-5 text-foreground" />
          <span>ทำเนียบเจ้าหน้าที่และช่างซ่อมบำรุง ({allUsers.length})</span>
        </h2>
      </div>

      <div className="overflow-x-auto">
```

Replace with:

```tsx
  return (
    <div className="biz-card p-6 space-y-5 animate-in fade-in">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Users className="h-5 w-5 text-foreground" />
          <span>ทำเนียบเจ้าหน้าที่และช่างซ่อมบำรุง ({allUsers.length})</span>
        </h2>
      </div>

      {showResetNotice && (
        <Alert className="border-warning/30 bg-warning/10">
          <AlertTriangle className="text-warning" />
          <AlertTitle>ยังไม่เชื่อมต่อกับระบบหลังบ้าน</AlertTitle>
          <AlertDescription>
            มีการฝากคำขอไว้ให้ทีม Backend แล้ว รหัสผ่านของผู้ใช้นี้ยังไม่ถูกรีเซ็ต
          </AlertDescription>
        </Alert>
      )}

      <div className="overflow-x-auto">
```

- [ ] **Step 3: Add the "รีเซ็ตรหัสผ่าน" button to the จัดการ column**

Locate this existing block (currently `team-panel.tsx:78-96`, inside the row `<td>` for the จัดการ column):

```tsx
                <td className="py-3.5 px-4 text-right space-x-2">
                  {u.status === "active" ? (
                    <button
                      onClick={() => onUserStatus(u.id, "suspended")}
                      disabled={isPending}
                      className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-40"
                    >
                      ระงับสิทธิ์
                    </button>
                  ) : (
                    <button
                      onClick={() => onUserStatus(u.id, "active")}
                      disabled={isPending}
                      className="rounded-lg border border-success/30 bg-success/10 px-2.5 py-1 text-[11px] font-bold text-success-foreground hover:bg-success/20 transition-colors disabled:opacity-40"
                    >
                      เปิดใช้งาน
                    </button>
                  )}
                </td>
```

Replace with:

```tsx
                <td className="py-3.5 px-4 text-right space-x-2">
                  {u.status === "active" ? (
                    <button
                      onClick={() => onUserStatus(u.id, "suspended")}
                      disabled={isPending}
                      className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-40"
                    >
                      ระงับสิทธิ์
                    </button>
                  ) : (
                    <button
                      onClick={() => onUserStatus(u.id, "active")}
                      disabled={isPending}
                      className="rounded-lg border border-success/30 bg-success/10 px-2.5 py-1 text-[11px] font-bold text-success-foreground hover:bg-success/20 transition-colors disabled:opacity-40"
                    >
                      เปิดใช้งาน
                    </button>
                  )}
                  <button
                    onClick={() => setResetTarget(u)}
                    className="rounded-lg border border-border bg-muted px-2.5 py-1 text-[11px] font-bold text-foreground hover:bg-secondary transition-colors"
                  >
                    รีเซ็ตรหัสผ่าน
                  </button>
                </td>
```

- [ ] **Step 4: Add the confirm dialog before the closing tag**

Locate this existing block (currently `team-panel.tsx:126-131`, the end of the component):

```tsx
        )}
      </div>
    </div>
  );
}
```

Replace with:

```tsx
        )}
      </div>

      <ConfirmActionDialog
        isOpen={resetTarget !== null}
        onOpenChange={(open) => !open && setResetTarget(null)}
        title="ยืนยันการรีเซ็ตรหัสผ่าน"
        description={
          resetTarget
            ? `ต้องการรีเซ็ตรหัสผ่านของ ${resetTarget.name} หรือไม่? ผู้ใช้จะต้องตั้งรหัสผ่านใหม่ก่อนเข้าใช้งานครั้งถัดไป`
            : ""
        }
        confirmText="รีเซ็ตรหัสผ่าน"
        onConfirm={() => {
          setResetTarget(null);
          setShowResetNotice(true);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors attributable to `team-panel.tsx`.

- [ ] **Step 6: Manual browser verification**

Open `/admin`, go to "เจ้าหน้าที่ & ช่าง".

1. Click "รีเซ็ตรหัสผ่าน" on any user row → confirm dialog opens with that user's name in the description.
2. Click "ยกเลิก" → dialog closes, nothing else happens.
3. Click "รีเซ็ตรหัสผ่าน" again on any row, then confirm → dialog closes, the warning `Alert` appears above the table, no network request fires (check the Network tab).
4. Confirm the existing ระงับ/เปิดใช้งาน buttons still work exactly as before.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/team-panel.tsx
git commit -m "feat(admin): add password reset action to team panel (backend pending)"
```

---

## Task 6: Log the backend request in `HANDOFF.md`

**Files:**
- Modify: `HANDOFF.md`

**Interfaces:**
- Consumes: nothing (documentation only).
- Produces: nothing (documentation only) — this is the artifact DoubleKill reads to implement S4–S7.

- [ ] **Step 1: Append the new backend request section**

Locate this existing block (currently `HANDOFF.md:590-594`, the end of the "Org Admin Profile Page" section):

```markdown
  3. `profile-panel.tsx` — อ่าน `profile` แทน `user`, เพิ่มช่องเบอร์โทร, และเปลี่ยนปุ่ม "บันทึกการเปลี่ยนแปลง" ให้เรียก `updateProfileAction(name, phone)` จริง (ลบ `showBackendPendingNotice` ทิ้งได้)

---

## 📬 คำตอบจาก Esther03u — 6 สิงหาคม 2026
```

Replace with:

```markdown
  3. `profile-panel.tsx` — อ่าน `profile` แทน `user`, เพิ่มช่องเบอร์โทร, และเปลี่ยนปุ่ม "บันทึกการเปลี่ยนแปลง" ให้เรียก `updateProfileAction(name, phone)` จริง (ลบ `showBackendPendingNotice` ทิ้งได้)

### Org Admin System Settings Page (16 สิงหาคม 2026)

หน้า "ตั้งค่าระบบ" (`src/components/admin/settings-panel.tsx`) สร้าง UI ครบ 4 การ์ดแล้ว ตามสเปก `docs/superpowers/specs/2026-08-16-org-admin-system-settings-page-design.md` การ์ด "จัดการยี่ห้อ/รุ่นแอร์" ทำงานได้จริง (reuse ของเดิม ไม่ต้องรอ) ส่วนอีก 3 การ์ดเป็น UI placeholder รอ backend:

- [ ] **S4.** การ์ด "รอบซ่อมบำรุงเริ่มต้น" — กดบันทึกแล้วโชว์แค่ข้อความเตือน ยังไม่มีที่เก็บค่า

  **คำขอ:** สร้างตาราง `SystemSettings` ใหม่ (แถวเดียว/singleton, `id` ตายตัว = 1): `defaultFrequencyValue Int @default(6)`, `defaultFrequencyUnit String @default("months")`, `organisationName String?`, `organisationAddress String?`, `organisationPhone String?`, `updatedAt DateTime @updatedAt` (รวมกับ S5 ในตารางเดียวกัน) แล้วเพิ่ม Server Action `updateDefaultFrequencyAction(value: number, unit: string)` ใน `src/app/admin/actions.ts` — validate ด้วย Zod (`value > 0`, `unit` เป็นหนึ่งใน `"days" | "months" | "years"`) แล้ว upsert แถวเดียวนั้น พร้อม `logAudit`

  **ตัดสินใจแล้ว:** เปลี่ยนค่า default นี้มีผลกับ**เครื่องปรับอากาศที่เพิ่มใหม่เท่านั้น** — `MaintenanceSchedule` ที่มีอยู่แล้วไม่ต้องอัปเดตย้อนหลัง จุดที่สร้าง `MaintenanceSchedule` ตอนเพิ่มเครื่องแอร์ใหม่ ให้อ่านค่าจาก `SystemSettings` แทนค่า hardcode `frequency_value`/`frequency_unit` ที่ตั้งไว้ใน `prisma/schema.prisma` ตอนนี้ (`prisma/schema.prisma:261-262`)

- [ ] **S5.** การ์ด "ข้อมูลองค์กร" — กดบันทึกแล้วโชว์แค่ข้อความเตือนเหมือนกัน ชื่อหน่วยงานตอนนี้ยังเป็นค่าคงที่ `ORGANISATION_NAME` ใน `src/lib/organisation.ts` (ที่อยู่/เบอร์โทรไม่มีที่เก็บเลย)

  **คำขอ:** เพิ่ม Server Action `updateOrganisationInfoAction(name: string, address?: string, phone?: string)` ใน `src/app/admin/actions.ts` — upsert แถว `SystemSettings` เดียวกับ S4 พร้อม `logAudit` แล้วเปลี่ยน `src/lib/organisation.ts` จาก export ค่าคงที่ `ORGANISATION_NAME` เป็นฟังก์ชัน async `getOrganisationName()` ที่อ่านจาก `SystemSettings.organisationName` (fallback เป็นสตริงเดิม `"มหาวิทยาลัยราชภัฏภูเก็ต"` ถ้ายังไม่เคยตั้งค่า) แล้วอัปเดต 2 จุดที่เรียกใช้ค่าคงที่เดิมอยู่ (`src/app/tech/actions.ts`, `src/app/admin/actions.ts`) ให้เรียก `await getOrganisationName()` แทน

- [ ] **S6.** ปุ่ม "รีเซ็ตรหัสผ่าน" ในหน้าทีมพานเนล (`team-panel.tsx`) — กดยืนยันแล้วโชว์แค่ข้อความเตือน ยังไม่ได้รีเซ็ตจริง

  **คำขอ:** เพิ่ม Server Action `adminResetUserPasswordAction(userId: string)` ใน `src/app/admin/actions.ts` — guard ด้วย `verifyOrgAdmin()` เดิม ตั้ง `password = NULL` ให้ user เป้าหมาย (ไม่ต้องสร้าง/ส่งรหัสผ่านใหม่ให้ admin เห็นเลย — schema ออกแบบไว้แล้วว่า `password = NULL` แปลว่า "ต้องตั้งรหัสใหม่ก่อนเข้าระบบ" และ `authorize()` จะบังคับ flow นี้ให้เอง) พร้อม `logAudit`

- [ ] **S7.** การ์ด "ประวัติการใช้งานระบบ" — ตอนนี้เป็น empty-state เฉยๆ เพราะไม่มีฟังก์ชันอ่านข้อมูลเลย

  **คำขอ:** เพิ่มฟังก์ชันอ่านข้อมูล เช่น `getAuditLogs({ page, actionFilter }?)` ใน `src/app/admin/actions.ts` (หรือไฟล์ใหม่ที่เหมาะสม) ดึง `system_audit_logs` เรียงจากล่าสุด ~200 รายการ join ชื่อผู้ทำ (`user.name`) มาด้วย — `src/lib/audit.ts` เขียนเข้าตารางนี้อยู่แล้วจากหลาย action (`CREATE_WORKORDER`, `ASSIGN_WORKORDER`, `CANCEL_WORKORDER`, `UPDATE_AIRCONDITIONER`, `UPDATE_MAINTENANCE_LOG`, `CLAIM_WORKORDER`, `COMPLETE_WORKORDER`) แต่ยังไม่มีใครอ่านกลับเลย

  *(เสริม ไม่เร่งด่วน)* `src/app/admin/master-data/actions.ts` เรียก `revalidatePath("/admin/master-data")` ใน `createAcBrandAction`/`createAcModelAction` อยู่ 2 จุด — route นั้นถูกลบไปแล้ว (ย้าย UI มาไว้ในแท็บ "ตั้งค่าระบบ" ที่ `/admin` แทน) ฝั่ง UI ชดเชยด้วย `router.refresh()` ใน `master-data-client.tsx` ไปแล้วจึงไม่กระทบการใช้งานปัจจุบัน แต่ถ้าสะดวกตอนแตะไฟล์นี้ครั้งหน้า เปลี่ยนเป็น `revalidatePath("/admin")` จะตรงกับ route จริงมากกว่า

**สิ่งที่ต้องทำฝั่ง UI เพื่อให้ครบวงจร เมื่อ backend เสร็จ** (backend พร้อมแล้ว DoubleKill ไม่แตะไฟล์ UI ตามกฎ):
1. `settings-panel.tsx` — เปลี่ยนปุ่ม "บันทึก" ทั้ง 2 การ์ด (S4, S5) ให้เรียก action จริงแทนการโชว์ `NotConnectedAlert`
2. `team-panel.tsx` — เปลี่ยน `onConfirm` ของ `ConfirmActionDialog` ให้เรียก `adminResetUserPasswordAction` จริง
3. `settings-panel.tsx` — เปลี่ยนการ์ด "ประวัติการใช้งานระบบ" จาก empty-state เป็นตารางแสดงผลจริงจาก `getAuditLogs()`

---

## 📬 คำตอบจาก Esther03u — 6 สิงหาคม 2026
```

- [ ] **Step 2: Commit**

```bash
git add HANDOFF.md
git commit -m "docs: log backend requests S4-S7 for system settings page"
```

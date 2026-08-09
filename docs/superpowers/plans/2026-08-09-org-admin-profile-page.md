# Org Admin Profile Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working "จัดการโปรไฟล์" tab for the Org Admin dashboard (currently a dead sidebar link with no content) that shows the user's account info, lets them edit their display name (UI only — no persistence yet), and lets them trigger a real password-reset email via the existing flow.

**Architecture:** One new self-contained client component, `src/components/admin/profile-panel.tsx`, wired into `admin-dashboard-view.tsx`'s existing `activeTab` switch. Reuses the already-working `requestPasswordReset` server action from `src/app/request-password-reset/actions.ts` for the password-change button — no new backend code anywhere in this plan.

**Tech Stack:** React 19 (`useState`, `useActionState`), Tailwind CSS utility classes, semantic theme tokens already used throughout the dashboard (`bg-muted`, `border-border`, `text-warning`, etc.), `lucide-react` icons, the standardized `Alert`/`AlertTitle`/`AlertDescription` components from `src/components/ui/alert.tsx`.

## Global Constraints

- No emojis anywhere in UI — use `lucide-react` icons only (project-wide rule, `AGENTS.md`).
- Do not modify any file under `src/app/**/actions.ts`, `src/lib/**`, `src/app/api/**`, or `prisma/**` — backend is off-limits (project rule, `HANDOFF.md` / `AGENTS.md`). The one exception already cleared in the approved spec: **importing** (not modifying) the existing `requestPasswordReset` action.
- Scope is Org Admin only. Do not touch Super Admin's identical dead "จัดการโปรไฟล์" nav item (`super-admin-view.tsx`) or Technician (which has no such nav item).
- The "บันทึกการเปลี่ยนแปลง" button must never claim success or silently no-op — it must show a visible, honest notice that the backend isn't connected yet (approved spec, Section 3).
- No test framework exists in this project for UI (confirmed by the precedent plan `docs/superpowers/plans/2026-08-06-work-order-board-table-styling.md`) — verification is `npx tsc --noEmit` + manual browser check, not automated tests.

---

## Task 1: Build the `ProfilePanel` component

**Files:**
- Create: `src/components/admin/profile-panel.tsx`

**Interfaces:**
- Consumes: nothing from other tasks (first task, standalone component).
- Produces: `export function ProfilePanel({ user, universityName }: ProfilePanelProps)` where
  ```ts
  interface ProfilePanelProps {
    user: {
      name?: string | null;
      email?: string | null;
      role?: string | null;
    };
    universityName: string;
  }
  ```
  Task 2 imports this exact export name and prop shape.

- [ ] **Step 1: Write the component**

Create `src/components/admin/profile-panel.tsx` with this exact content:

```tsx
"use client";

import { useState, useActionState } from "react";
import { User, Mail, Building2, KeyRound, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { requestPasswordReset, type RequestResetState } from "@/app/request-password-reset/actions";

interface ProfilePanelProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
  universityName: string;
}

const ROLE_LABEL: Record<string, string> = {
  super_admin: "ผู้ดูแลระบบสูงสุด",
  org_admin: "ผู้บริหารองค์กร",
  technician: "ช่างซ่อมบำรุง",
};

export function ProfilePanel({ user, universityName }: ProfilePanelProps) {
  const [name, setName] = useState(user.name ?? "");
  const [showBackendPendingNotice, setShowBackendPendingNotice] = useState(false);
  const [resetState, resetFormAction, isResetPending] = useActionState<RequestResetState, FormData>(
    requestPasswordReset,
    null
  );

  const initials = user.name ? user.name.slice(0, 2).toUpperCase() : "US";
  const roleLabel = user.role ? ROLE_LABEL[user.role] ?? user.role : "-";

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Card 1: Personal Info */}
      <div className="biz-card p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-xl shadow-xs">
            {initials}
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              {user.name || "-"}
            </h3>
            <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/20 text-primary border border-primary/30">
              {roleLabel}
            </span>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" /> {universityName}
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-2 border-t border-border">
          <div>
            <label htmlFor="profile-name" className="mb-1.5 block text-xs font-bold text-foreground">
              ชื่อ-นามสกุล
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
            />
          </div>

          <div>
            <label htmlFor="profile-email" className="mb-1.5 block text-xs font-bold text-foreground">
              อีเมล
            </label>
            <div
              id="profile-email"
              className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3.5 py-2.5 text-sm text-muted-foreground"
            >
              <Mail className="h-4 w-4 shrink-0" />
              {user.email || "-"}
            </div>
          </div>
        </div>

        {showBackendPendingNotice && (
          <Alert className="border-warning/30 bg-warning/10">
            <AlertTriangle className="text-warning" />
            <AlertTitle>ยังบันทึกไม่ได้ในตอนนี้</AlertTitle>
            <AlertDescription>
              ฟีเจอร์นี้ยังไม่เชื่อมต่อกับระบบหลังบ้าน — มีการฝากคำขอไว้ให้ทีม Backend แล้ว
            </AlertDescription>
          </Alert>
        )}

        <button
          type="button"
          onClick={() => setShowBackendPendingNotice(true)}
          className="w-full sm:w-auto rounded-xl bg-foreground px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90 transition-colors"
        >
          บันทึกการเปลี่ยนแปลง
        </button>
      </div>

      {/* Card 2: Account Security */}
      <div className="biz-card p-6 space-y-4">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          ความปลอดภัยของบัญชี
        </h3>

        <div className="flex items-center justify-between rounded-xl border border-border bg-muted px-3.5 py-2.5 text-sm">
          <span className="text-muted-foreground">รหัสผ่าน</span>
          <span className="font-mono font-bold text-foreground">••••••••</span>
        </div>

        {resetState?.message && (
          <Alert className="border-primary/30 bg-primary/10">
            <CheckCircle2 className="text-primary" />
            <AlertTitle>ส่งคำขอแล้ว</AlertTitle>
            <AlertDescription>{resetState.message}</AlertDescription>
          </Alert>
        )}

        <form action={resetFormAction}>
          <input type="hidden" name="email" value={user.email ?? ""} />
          <p className="text-xs text-muted-foreground mb-3">
            ลิงก์สำหรับตั้งรหัสผ่านใหม่จะถูกส่งไปที่{" "}
            <span className="font-bold text-foreground">{user.email || "-"}</span>
          </p>
          <button
            type="submit"
            disabled={isResetPending || !user.email}
            className="w-full sm:w-auto rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-bold text-foreground hover:bg-secondary disabled:opacity-50 transition-colors"
          >
            {isResetPending ? "กำลังส่งคำขอ..." : "ส่งลิงก์เปลี่ยนรหัสผ่าน"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors attributable to `profile-panel.tsx` (this file isn't imported anywhere yet, so it type-checks in isolation — pre-existing unrelated `.next/types` cache errors referencing the already-deleted `/dashboard` page are expected noise, not caused by this change).

---

## Task 2: Wire `ProfilePanel` into the Org Admin dashboard

**Files:**
- Modify: `src/components/admin/admin-dashboard-view.tsx:63` (add import)
- Modify: `src/components/admin/admin-dashboard-view.tsx:1008-1011` (add render branch)

**Interfaces:**
- Consumes: `ProfilePanel` component and `ProfilePanelProps` from Task 1 (`src/components/admin/profile-panel.tsx`).
- Produces: nothing consumed by later tasks — this is the integration point.

- [ ] **Step 1: Add the import**

Locate this existing line (currently at `src/components/admin/admin-dashboard-view.tsx:63`):

```tsx
import { MaintenanceCalendar } from "@/components/shared/maintenance-calendar";
```

Add directly below it:

```tsx
import { MaintenanceCalendar } from "@/components/shared/maintenance-calendar";
import { ProfilePanel } from "@/components/admin/profile-panel";
```

- [ ] **Step 2: Add the `activeTab === "profile"` render branch**

Locate this existing block (currently at `src/components/admin/admin-dashboard-view.tsx:1008-1011`):

```tsx
      {/* Maintenance Calendar View */}
      {activeTab === "calendar" && (
        <MaintenanceCalendar onCreateWorkOrder={handleOpenCalendarWorkOrder} />
      )}
```

Replace with:

```tsx
      {/* Maintenance Calendar View */}
      {activeTab === "calendar" && (
        <MaintenanceCalendar onCreateWorkOrder={handleOpenCalendarWorkOrder} />
      )}

      {/* Profile View */}
      {activeTab === "profile" && (
        <ProfilePanel user={user} universityName={universityName} />
      )}
```

`user` and `universityName` are already in scope here — they're the same props `AdminDashboardView` already passes into `DashboardLayout` a few lines above (`user={{ name: user.name, email: user.email, role: user.role, universityName }}` at `admin-dashboard-view.tsx:482-487`), and `AdminDashboardViewProps.user` already matches `ProfilePanelProps.user`'s shape exactly (`{ name?: string | null; email?: string | null; role?: string | null }`).

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Manual browser verification**

Dev server should already be running at `http://localhost:3000` (started earlier this session via the `dev` preview config in `.claude/launch.json`). If not: `npm run dev`.

1. Log in as `org_admin` (or use the "ผู้บริหารองค์กร" quick-login button on `/login`).
2. Click "จัดการโปรไฟล์" in the sidebar (under "บัญชีและการตั้งค่า") — previously blank, should now render both cards.
3. Confirm Card 1 shows: correct initials, name, role badge (should read "ผู้บริหารองค์กร"), university name, and the name/email fields populated correctly.
4. Edit the name field, click "บันทึกการเปลี่ยนแปลง" — confirm the warning `Alert` ("ยังบันทึกไม่ได้ในตอนนี้...") appears below the fields. Open DevTools Network tab first and confirm no request fires on this click.
5. Click "ส่งลิงก์เปลี่ยนรหัสผ่าน" — confirm the button shows "กำลังส่งคำขอ..." briefly, then a success `Alert` renders with the generic message. Check the terminal running `npm run dev` for a line like `[password reset] <email> -> http://localhost:3000/reset-password?token=...` confirming the real action fired.
6. Resize the browser to a narrow width (e.g. 375px) and confirm both cards stay readable (buttons go full-width via the `sm:w-auto` breakpoint).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/profile-panel.tsx src/components/admin/admin-dashboard-view.tsx
git commit -m "feat(admin): add org admin profile page (view, name edit UI, working password reset)"
```

---

## Task 3: Log the two deferred backend requests in `HANDOFF.md`

**Files:**
- Modify: `HANDOFF.md` (append to the existing "🎨 UI/Styling Backlog — Deferred Backend Requests" section)

**Interfaces:**
- Consumes: nothing from other tasks (documentation only).
- Produces: nothing consumed by other tasks.

- [ ] **Step 1: Append the new backlog entry**

Locate this existing block (currently at `HANDOFF.md:297-303`):

```markdown
- [ ] **S1. `[Backend — add airConditioner.status to workOrders mapping]`** เพิ่มคอลัมน์ "ประเภทงาน" (repair vs. cleaning/maintenance) บนกระดานใบงาน ซึ่งตั้งไว้นอกขอบเขตของงาน Task 1 (row styling) เพื่อไม่โอเวอร์โหลด

  **คำขอ:** เพิ่ม `airConditioner.status` (จาก `air_conditioners.status` เช่น `"broken"`, `"needs_cleaning"`) เข้าไปใน `workOrders` mapping ของ `getOrgAdminData()` (`src/app/admin/actions.ts:186-205`) เพื่อให้ frontend สามารถอนุมาน "ประเภทงาน" ได้เหมือนวิธีเดียวกับที่ `src/lib/maintenance.ts` ทำสำหรับ technician view (status === `"broken"` → repair, status === `"needs_cleaning"` → cleaning)

  ⚠️ **นี่คือการเพิ่มแบบ additive เท่านั้น** ไม่มีการเปลี่ยน return shape อื่น — เพิ่มฟิลด์เดียวในลูป map แล้วเสร็จ

---
```

Replace with (adds a new `### Org Admin Profile Page` subsection and `S2`/`S3` entries directly after S1, before the closing `---`):

```markdown
- [ ] **S1. `[Backend — add airConditioner.status to workOrders mapping]`** เพิ่มคอลัมน์ "ประเภทงาน" (repair vs. cleaning/maintenance) บนกระดานใบงาน ซึ่งตั้งไว้นอกขอบเขตของงาน Task 1 (row styling) เพื่อไม่โอเวอร์โหลด

  **คำขอ:** เพิ่ม `airConditioner.status` (จาก `air_conditioners.status` เช่น `"broken"`, `"needs_cleaning"`) เข้าไปใน `workOrders` mapping ของ `getOrgAdminData()` (`src/app/admin/actions.ts:186-205`) เพื่อให้ frontend สามารถอนุมาน "ประเภทงาน" ได้เหมือนวิธีเดียวกับที่ `src/lib/maintenance.ts` ทำสำหรับ technician view (status === `"broken"` → repair, status === `"needs_cleaning"` → cleaning)

  ⚠️ **นี่คือการเพิ่มแบบ additive เท่านั้น** ไม่มีการเปลี่ยน return shape อื่น — เพิ่มฟิลด์เดียวในลูป map แล้วเสร็จ

### Org Admin Profile Page (9 สิงหาคม 2026)

หน้า "จัดการโปรไฟล์" (`src/components/admin/profile-panel.tsx`) สร้าง UI ครบแล้ว (ดูข้อมูล + ฟอร์มแก้ไขชื่อ + ปุ่มเปลี่ยนรหัสผ่านที่ทำงานได้จริงผ่าน `requestPasswordReset` เดิม) เหลือ 2 จุดที่ต้องรอ backend:

- [ ] **S2. `[Backend — new updateProfileAction]`** ปุ่ม "บันทึกการเปลี่ยนแปลง" ตอนนี้แค่โชว์ข้อความเตือนว่ายังบันทึกไม่ได้ ยังไม่มีการเซฟจริง

  **คำขอ:** เพิ่ม Server Action ใหม่ (แนะนำ `updateProfileAction(name: string)`) ใน `src/app/admin/actions.ts` ที่รับ `name` แล้ว `prisma.user.update()` เฉพาะแถวของ user ที่ล็อกอินอยู่ (ยึด `session.user.id`) — คืนค่า success/error กลับมาให้ UI แสดงผล ไม่ต้องมี field อื่นเพิ่ม

- [ ] **S3. `[Backend — expose the admin's own phone number]`** การ์ด "ข้อมูลส่วนตัว" ยังไม่มีช่องเบอร์โทรศัพท์เลย เพราะตอนนี้ `getOrgAdminData()` ไม่ส่ง `UserPhone` ของ user ที่ล็อกอินอยู่มาด้วย

  **คำขอ:** เพิ่ม field เบอร์โทรหลัก (จาก `user_phones` ที่ `is_primary = true`) เข้าไปใน `user` object ที่ `getOrgAdminData()` คืนกลับให้ UI (หรือ endpoint ใหม่เล็กๆ ก็ได้) — ถ้าจะให้แก้ไขเบอร์ได้ด้วยรวมเข้ากับ `updateProfileAction` ใน S2 ไปเลย (`updateProfileAction(name: string, phone?: string)`) จะได้ไม่ต้องทำ 2 endpoint แยกกัน

---
```

- [ ] **Step 2: Commit**

```bash
git add HANDOFF.md
git commit -m "docs: log profile page backend requests (S2 update action, S3 phone number)"
```

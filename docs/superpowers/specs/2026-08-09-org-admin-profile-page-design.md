# Design Specification: Org Admin — "จัดการโปรไฟล์" (Profile) Page

**Date:** 2026-08-09
**Status:** Approved by User (Esther03u)
**Target:** The "จัดการโปรไฟล์" sidebar nav item in the Org Admin dashboard (`admin-dashboard-view.tsx:467-471`) currently has no corresponding tab content — clicking it renders a blank content area (the `activeTab` switch has no `"profile"` branch). Build the page.

---

## 1. Overview & Objectives

Give Org Admin users a working profile page: view their account info, edit their display name, and change their password. Scoped to Org Admin only for this round — Super Admin has the same dead nav item but is explicitly out of scope (Technician has no such nav item at all).

This is a frontend-only change. No file under `src/app/**/actions.ts`, `src/app/api/**`, `src/lib/**`, or `prisma/schema.prisma` is touched, per the project's backend-ownership rule (`AGENTS.md` / `HANDOFF.md`).

## 2. Scope of Changes

**[NEW FILE]** `src/components/admin/profile-panel.tsx` — the profile tab's content, as its own component rather than more inline JSX in `admin-dashboard-view.tsx` (already 1,299 lines, flagged as needing decomposition under Performance Backlog item P10). This keeps the new feature aligned with that already-identified problem instead of adding to it.

**[MODIFY]** `src/components/admin/admin-dashboard-view.tsx` — add one `activeTab === "profile"` render branch that renders `<ProfilePanel user={...} universityName={universityName} />`, plus the import line. No other changes to this file.

## 3. Component Design

### Card 1 — ข้อมูลส่วนตัว (Personal Info)

- Header: initials-circle avatar (same 2-letter-uppercase pattern already used in the sidebar user menu and dropdown, `dashboard-layout.tsx:180-182`) + name + role badge + university name.
- **Editable:** ชื่อ-นามสกุล (`name`) only, via local component state (`useState`), styled as a standard labeled text input matching the rest of the dashboard's form inputs.
- **Read-only:** อีเมล, บทบาท (role, rendered through the same `roleLabel` mapping already used in `dashboard-layout.tsx:93-98` — duplicated locally in this new component since `dashboard-layout.tsx` doesn't export it).
- Phone number is **excluded from this card** — see Section 5.
- "บันทึกการเปลี่ยนแปลง" button: on click, sets a local `showBackendPendingNotice` boolean to `true`, rendering an `Alert` (warning variant, matching the standardized `Alert`/`AlertTitle`/`AlertDescription` pattern from `src/components/ui/alert.tsx`) with the text: **"ฟีเจอร์นี้ยังไม่เชื่อมต่อกับระบบหลังบ้าน — มีการฝากคำขอไว้ให้ทีม Backend แล้ว"**. No network call. No mutation. The typed name stays in the input (not reverted) so the user doesn't lose their edit, but nothing is persisted anywhere — refreshing the page loses it, which is the honest behavior given there is no backend to persist to yet.

### Card 2 — ความปลอดภัยของบัญชี (Account Security)

- Static row showing "รหัสผ่าน: ••••••••" and the account's own email (read-only, the address a reset link would go to).
- "ส่งลิงก์เปลี่ยนรหัสผ่าน" button: a real, working form using `useActionState` wired to the **existing** `requestPasswordReset` server action (`src/app/request-password-reset/actions.ts`), imported directly — no new backend code. The email field is a hidden input pre-filled with the logged-in user's own email (`user.email`), so there's nothing to type. On response, the action's returned generic message renders in an `Alert` (info variant).
- This reuses the exact mechanism the public "ลืมรหัสผ่าน" page already uses in production today; in dev mode, the generated reset link is logged to the server console (existing behavior, unchanged).

## 4. Props / Data Flow

`ProfilePanel` takes:
```ts
interface ProfilePanelProps {
  user: { name?: string | null; email?: string | null; role?: string | null };
  universityName: string;
}
```
Both already exist as props on `AdminDashboardView` today — no new data fetching, no new server round-trip for rendering the page. The only network call this component ever makes is the existing `requestPasswordReset` action on explicit button click.

## 5. Explicitly Out of Scope (backend requests logged to `HANDOFF.md`)

- **Editing phone number:** `getOrgAdminData()` does not currently return the user's own `UserPhone` row(s), so there is no current value to prefill an edit field with — building an editable phone field today would always render blank even when a phone number exists in the DB, which reads as a bug. Deferred until backend exposes it. A request will be added to `HANDOFF.md`'s UI/Styling Backlog section for DoubleKill, asking for the org admin's own primary phone number (and a way to update it) to be added to `getOrgAdminData()` / a new update action.
- **Actually persisting the name edit:** requires a new Server Action (e.g. `updateProfileAction`) in `src/app/admin/actions.ts`, which is backend-owned. Also logged as a request in `HANDOFF.md`.
- Super Admin's identical dead "จัดการโปรไฟล์" nav item — not touched this round.

## 6. Error Handling

- No new failure modes for rendering (props are already required/non-optional on the parent, `name`/`email`/`role` render with `?? "-"` fallbacks matching existing conventions elsewhere in the dashboard for nullable session fields).
- The "บันทึก" button's backend-pending notice is a deliberate, visible message — not a silently swallowed action.
- The password-reset button inherits the existing action's error handling (Zod validation, generic anti-enumeration response) unchanged.

## 7. Testing

Manual, in-browser (no test framework in this project for UI):
1. Dev server running, log in as `org_admin`.
2. Click "จัดการโปรไฟล์" in the sidebar — previously blank, should now render both cards with correct name/email/role/university.
3. Edit the name field, click "บันทึกการเปลี่ยนแปลง" — confirm the warning `Alert` appears and no network request fires (check Network tab).
4. Click "ส่งลิงก์เปลี่ยนรหัสผ่าน" — confirm a success `Alert` renders and the dev server console logs the reset URL (existing `console.log` in `requestPasswordReset`, unchanged).
5. `npx tsc --noEmit` — no new errors.

---

## 8. Follow-up: Backend Requests to Log in `HANDOFF.md`

After implementation, append a new "UI/Styling Backlog" entry (following the existing `S1` format) requesting:
1. `getOrgAdminData()` (or a small dedicated query) to return the calling admin's own primary phone number.
2. A new `updateProfileAction(name, phone)` Server Action so the "บันทึกการเปลี่ยนแปลง" button can actually persist.

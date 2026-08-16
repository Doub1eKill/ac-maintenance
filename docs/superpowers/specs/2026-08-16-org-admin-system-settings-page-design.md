# Design Specification: Org Admin — "ตั้งค่าระบบ" (System Settings) Page

**Date:** 2026-08-16
**Status:** Approved by User (Esther03u)
**Target:** The "ตั้งค่าระบบ" sidebar nav item in the Org Admin dashboard (`admin-dashboard-view.tsx:234-238`) currently has no corresponding tab content — clicking it renders a blank content area (the `activeTab` switch has no `"settings"` branch). Build the page.

---

## 0. Constraint: Frontend-Only This Round

Per `HANDOFF.md:3-11`, Esther03u (UI/Frontend) must not modify `prisma/schema.prisma`, `src/app/**/actions.ts`, `src/app/api/**`, or `src/lib/**`. Any backend need is written up as a request to DoubleKill and logged in `HANDOFF.md`, following the exact precedent already used for the "จัดการโปรไฟล์" page (`docs/superpowers/specs/2026-08-09-org-admin-profile-page-design.md`, Section 8).

Two of the four planned sections have working backend today and can be fully wired up. Two do not and ship as honest, visually-complete placeholders (editable UI, but saving shows a "not connected to backend yet" notice instead of a network call) — the same pattern the profile page already established for its phone field.

## 1. Overview & Objectives

Give org_admin a working "ตั้งค่าระบบ" page with four sections:

1. **รอบซ่อมบำรุงเริ่มต้น** (Default Maintenance Frequency) — *placeholder, backend pending*
2. **ข้อมูลองค์กร** (Organisation Info) — *placeholder, backend pending*
3. **จัดการยี่ห้อ/รุ่นแอร์** (AC Brand/Model Management) — *fully functional*, merged in from the standalone `/admin/master-data` route per explicit user request ("ไม่ต้องการให้แยกแล้ว")
4. **ประวัติการใช้งานระบบ** (Audit Log) — *empty-state placeholder, backend pending*

Also: add a "รีเซ็ตรหัสผ่าน" action to the existing ทีมพานเนล (`team-panel.tsx`) user-management table, for org_admin to recover a technician's account when they're locked out. *Placeholder, backend pending.*

## 2. Scope of Changes

**[NEW FILE]** `src/components/admin/settings-panel.tsx` — the settings tab's content, following the same "own component, not inline JSX" pattern as `profile-panel.tsx` (`admin-dashboard-view.tsx` is already large; per Performance Backlog P10 it was already split into per-tab components, this keeps that convention).

**[MODIFY]** `src/components/admin/admin-dashboard-view.tsx`:
- Add one `activeTab === "settings"` render branch → `<SettingsPanel brands={masterDataBrands} universityName={universityName} />`, plus the import line.
- Remove the `master_data` nav item entry (id, label, icon, group, href) — its destination no longer exists as a standalone route.
- Add a new prop `masterDataBrands` (see Section 5) passed through from `admin/page.tsx`.

**[MODIFY]** `src/app/admin/page.tsx` — call the existing `getAcMasterData()` action (already used previously by the standalone master-data route; this is *using* an existing action, not writing new backend code) alongside the existing `getOrgAdminData()` call, and pass the result to `AdminDashboardView` as `masterDataBrands`. `admin/page.tsx` is a page component, not a `src/app/**/actions.ts` file, so this wiring stays inside the frontend lane.

**[MODIFY]** `src/app/admin/master-data/master-data-client.tsx`:
- After a successful brand/model create, call `router.refresh()` (via `next/navigation`) instead of relying solely on the existing `revalidatePath("/admin/master-data")` calls inside `actions.ts`. Those calls target a route that will no longer exist once this page is deleted, so without this change newly-added brands/models wouldn't appear until a manual browser reload. This is a frontend-only fix (adding a client-side refresh call), not a modification to the Server Action's revalidation target.
- Add `export` to the existing local `BrandType` (and `ModelType`) type declarations so `settings-panel.tsx` can import and reuse them instead of redeclaring the same shape.

**[DELETE]** `src/app/admin/master-data/page.tsx` — the standalone route. `src/app/admin/master-data/actions.ts` (Server Actions: `getAcMasterData`, `createAcBrandAction`, `createAcModelAction`) stays exactly where it is; `master-data-client.tsx` keeps importing from `./actions` unchanged.

**[MODIFY]** `src/components/admin/team-panel.tsx` — add a "รีเซ็ตรหัสผ่าน" button to the "จัดการ" column, using the existing `thai-alert-dialogs.tsx` confirm-dialog component for the confirmation step.

## 3. Component Design

### Card 1 — รอบซ่อมบำรุงเริ่มต้น (placeholder)

- Number input (จำนวน) + unit `<select>` (วัน / เดือน / ปี), matching the existing hand-styled input pattern from `profile-panel.tsx` (not a generic unstyled `<input>`).
- Prefilled with the system's current hardcoded default: 6 เดือน (matches `frequency_value`/`frequency_unit` defaults in `prisma/schema.prisma:261-262`, read as a display-only literal here — no schema import needed).
- Helper text: "มีผลกับเครื่องปรับอากาศที่เพิ่มใหม่เท่านั้น ไม่กระทบเครื่องที่มีรอบตั้งไว้แล้ว" (per the earlier design decision).
- "บันทึก" button → on click, shows an `Alert` (warning variant, same component/pattern as `profile-panel.tsx`'s save notice): **"ฟีเจอร์นี้ยังไม่เชื่อมต่อกับระบบหลังบ้าน — มีการฝากคำขอไว้ให้ทีม Backend แล้ว"**. No network call.

### Card 2 — ข้อมูลองค์กร (placeholder)

- Fields: ชื่อหน่วยงาน (prefilled from the existing `ORGANISATION_NAME` export in `src/lib/organisation.ts` — **read-only import of an already-exported constant, not a modification to `src/lib/`**), ที่อยู่, เบอร์โทร (both blank — no current data source for these).
- Same "บันทึก" → same not-connected `Alert` notice pattern as Card 1.

### Card 3 — จัดการยี่ห้อ/รุ่นแอร์ (fully functional)

- Renders the existing `<MasterDataClient initialBrands={brands} />` component unmodified (aside from the `router.refresh()` addition in Section 2). `brands` comes from the `masterDataBrands` prop (Section 5) — real create-brand / create-model forms, real data, real persistence. No placeholder needed; this section works today because its backend already exists.
- Layout: reuse the stats-sidebar + list layout from the old `master-data/page.tsx` (ยี่ห้อทั้งหมด / รุ่นแอร์ทั้งหมด counts), adapted to sit inside a `biz-card` section instead of its own full page.

### Card 4 — ประวัติการใช้งานระบบ (empty-state placeholder)

- No fabricated/dummy rows. A static empty-state block (icon + text): **"ประวัติการใช้งานระบบจะแสดงที่นี่ เมื่อ Backend เปิดให้ดึงข้อมูลจากตาราง audit log"**.
- This is a read/list view with no editable form, so it does not follow the "editable but shows a notice on save" pattern used in Cards 1–2 — there's nothing to save. It's simply not built yet.

### Team Panel — "รีเซ็ตรหัสผ่าน" button (placeholder)

- New button per row (any status), opens the existing Thai confirm dialog (`thai-alert-dialogs.tsx`) asking to confirm resetting that user's password.
- On confirm → same not-connected `Alert` notice pattern, no mutation. (Once the backend lands, per `HANDOFF.md:844`, the actual behavior will be setting `password = NULL`, which triggers the existing forced-reset flow in `authorize()` — no admin ever sees or types another user's password.)

## 4. Props / Data Flow

```ts
// admin-dashboard-view.tsx → SettingsPanel
// BrandType is the type already defined locally in master-data-client.tsx
// (id, name, modelsCount, acCount, models) — reuse it via import, don't
// redeclare it.
interface SettingsPanelProps {
  brands: BrandType[]; // from masterDataBrands prop, passed through unchanged
  universityName: string;
}
```

`masterDataBrands` is fetched once in `admin/page.tsx` via the existing `getAcMasterData()` action (already used, unmodified) and passed down — same "no new network round-trip for rendering" principle as the profile page spec.

## 5. Error Handling

- Cards 1, 2, and the reset-password button: no real failure mode exists yet since nothing is persisted — the "not connected" `Alert` is the deliberate, visible outcome, not a swallowed error.
- Card 3 (master data): inherits the existing `createAcBrandAction`/`createAcModelAction` error handling unchanged (Zod validation, duplicate-name checks, inline error text) — already proven in production at the old route.
- Card 4: no data fetch, so no failure mode to handle.

## 6. Testing

Manual, in-browser (no test framework in this project for UI):
1. Dev server running, log in as `org_admin`.
2. Click "ตั้งค่าระบบ" in the sidebar — previously blank, should now render all four cards.
3. Card 1/2: edit fields, click บันทึก → confirm the warning `Alert` appears, no network request fires (check Network tab).
4. Card 3: add a new brand, then a new model under it → confirm it appears without a manual page reload (validates the `router.refresh()` fix), confirm duplicate-name error text still works.
5. Card 4: confirm the empty-state renders, no console errors.
6. ทีมพานเนล: confirm "รีเซ็ตรหัสผ่าน" button opens the confirm dialog, confirming shows the not-connected `Alert`, no request fires.
7. Confirm the old `/admin/master-data` URL no longer exists (returns 404) and that no remaining link in the app points to it.
8. `npx tsc --noEmit` — no new errors.

## 7. Explicitly Out of Scope

- Actually persisting default frequency, organisation info, or password resets — requires the `SystemSettings` table + new Server Actions (backend-owned, see Section 8).
- Reading real audit log data — requires a new backend query function (none exists today; `src/lib/audit.ts` is write-only).
- Any change to `prisma/schema.prisma`, `src/app/**/actions.ts`, `src/app/api/**`, or `src/lib/**`.

## 8. Follow-up: Backend Requests to Log in `HANDOFF.md`

After implementation, append a new entry (following the existing request format) asking DoubleKill for:

1. **New `SystemSettings` table** (singleton, fixed `id = 1`): `defaultFrequencyValue Int @default(6)`, `defaultFrequencyUnit String @default("months")`, `organisationName String?`, `organisationAddress String?`, `organisationPhone String?`, `updatedAt DateTime @updatedAt`.
2. **`updateDefaultFrequencyAction(value, unit)`** — org_admin guard, Zod-validate `value > 0` and `unit` in `["days","months","years"]`, upsert the singleton row, `logAudit`. New `MaintenanceSchedule` rows should read this value instead of the hardcoded schema default (existing rows untouched — confirmed decision).
3. **`updateOrganisationInfoAction(name, address, phone)`** — org_admin guard, upsert the singleton row, `logAudit`. Also: change `src/lib/organisation.ts`'s `ORGANISATION_NAME` constant into an async `getOrganisationName()` that reads from `SystemSettings` (falling back to the current hardcoded string if unset), and update its two call sites in `tech/actions.ts` and `admin/actions.ts`.
4. **`adminResetUserPasswordAction(userId)`** — org_admin guard, sets `password = NULL` on the target user (no admin-visible new password, per the existing `authorize()` forced-reset flow), `logAudit`.
5. **A read function for `system_audit_logs`** (e.g. `getAuditLogs({ page, actionFilter? })`) — the table has data (`src/lib/audit.ts` writes to it from several existing actions) but nothing reads it back. Return the latest ~200 entries, newest first, with the acting user's name joined in.
6. *(Optional/minor)* In `src/app/admin/master-data/actions.ts`, `createAcBrandAction` and `createAcModelAction` call `revalidatePath("/admin/master-data")` — that route is being deleted this round (Section 2). Frontend is compensating with `router.refresh()`, but changing the target to `revalidatePath("/admin")` would be the more correct long-term fix whenever backend next touches this file.

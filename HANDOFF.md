# Project Handoff & Technical Summary

## ⚠️ กฎสำคัญ: ห้ามแก้ Backend เอง

**Esther03u (หรือใครก็ตามที่ทำฝั่ง UI/Frontend) ห้ามแก้โค้ด Backend เองโดยเด็ดขาด** ได้แก่ (ไม่จำกัดเพียง):
- `prisma/schema.prisma` และ migration files
- `src/app/**/actions.ts` (Server Actions)
- `src/app/api/**` (Route Handlers)
- `src/lib/**` (auth, prisma client, business logic helpers เช่น `maintenance.ts`)

ถ้าต้องการให้เพิ่ม/แก้อะไรใน Backend (เช่น field ใหม่ใน response, endpoint ใหม่, logic การคำนวณ) ให้ **เขียนคำขอไว้ในไฟล์นี้** (เพิ่ม section ใหม่ด้านล่าง หรือ comment ในหัวข้อ Backlog ที่เกี่ยวข้อง) แล้ว commit/push ขึ้น Git — Backend จะถูกทำโดย DoubleKill (เจ้าของโปรเจกต์) เท่านั้น เหตุผล: ป้องกัน schema/migration ชนกันข้ามเครื่อง และป้องกัน business logic (เช่น multi-tenant isolation, auth guard) ถูกแก้โดยไม่เข้าใจผลกระทบทั้งระบบ

---

## 🚨 F1 ทำเสร็จแล้ว (11 สิงหาคม 2026) — ระบบไม่ใช่ multi-tenant อีกต่อไป

**อ่านก่อนแตะโค้ดใดๆ** ระบบถูกลดขนาดเหลือใช้กับสถาบันเดียว การเปลี่ยนแปลงกระทบทั้งโปรเจกต์:

| เปลี่ยน | รายละเอียด |
|---|---|
| **ลบ role `super_admin`** | เหลือ `org_admin` กับ `technician` — บัญชี super admin ถูกลบออกจากฐานข้อมูล |
| **ลบ `/super-admin` ทั้งหมด** | รวม `src/components/super-admin/` และ `/api/super-admin/**` |
| **ลบตาราง `universities`** | และคอลัมน์ `university_id` ออกจาก `users`, `buildings`, `work_orders`, `system_audit_logs` |
| **`ac_code` สั้นลง** | `[UNI]-[BLDG]-[ROOM]-[NN]` → **`[BLDG]-[ROOM]-[NN]`** (rename ให้ครบ 73 เครื่องแล้วใน migration) |
| **ข้อมูลเหลือ 1 สถาบัน** | เก็บ university id ต่ำสุดไว้ ลบที่เหลือทิ้ง (เป็น seed จาก faker ทั้งหมด ไม่ใช่ข้อมูลจริง) |
| **`session.user.universityId` หายไป** | ตัดออกจาก JWT/Session type แล้ว — โค้ดที่ยังอ้างถึงจะ compile ไม่ผ่าน |
| **ย้ายเมนู Master Data** | `/super-admin/master-data` → **`/admin/master-data`** (F7 ทำไปพร้อมกัน เพื่อไม่ให้มีช่วงที่เพิ่มยี่ห้อแอร์ไม่ได้) |
| **ชื่อหน่วยงาน** | เดิมอ่านจากตาราง ตอนนี้เป็นค่าคงที่ `ORGANISATION_NAME` ใน **`src/lib/organisation.ts`** — F5 จะเปลี่ยนเป็นอ่านจาก `SystemSettings` ทีหลัง |

**⚠️ ต้องรัน `npx prisma migrate deploy` แล้ว `npx prisma generate` ทันทีหลัง pull** migration `20260811093000_remove_multi_tenancy` **ลบข้อมูลของสถาบันอื่นถาวร** (จำเป็น ไม่งั้น unique constraint ใหม่กับ enum จะพัง) — สำรองฐานข้อมูลก่อนถ้าเครื่องคุณมีข้อมูลที่อยากเก็บ

**สิ่งที่ยกเลิกไปโดยปริยาย:** backlog ข้อ **#10** (กราฟ Super Admin แยกสีตามมหาวิทยาลัย) ไม่ต้องทำแล้ว เพราะไม่มี Super Admin และไม่มีหลายมหาวิทยาลัยให้เทียบ

**สิ่งที่แก้ไปด้วยระหว่างทาง:** ปุ่ม quick-login "ผู้ดูแลระบบสูงสุด" ในหน้า login (บัญชีไม่มีอยู่แล้ว), comment ล้าสมัยเรื่องตาราง Laravel ใน `schema.prisma`, และ `/register` เลิกเป็น `force-dynamic` แล้ว (P15 ใส่ไว้เพราะหน้านั้นเคยอ่านรายชื่อมหาวิทยาลัยจาก DB — ตอนนี้ไม่อ่านแล้วจึงกลับไป static ได้)

**ทดสอบด้วยการรันจริงแล้ว:** เข้าสู่ระบบทั้ง org_admin และ technician, dashboard ทั้งสองฝั่ง, `/admin/master-data`, และหน้า QR — ข้อมูลครบถ้วน (73 เครื่อง / 4 ช่าง / 48 ใบงาน / 5 ยี่ห้อ 189 รุ่น) ไม่มี error ทั้ง console และฝั่งเซิร์ฟเวอร์

---

## 🗄️ Database Sync — สำคัญมาก อ่านก่อน pull/push ทุกครั้ง

โปรเจกต์นี้ใช้ MySQL local (XAMPP) แยกเครื่องกัน — **โค้ดที่ push ขึ้น Git ไม่ได้ทำให้ฐานข้อมูลของอีกฝั่งตรงกันอัตโนมัติ** ต้องใช้ Prisma Migration เป็นตัวกลางเสมอ

**หลัง `git pull` ทุกครั้ง ให้รันคำสั่งนี้ก่อนเปิด dev server:**
```bash
npx prisma migrate deploy
npx prisma generate
```
ถ้าคำสั่งนี้แจ้งว่ามี migration ใหม่ที่ยังไม่ apply แปลว่าฐานข้อมูลของคุณ "ไม่ตรงกัน" กับที่ DoubleKill แก้ไว้ — รันตามนี้แล้วข้อมูลจะ sync ให้อัตโนมัติ (migration ทุกไฟล์ในโปรเจกต์นี้เขียนให้ idempotent แล้ว รันซ้ำได้ไม่พัง ไม่ต้องกลัวข้อมูลซ้ำ/หาย)

**ล่าสุด (27 กรกฎาคม 2026):** เพิ่ม migration `20260727161239_backfill_maintenance_schedules_and_ac_catalog` — เป็น **data migration** (ไม่ใช่ schema change) backfill ตาราง `maintenance_schedules` (189 แถว, รอบ 3 เดือน) และ `ac_brands`/`ac_models` (5 ยี่ห้อ, 189 รุ่น) ที่ว่างเปล่ามาตลอด **ต้อง `migrate deploy` ก่อน ไม่งั้นปฏิทินซ่อมบำรุงกับหน้า Master Data จะยังว่างเหมือนเดิม**

**ถ้าฝั่งเพื่อนมีข้อมูลเพิ่มเติมในเครื่องตัวเอง** (เช่น สร้าง user/มหาวิทยาลัยทดสอบเพิ่ม, แก้ข้อมูลผ่าน `prisma studio`, หรือ seed อะไรใหม่ที่อยากให้อีกฝั่งมีด้วย):
- **ห้าม** แก้ `schema.prisma` หรือสร้าง migration เอง (ผิดกฎด้านบน)
- ให้เขียนสรุปไว้ใน `HANDOFF.md` ว่าเพิ่ม/แก้ข้อมูลอะไรไปบ้าง (ตาราง, เงื่อนไข, ตัวอย่างค่า) แล้ว commit/push โค้ดตามปกติ — DoubleKill จะเขียน data migration ให้ในรอบถัดไปเหมือนที่ทำข้อ backfill นี้

---

## 📧 การตั้งค่าอีเมล (SMTP) — เพิ่มเมื่อ 10 สิงหาคม 2026

ระบบ "ลืมรหัสผ่าน" ส่งอีเมลจริงได้แล้ว (เดิม `console.log` ลิงก์ไว้เฉยๆ) ตัวส่งอีเมลอยู่ที่ **`src/lib/mail.ts`** ใช้ `nodemailer` และอ่านค่าทั้งหมดจาก environment variable จึงใช้ได้กับทั้ง Gmail, SMTP ของมหาวิทยาลัย หรือบริการอื่น โดยไม่ต้องแก้โค้ด

**เพิ่มค่าเหล่านี้ใน `.env` (ไฟล์นี้ไม่ขึ้น Git — ต้องตั้งเองทุกเครื่อง):**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-account@gmail.com
SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx   # Gmail ต้องใช้ App Password ห้ามใช้รหัสผ่านบัญชีจริง
SMTP_FROM=ระบบซ่อมบำรุงแอร์ <your-account@gmail.com>   # ไม่ใส่ก็ได้ จะใช้ SMTP_USER แทน
APP_URL=http://localhost:3000       # โดเมนที่ใช้สร้างลิงก์ในอีเมล
```

**พฤติกรรมตามการตั้งค่า:**
| สถานะ | ผลลัพธ์ |
|---|---|
| ไม่ได้ตั้งค่า SMTP | ไม่พัง — ทำงานแบบเดิม (log ลิงก์ลง console) และข้อความบนหน้าเว็บจะบอกว่าอยู่ในโหมดพัฒนา |
| ตั้งค่าแล้ว | ส่งอีเมลจริง (มีทั้งเวอร์ชัน text และ HTML) และ **เลิก log ลิงก์ลง console** เพื่อไม่ให้ token หลุดลงไฟล์ log |
| ตั้งค่าผิด/ต่อไม่ได้ | ไม่ทำให้หน้าเว็บพัง — error ลง console ฝั่งเซิร์ฟเวอร์ ส่วนผู้ใช้เห็นข้อความกลางๆ เหมือนเดิม (กันการเดาว่าอีเมลไหนมีในระบบ) |

**⚠️ `APP_URL` สำคัญ:** ถ้าไม่ตั้ง ลิงก์ในอีเมลจะชี้ไป `http://localhost:3000` ซึ่งผู้รับกดแล้วใช้ไม่ได้ ต้องตั้งเป็นโดเมนจริงก่อนใช้งานกับผู้ใช้จริง

**หมายเหตุพอร์ต:** 587 = STARTTLS (ปกติใช้อันนี้), 465 = TLS ตั้งแต่ต้น โค้ดเดาให้อัตโนมัติจากเลขพอร์ต ถ้าต้องบังคับให้ตั้ง `SMTP_SECURE=true|false` เอง

---

## 📌 Project Overview
**Project Name:** AC Maintenance Management System (`ac-maintenance`)
**Framework & Tech Stack:**
- **Framework:** Next.js 16 (App Router with `src/proxy.ts`)
- **Database ORM:** Prisma 7 with MariaDB Driver Adapter (`@prisma/adapter-mariadb`)
- **UI Components:** React, Tailwind CSS, Lucide React Icons (Strict vector SVG standard, no emojis)
- **Role-Based Access Control (RBAC):** `org_admin`, `technician` (เดิมมี `super_admin` ด้วย — ถูกตัดออกใน F1)

---

## 🚀 Recent Implementations & Enhancements

### 1. Financial & Executive Analytics Dashboard (`/admin`)
- Implemented `financial-dashboard-view.tsx` with dynamic visual summary cards, HSL color themes, cost metrics, budget allocations, and visual distribution breakdowns.
- Added server action integrations in `src/app/admin/actions.ts` to compute maintenance costs, labor expenses, replaced parts, and budget tracking.

### 2. Multi-Tenant Administration & RBAC (`/super-admin`, `/admin`, `/tech`)
- Hardened role protection and tenant boundaries (`university_id` isolation).
- Configured Next.js 16 `src/proxy.ts` combined with `src/lib/auth.config.ts` for route protection.
- Handled status enforcement (`pending` / `suspended` blocked).

### 3. Asset & Work Order Management
- Enhanced `asset-manager.tsx`, `admin-dashboard-view.tsx`, and `super-admin-view.tsx` with responsive filtering, clean metric cards, and maintenance status tracking.
- Optimized mobile experience in `tech-mobile-view.tsx` for field technicians.

### 4. UI/UX Refinements & Theming (July 2026)
- **Dashboard Metrics:** Redesigned the Admin Dashboard (`admin-dashboard-view.tsx`) by unifying 4 separate metric cards into a single comprehensive "System Status Summary" widget.
- **Progress Visualization:** Integrated Shadcn `Slider` component as a non-interactive, visual progress bar to represent the ratio of healthy vs. broken air conditioners, styled with custom track and range colors (`bg-red-500` and `bg-success`).
- **Form Controls:** Migrated all old `<Select>` and raw `<select>` elements to shadcn's `NativeSelect` component across the application (`admin-dashboard-view`, `asset-manager`, `tech-mobile-view`, `chart-area-interactive`, etc.). Improved `native-select.tsx` to properly propagate custom classNames to the internal `<select>` tag for consistent padding and height alignment with text inputs.
- **Semantic Theming:** Audited and replaced hardcoded Tailwind color utility classes (e.g., `slate`, `sky`, `indigo`, `emerald`, `amber`) with semantic theme variables (e.g., `bg-background`, `bg-muted`, `bg-primary`, `bg-success`, `text-warning-foreground`, `border-border`) to fully support the dynamic HSL theme preset (`b7WjPrGOe`).
- **Layout Alignment:** Fixed visual asymmetries, such as the vertical separator spacing in the sidebar trigger (`dashboard-layout.tsx`) and text overlapping in chart dropdowns.

### 5. Backend Work Session (DoubleKill — 27 กรกฎาคม 2026)

แก้/เพิ่ม Backend ตาม Backlog ด้านล่างครบทุกข้อที่เป็นงาน Backend แล้ว (UI ยังไม่ได้ทำ — ดูหมายเหตุใน checklist แต่ละข้อ):

- **Root cause แก้แล้ว:** ปฏิทินซ่อมบำรุงไม่เคย auto-update เพราะ `logMaintenanceAction`/`getTechnicianData` ไม่เคยแตะ `MaintenanceSchedule` เลย — แก้ให้ทุกครั้งที่ปิดงาน `MaintenanceSchedule.lastPerformedAt`/`nextDueDate` จะขยับตาม `frequencyValue`/`frequencyUnit` อัตโนมัติ
- **"Auto-check" ทำเป็น lazy-check** (`src/lib/maintenance.ts` → `syncOverdueMaintenanceWorkOrders`) เพราะ stack นี้ไม่มี cron — รันทุกครั้งที่ dashboard ที่เกี่ยวข้องโหลด (`getTechnicianData`, `getOrgAdminData`, `/api/tech/units`)
- **Endpoint/field ใหม่ที่ UI เรียกได้แล้ว:**
  - `GET /api/tech/units` → `{ units: [...], summary: { total, cleaningJobs, repairJobs } }` (list แอร์ทั้งหมด sort ตาม backlog #1)
  - `getOrgAdminData()` → เพิ่ม `metrics.repairUnits`, `metrics.cleaningUnits`, `urgentUnits[]`
  - `getSuperAdminData()` → เพิ่ม `universityBreakdown[]` (per มหาวิทยาลัย: totalAcCount, brokenCount, techCount, cleanedCount, repairedCount)
  - `bulkClaimWorkOrdersAction(workOrderIds: string[])` → `{ success, claimedCount, skippedCount }` (atomic, กันแย่งงาน)
  - `/api/admin/maintenance-schedules` เปิดให้ role `technician` เรียกได้แล้ว (เดิมเปิดแค่ `org_admin`) พร้อม field `lastPerformedByName`
- **Data backfill:** `maintenance_schedules` (ว่างเปล่าอยู่ก่อนหน้านี้ — สร้างครบ 189 เครื่อง รอบ 3 เดือน), `ac_brands`/`ac_models` (backfill จากข้อมูล `brand`/`model` เดิม → 5 ยี่ห้อ, 189 รุ่น, ผูก `ac_brand_id`/`ac_model_id` กลับครบ)
- **บั๊กที่แก้ระหว่างทาง:** race condition ใน `claimWorkOrderAction` (2 ช่างกดรับงานเดียวกันพร้อมกันได้), ช่องโหว่ multi-tenant ที่ `claimWorkOrderAction` เดิมไม่เช็ค `universityId`
- **ลบ dead code:** `/api/tech/work-orders/**`, `/api/admin/work-orders/route.ts`, `scripts/test_workflow_api.ts` — ไม่มี UI ไหนเรียกใช้จริง (ระบบใช้ Server Actions ใน `tech/actions.ts`/`admin/actions.ts` แทนหมดแล้ว)

### 6. Alert Component Standardization (July 27, 2026)
- **Installed** `Alert` component from shadcn/ui (`src/components/ui/alert.tsx`) exposing `Alert`, `AlertTitle`, `AlertDescription`, and `AlertAction` sub-components.
- **Replaced all custom `<div>`-based alert patterns** with the standardized `<Alert>` component across **5 files** covering **8 alert locations**:

| File | Alert Type | Variant |
|------|-----------|---------|
| `admin-dashboard-view.tsx` | DB connection error | warning (custom) |
| `admin-dashboard-view.tsx` | Action toast (success / error) | success/destructive |
| `tech-mobile-view.tsx` | DB connection error | warning (custom) |
| `tech-mobile-view.tsx` | Action toast (success / error) | success/destructive |
| `asset-manager.tsx` | Action toast (success / error) + added icon & dismiss | success/destructive |
| `login-form.tsx` | Login error | `variant="destructive"` |
| `register-form.tsx` | Form error | `variant="destructive"` |
| `register-form.tsx` | Pending approval success state | amber (custom) |
| `super-admin-view.tsx` | DB connection error | warning (custom) |
| `super-admin-view.tsx` | Action toast (success / error) | success/destructive |

- **Pattern applied consistently:**
  - **DB Error** → `<Alert>` warning colors + `<AlertTitle>` + `<AlertDescription>`
  - **Toast (success)** → `<Alert>` green + `AnimatedIcon` bounce + `<AlertAction>` dismiss button
  - **Toast (error)** → `<Alert>` red + `AnimatedIcon` wiggle + `<AlertAction>` dismiss button
  - **Form Error** → `<Alert variant="destructive">` + `<AlertDescription>`
- Verified with `npx tsc --noEmit` → **0 TypeScript errors**.

---

## 📁 Key File Structure & Architecture

```
ac-maintenance/
├── src/
│   ├── app/
│   │   ├── admin/                # Admin Routes & Actions (org_admin)
│   │   ├── super-admin/          # Platform Admin Routes & Actions (super_admin)
│   │   ├── tech/                 # Technician Mobile Interface & Actions (technician)
│   │   ├── api/                  # REST & Action API Handlers
│   │   └── proxy.ts              # Next.js 16 Proxy Convention for Auth Guard
│   ├── components/
│   │   ├── admin/                # Admin & Financial Dashboard Components
│   │   ├── super-admin/          # Super Admin Dashboard Components
│   │   ├── tech/                 # Technician Mobile Components
│   │   └── ui/                   # Shared UI Primitives (incl. alert.tsx)
│   └── lib/
│       ├── auth.config.ts        # RBAC & Auth Session Helpers
│       └── prisma.ts             # Prisma 7 Database Instance with MariaDB Driver Adapter
├── prisma/
│   └── schema.prisma             # Database Schema Definition
└── HANDOFF.md                    # Handoff Documentation
```

---

## 🛠 Developer Workflow & Commands

### 1. Local Development
```bash
npm run dev
```

### 2. Database Migrations & Prisma Studio
```bash
npx prisma db push
npx prisma studio
```

### 3. Build & Type Check
```bash
npm run build
```

---

## 📝 Git & Version Control Status
- All changes verified and staged.
- Production build verified with zero TypeScript or bundling errors.
- Latest features committed and pushed to `origin/master`.
- Backend session (27 กรกฎาคม 2026) committed and pushed — see "Backend Work Session" above.

---

## ✅ Backlog (แยกตาม Role) — บันทึกเมื่อ 27 กรกฎาคม 2026

> **หมายเหตุ:** ข้อที่ขึ้น `[Backend ✅]` แปลว่า DoubleKill ทำฝั่ง Backend เสร็จแล้ว รอแค่ UI มาเรียกใช้ — ดู endpoint/field ที่ต้องเรียกในหัวข้อ "Backend Work Session" ด้านบน ไม่ต้อง checklist [x] จนกว่า UI จะเสร็จด้วย

### Technician
- [x] 1. `[Backend ✅ — เรียก GET /api/tech/units]` Dashboard: แสดง List แอร์ทั้งหมดพร้อมวันที่ล้างล่าสุดต่อท้ายแต่ละรายการ เรียงจากไม่ได้ล้างนานที่สุดไปหาน้อยที่สุด ยกเว้นเครื่องที่ถึงกำหนดล้างแล้ว (มี work_order สถานะ pending จาก auto-check 3 เดือน) ต้องอยู่บนสุดเสมอไม่ว่าลำดับวันที่จะเป็นอย่างไร — เพิ่ม section สรุปจำนวนงานแยกตามประเภท (งานล้างกี่งาน งานซ่อมกี่งาน) — [เพิ่มแท็บ "แอร์ทั้งหมด" ในหน้า Technician แล้ว, ดึงข้อมูลแบบ SSR ผ่าน `getTechnicianAssetList()` (`src/lib/maintenance.ts`, ใช้ร่วมกับ endpoint เดิม) แทนการ fetch ฝั่ง client]
- [x] 2. ในการ์ด/รายการงาน สลับตำแหน่ง: เอาที่อยู่แอร์ (ตึก/ห้อง) ขึ้นเป็นหัวข้อหลัก แล้วย้ายรุ่นแอร์ + ขนาด BTU ลงมาเป็นรายละเอียดด้านล่างแทน (UI ล้วนๆ ข้อมูลมีอยู่แล้ว) — [ทำครบทั้ง 4 การ์ด: งานทั้งหมด, งานของฉัน, ประวัติ, แอร์ทั้งหมด]
- [x] 3. `[Backend ✅ — เรียก bulkClaimWorkOrdersAction(ids: string[])]` เพิ่มปุ่ม/checkbox ให้ช่างติ๊กเลือกหลายงานจาก pool แล้วกดรับพร้อมกันในทีเดียว (bulk claim)
- [x] 4. `[Backend ✅ — เรียก GET /api/admin/maintenance-schedules (เปิดให้ technician แล้ว, มี lastPerformedByName)]` เพิ่มปฏิทินซ่อมบำรุงแบบเดียวกับของ Org Admin แสดงวันที่ถึงกำหนดล้างแอร์ และอัปเดตอัตโนมัติเมื่อมีการซ่อม/ล้างจริงเกิดขึ้น พร้อมระบุชื่อช่างที่เป็นคนทำ (auto-update ทำงานแล้วฝั่ง backend — แค่ต้องสร้าง UI component) — [ย้าย `MaintenanceCalendar` ไป `src/components/shared/` ใช้ร่วมกับ Org Admin (ปิดข้อ 7 ไปด้วยในตัว), เพิ่ม "ทำล่าสุดโดย" ในโมดัล, ปุ่ม "สร้างใบงาน" ซ่อนอัตโนมัติสำหรับ Technician (prop `onCreateWorkOrder` เป็น optional) — ระหว่างทางเจอบั๊ก backend เดิม: endpoint อ่าน field เก่า `brand`/`frequencyMonths` ที่เป็น null หลัง backfill 27 ก.ค. ทำให้ยี่ห้อ/ความถี่ในปฏิทินว่างเปล่าทั้ง Admin และ Technician แก้ให้ join `ac_brands` และใช้ `frequencyValue`/`frequencyUnit` แทนแล้ว]

### Org Admin
- [x] 5. `[Backend ✅ — getOrgAdminData() คืน metrics.repairUnits / metrics.cleaningUnits แล้ว]` แก้ข้อมูลใน Dashboard ให้แสดงจำนวนงานซ่อมและงานล้างแยกกันชัดเจน
- [x] 6. `[Backend ✅ — getOrgAdminData() คืน urgentUnits[] แล้ว (รวม broken+overdue พร้อม location-first shape ตามข้อ 2)]` เปลี่ยนส่วน "รอซ่อมด่วน" เป็น List รายการแอร์ที่เสียและถึงกำหนดล้าง โดยสลับลำดับชื่อตึก/ชื่อแอร์ให้เหมือนรูปแบบของ Technician (ข้อ 2) — [เพิ่มคอลัมน์ BTU ต่อท้ายยี่ห้อในคอลัมน์ "สถานที่ / รุ่นแอร์" แล้ว (`ac.btu` มีอยู่แล้วทั้งใน `urgentUnits[]` และ `acUnits[]` ฝั่ง backend ไม่ต้องแก้ backend) เสร็จสมบูรณ์]
- [x] 7. `[Backend ✅ — endpoint เดียวกับข้อ 4]` ปฏิทินซ่อมบำรุง: ระบุวันครบกำหนดล้าง และอัปเดตวันที่ซ่อม/ล้างจริงอัตโนมัติพร้อมชื่อช่าง (เหมือนข้อ 4 ของ Technician — ควรใช้ component เดียวกันเพื่อไม่ให้โค้ดซ้ำ) — [ปิดพร้อมข้อ 4: การ์ดปฏิทินเดิมของ Org Admin ใช้ `src/components/shared/maintenance-calendar.tsx` ตัวเดียวกับ Technician แล้ว พร้อม "ทำล่าสุดโดย" ในโมดัล]
- [x] 8. กระดานใบงาน: เพิ่มขนาด BTU ต่อท้ายชื่อรุ่นแอร์ในทุกการ์ด (UI ล้วนๆ field `btu` มีอยู่แล้ว) — [เพิ่มแล้วทั้งแถวในตาราง "กระดานใบงาน" และในโมดัลรายละเอียดใบงาน (ข้อมูลเครื่องปรับอากาศ) — `airConditioner.btu` มากับ Prisma include เดิมอยู่แล้ว เพิ่มแค่ field เดียวใน `workOrders` map ของ `getOrgAdminData()`]
- [ ] 9. `[Backend ✅ — assignToUserId เป็น optional อยู่แล้วใน createWorkOrderAction ไม่ต้องแก้ backend]` หน้าสร้างใบงานซ่อมบำรุง: เพิ่มลำดับการเลือกแบบ cascade — เลือกตึกก่อน แล้วเลือกห้อง จากนั้นตัวเลือกเครื่องปรับอากาศจะกรองให้เห็นเฉพาะเครื่องของห้องที่เลือกเท่านั้น และเพิ่มตัวเลือกช่างเริ่มต้นเป็น "ไม่ระบุช่าง" (สอดคล้องกับ `work_orders.claimed_by` ที่เป็น nullable อยู่แล้ว)

### Super Admin
- [ ] 10. `[Backend ✅ — getSuperAdminData() คืน universityBreakdown[] แล้ว]` Dashboard: ทำกราฟแบบมีสี แสดงจำนวนแอร์ทั้งหมด จำนวนช่าง จำนวนที่เสีย จำนวนที่ล้างแล้ว จำนวนที่ซ่อมไปแล้ว แยกตามมหาวิทยาลัย โดยแต่ละมหาวิทยาลัยใช้ชุดสีที่ต่างกันในกราฟเดียวกัน
- [ ] 11. **[บั๊ก — UI/Layout ล้วนๆ]** แก้ Dashboard component ที่ปัจจุบันติดตามไปแสดงทุกหน้า ให้อยู่เฉพาะหน้า Dashboard เท่านั้น → หาสาเหตุก่อนว่าเป็นเพราะผูกไว้ผิด layout/route group (เช็ค `src/app/layout.tsx` แล้วสะอาด ไม่ใช่ตรงนั้น)
- [x] 12. **[บั๊ก — แก้ครบแล้วทั้ง Backend+ข้อมูล]** ~~หน้าข้อมูลหลัก (master data) ไม่แสดงรุ่นแอร์ที่มีในระบบ~~ → root cause คือ `ac_brands`/`ac_models` ว่างเปล่า (query/UI ไม่ได้ผิด) — backfill แล้ว 5 ยี่ห้อ, 189 รุ่น ยืนยันแสดงผลถูกต้องแล้ว

---

## ⚡ ข้อเสนอปรับปรุงประสิทธิภาพ (Performance Backlog) — เสนอเมื่อ 4 สิงหาคม 2026

ผลจากการตรวจโค้ดทั้งโปรเจกต์ (DoubleKill)
แบ่งตามเจ้าของงานตามกฎ "ห้ามแก้ Backend เอง" ด้านบนของไฟล์นี้

> **สถานะ 9 สิงหาคม 2026:**
> - **กลุ่ม A เสร็จหมด** (P1–P4, P6) ยกเว้น **P5 ที่ยกเลิกโดยตั้งใจ** — ดูเหตุผลด้านล่าง
> - **กลุ่ม B เสร็จหมด** (P7, P8, P9)
> - **กลุ่ม C ยังไม่เริ่ม** เป็นงาน UI ของ Esther03u ทั้งหมด แต่ **backend รองรับพร้อมแล้วทุกข้อ**
>
> ✅ **ไม่มีงาน backend ค้างแล้ว** — ที่เหลือทั้งหมดเป็นงาน UI
>
> **บริบท:** ตอนนี้ข้อมูลยังเล็ก (73 แอร์/มหาวิทยาลัย, 607 maintenance_logs) ทุกหน้าจึงยังเร็วอยู่
> ข้อที่เหลือจะเริ่มรู้สึกตอนข้อมูลโต

### 🟢 กลุ่ม A — Backend/DB ล้วน (เสร็จแล้ว)

ทั้งกลุ่มนี้ **return shape เดิมทุก field** ฝั่ง UI ไม่ต้องแก้อะไร

- [x] **P1.** `getOrgAdminData()` — ย้าย `brands: await prisma.acBrand.findMany(...)` เข้าไปใน `Promise.all` (เดิมอยู่ใน return object เลยรัน **หลัง** query อื่นเสร็จหมด = เสีย round trip ฟรีทุกครั้งที่โหลดหน้า)
- [x] **P2.** `getOrgAdminData()` — รวม query `pendingUsersRaw` + `allUsersRaw` เป็นอันเดียวแล้ว filter ใน memory + ใส่ `select` → **password hash ไม่ถูกดึงออกจาก DB อีกแล้ว**
- [x] **P3.** `syncOverdueMaintenanceWorkOrders()` — throttle 5 นาที/tenant (เดิมยิง query + อาจเขียน DB **ทุกครั้ง**ที่โหลด `/admin`, `/tech`, `/api/tech/units`) ถ้า query ล้มเหลวจะไม่ถูก cache เป็น "เช็คแล้ว"
- [x] **P4.** `bulkClaimWorkOrdersAction()` — จากวน `updateMany` ทีละ id (รับ 20 งาน = 20 round trip ถือ lock ยาว) เหลือ **2 query** + audit เปลี่ยนเป็น `logAuditMany` (`createMany`)
  - ⚠️ รายละเอียดที่ต้องรู้: `work_orders.claimed_at` เป็น `Timestamp(0)` = ความละเอียดระดับวินาที ถ้าส่ง `Date` ที่มี milliseconds จะถูกตัดตอนเขียนแล้วอ่านกลับมาเทียบไม่ตรง โค้ดจึง align เป็นวินาทีก่อนใช้
- [x] **P6.** ย่อรูปตอนอัปโหลดใน `saveUpload()` — downscale 1600px + JPEG quality 80 + หมุนตาม EXIF, ถ้าประมวลผลล้มเหลวจะเซฟไฟล์เดิมแทน (ไม่ทำหลักฐานหาย) URL ที่คืนรูปแบบเดิม UI ไม่ต้องแก้
  - `sharp` เดิมเป็นแค่ transitive dep ของ Next.js — ประกาศใน `package.json` ให้ชัดแล้วเพราะตอนนี้ import ตรง

#### ❌ P5 — ยกเลิกโดยตั้งใจ (ทดสอบแล้วไม่คุ้ม)

ข้อเสนอเดิมคือเพิ่ม index บน `air_conditioners.status` และ `.deleted_at` — **ทดสอบด้วย `EXPLAIN` แล้วพบว่าไม่ควรทำ:**

| Index | ผลทดสอบ |
|---|---|
| `deleted_at` | MySQL เลือก `room_id_index` แทน ไม่แตะเลย + ข้อมูล 189/189 แถวเป็น NULL (selectivity 0%) |
| `status` | ใช้ได้ถ้ามี query แบบ `WHERE status='broken'` เดี่ยวๆ **แต่แอปไม่มี query แบบนั้น** — ที่มีคือ `id IN (...) AND status='normal'` (ใช้ PK อยู่แล้ว) กับ `CASE WHEN ac.status` ใน aggregate (full scan โดยธรรมชาติ) |

ถ้าใส่ไปจะทำให้ทุก INSERT/UPDATE บน `air_conditioners` ช้าลงโดยไม่ได้อะไรกลับมา **อย่าเพิ่มกลับเข้ามาโดยไม่ได้ EXPLAIN ใหม่ก่อน**

### 🟡 กลุ่ม B — ต้องตกลงกันก่อน / ทำร่วมกัน

- [x] **P7. ลบหน้า `/dashboard` ที่เป็นโค้ด demo ค้างอยู่** — **ลบแล้ว**

  เป็น scaffold ของ shadcn ล้วนๆ ใช้ `data.json` ปลอม ไม่มีลิงก์จากหน้าไหน และไม่อยู่ใน matcher ของ `src/proxy.ts` → **เป็น public route ที่เปิดได้โดยไม่ต้องล็อกอิน** ลบไปทั้งหมด 2,750 บรรทัด + ถอน 5 packages (`@dnd-kit` ×4 + `vaul`)

  ⚠️ **แก้คำพูดเดิมในเอกสารนี้:** ตอนเสนอผมเขียนว่า "ลาก dependency หนักเข้า bundle" — **ไม่ถูกทั้งหมด** Next.js แยก chunk ตาม route อยู่แล้ว `@dnd-kit` จึงโหลดเฉพาะตอนเข้า `/dashboard` ผู้ใช้จริงที่เข้า `/admin`/`/tech` ไม่เคยโหลดเลย **ผลที่ได้จริงคือ:** ปิด public route ที่ไม่มี auth + ลบ dead code + ลด package (install/build เร็วขึ้น) ไม่ใช่ bundle เล็กลงสำหรับผู้ใช้

  📌 **`data-table.tsx` ลบไปด้วยตามที่ Esther03u อนุมัติ** (ดูหัวข้อ "คำตอบจาก Esther03u" ด้านล่าง) — ถ้าเปลี่ยนใจอยากได้กลับมาเป็นต้นแบบ ดึงคืนจาก git ได้: `git show 181269d^:src/components/data-table.tsx > src/components/data-table.tsx`

  ℹ️ ตอนลบต้องระวังไฟล์ชื่อชนกัน — `components/chart-area-interactive.tsx` (demo, ลบแล้ว) กับ `components/admin/chart-area-interactive.tsx` (ของจริง ยังอยู่) ส่วน `ui/sidebar`, `ui/chart`, `ui/table`, `ui/checkbox`, `ui/tabs`, `ui/breadcrumb` เก็บไว้ทั้งหมดเพราะหน้าจริงใช้

- [x] **P8. เปลี่ยน `include` เป็น `select` ในงาน query หนัก** — **เสร็จแล้ว**

  `getOrgAdminData()` เดิมดึง buildings → rooms → airConditioners แบบ full row + `acBrand` + `acModel` + `maintenanceSchedules` เต็มๆ และใบงานดึง full row + user 3 คนเต็มๆ ต่อ 1 ใบ ตอนนี้ `select` เฉพาะ field ที่ใช้จริงแล้ว

  🐛 **แก้บั๊กที่เจอระหว่างทาง — admin ลงทะเบียนแอร์ใหม่ไม่ได้เลย:** `brands` เป็นค่าเดียวที่ส่งดิบจาก Prisma ไม่ได้ map ทำให้ `id` เป็น BigInt แต่ค่าที่ `<select>` คืนมาเป็น string การเทียบ `brands.find(b => b.id === selectedBrandId)` จึง false เสมอ → **ช่องรุ่นว่างเปล่าตลอด** และเพราะ field นั้นเป็น `required` จึงบันทึกไม่ได้เลย

  map ให้เป็น string เหมือนลิสต์อื่นแล้ว — ทดสอบแล้วเลือก Carrier ขึ้น 37 รุ่น, LG ขึ้น 44 รุ่น (เดิมได้ 0 ทั้งคู่)

  ✅ ตรวจครบทั้ง 7 แท็บ + โมดัลรายละเอียดใบงาน ไม่มี `undefined` โผล่ (เป็นอาการที่จะเกิดถ้า `select` ตกสัก field)

- [x] **P9. เพิ่ม `loading.tsx`** — **เสร็จแล้ว (โครง — หน้าตายังปรับได้)**

  สาเหตุที่ขาวค้าง: ทั้ง 3 หน้า render `DashboardLayout` จากใน `page.tsx` ไม่ใช่ `layout.tsx` ระหว่างรอ query จึงไม่มีอะไรบนจอเลย

  เพิ่ม `src/components/layout/dashboard-loading.tsx` ใช้ร่วมกัน + `loading.tsx` ที่ `/admin`, `/tech`, `/super-admin` โครง skeleton ล้อรูปทรงจริง (sidebar rail, header h-16, แถว metric, panel เนื้อหา) เพื่อไม่ให้ layout กระตุกตอนข้อมูลมา ใส่ `aria-busy` + ข้อความ sr-only ให้ screen reader รู้ว่ากำลังโหลด

  📌 **ถึง Esther03u:** ตั้งใจทำให้เรียบๆ ไว้ — **หน้าตาปรับได้ตามใจเลย** ใช้ `ui/skeleton` กับ semantic token อยู่แล้ว ถ้าอยากให้เข้ากับธีมมากกว่านี้แก้ที่ `dashboard-loading.tsx` ที่เดียวจบทั้ง 3 หน้า จำนวนการ์ด metric ปรับผ่าน prop `metricCount`

---

## 🗓️ ปฏิทินซ่อมบำรุง: เปลี่ยนป้ายเป็นประเภทงาน — 9 สิงหาคม 2026

**⚠️ หมายเหตุถึง Esther03u:** งานนี้แก้ `src/components/shared/maintenance-calendar.tsx` ซึ่งเป็นไฟล์ฝั่ง UI ของคุณ — DoubleKill แก้ตามที่เจ้าของโปรเจกต์สั่งโดยตรง **ถ้าคุณกำลังแก้ไฟล์นี้อยู่พร้อมกัน ให้ pull ก่อน merge**

**ปัญหาเดิม:** ช่องปฏิทินแสดงแค่รหัสแอร์ ซึ่งยาวเกินความกว้างช่อง เลยถูกตัดเหลือ `RWWW-B660550-8-1944...` ทุกอัน — อ่านไม่รู้เรื่องและไม่บอกด้วยว่าเป็นงานประเภทไหน

**แก้เป็น:** `งานซ่อม - RWWW-B660550-1-241631-01` / `งานล้าง - RWWW-B467711-...` (ประเภทขึ้นก่อน แล้วตามด้วยรหัสเครื่อง) หัวข้อในโมดัลก็เปลี่ยนเป็นชื่อประเภทงานด้วย ส่วนสีเดิม (แดง=เลยกำหนด / เหลือง=ใกล้ถึง / เทา=ยังไม่ถึง) คงไว้ทั้งหมด

**ประเภทงานมาจากไหน:** ไม่มีที่ไหนเก็บ "ประเภทงาน" ของงานที่**ยังไม่เกิด**เลย — `maintenance_schedules` คือรอบล้างล้วนๆ ส่วน `work_orders` มีแค่ `status` (ไม่มี type) และ `maintenance_logs.action` เป็นงานที่ทำไปแล้ว

จึงอนุมานจากสถานะแอร์: `status = broken` → **งานซ่อม**, นอกนั้น → **งานล้าง** — เป็นเกณฑ์เดียวกับที่ dashboard ใช้นับ "รอซ่อม/รอล้าง" อยู่แล้ว จะได้ไม่ขัดกันเอง (ตรวจแล้ว: งานซ่อม 25 / งานล้าง 48 จาก 73 ตรงกับ broken 25 และ normal 21 + needs_cleaning 27)

**ถ้าจะแก้ข้อความทีหลัง:** API คืนค่ากลางๆ เป็น `jobType: "repair" | "cleaning"` ส่วนคำไทยอยู่ใน `JOB_TYPE_LABEL` ใน component แก้ที่เดียวจบ และเพราะปฏิทินตัวนี้ใช้ร่วมกันทั้ง Org Admin และ Technician ฝั่งช่างจึงเห็นเหมือนกันทันที

**ข้อจำกัดที่ควรรู้:** ตราบใดที่ยังไม่มี field ประเภทงานจริงใน DB (ดูตัวเลือก "เพิ่ม field ประเภทงาน" ที่เคยคุยกัน) ป้ายนี้จะสะท้อน**สถานะปัจจุบัน**ของเครื่อง ไม่ใช่เจตนาของใบงาน เช่นเครื่องที่เสียอยู่แล้วถึงรอบล้างพอดี จะขึ้นว่า "งานซ่อม" ถ้าอยากให้แม่นกว่านี้ต้องเพิ่มคอลัมน์ `type` ใน `work_orders` (เขียนคำขอไว้ได้)

---

### 🔴 กลุ่ม C — งานฝั่ง UI (Esther03u)

DoubleKill จะไม่แตะไฟล์เหล่านี้ ถ้าต้องการให้ backend เพิ่ม field/endpoint อะไรรองรับ เขียนคำขอไว้ในไฟล์นี้ได้เลย

- [ ] **P10.** แยก client component ก้อนยักษ์ — `admin-dashboard-view.tsx` **1,299 บรรทัด** / `tech-mobile-view.tsx` 992 บรรทัด ทั้งคู่เป็น `"use client"` และรับข้อมูล**ทั้งหมด**เป็น props → ข้อมูลถูก serialize ลง RSC payload ส่งข้ามเน็ตแล้ว hydrate ทั้งก้อน ส่วนที่ไม่ต้อง interactive ควรแยกเป็น Server Component
- [ ] **P11.** ใส่ `next/dynamic` — ตอนนี้**ไม่มีเลยสักจุด** ปฏิทิน/กราฟ recharts/modal โหลดมาพร้อมหน้าแรกทั้งหมดทั้งที่ผู้ใช้ยังไม่เห็น (chunk ใหญ่สุด 332KB)
- [ ] **P12.** ปฏิทิน — ตอนนี้เกิด waterfall: SSR เสร็จ → hydrate → ค่อย `fetch` → ค่อย render และดึง schedule **ทั้ง 73 รายการ**ทุกครั้งทั้งที่แสดงทีละเดือน
  - ✅ **Backend เสร็จแล้ว** `/api/admin/maintenance-schedules` กรองตาม `start`/`end` ได้จริงแล้ว
    - `?start=2026-09-01&end=2026-09-30` → คืนเฉพาะที่ครบกำหนดในช่วงนั้น (ทดสอบแล้ว: 15 จาก 73 รายการ)
    - **ไม่ส่ง param = คืนทั้งหมดเหมือนเดิม** ของเดิมไม่พัง / วันที่ผิดรูปแบบถูกเมินเฉยๆ ไม่ error
  - เหลือฝั่ง UI: ส่งช่วงเดือนที่กำลังแสดงไปด้วย หรือส่งข้อมูลผ่าน props จาก SSR แทน `fetch` ก็ตัดรอบ waterfall ทิ้งได้เลย
- [ ] **P13.** `<img>` → `next/image` — ทั้งโปรเจกต์**ไม่มี `next/image` เลยสักจุด** ใช้ `<img>` ดิบที่ `admin-dashboard-view.tsx` (~บรรทัด 1173) สำหรับรูปหลักฐานงานซ่อม (**P6 ฝั่ง backend เสร็จแล้ว** — รูปที่อัปโหลดใหม่ถูกย่อเหลือ 1600px แล้ว ทำ P13 คู่ด้วยจะได้ผลเต็มที่)
- [ ] **P14.** Pagination จริงบนกระดานใบงาน
  - ✅ **Backend เสร็จแล้ว** `getOrgAdminData()` คืน `workOrderPage: { total, pageSize, loaded, hasMore }` ใช้ทำปุ่มหน้าถัดไปได้เลย
  - ✅ **แถมแก้บั๊กที่เจอระหว่างทาง:** ตัวเลข "รอดำเนินการ" เดิมนับ pending จากลิสต์ที่ถูก `take: 50` ตัดไว้แล้ว เลยแสดง **47 ทั้งที่จริงมี 48** — เปลี่ยนไปนับด้วย SQL `count()` แล้ว
  - เหลือฝั่ง UI: ทำปุ่มเปลี่ยนหน้า (ตอนนี้ยังโหลดแค่หน้าแรก 50 รายการ)

---

## 🎨 UI/Styling Backlog — Deferred Backend Requests

### Work Order Board Table Styling (6 สิงหาคม 2026)

- [x] **S1. `[Backend ✅ เสร็จแล้ว 10 ส.ค. 2026 — ใช้ field `acStatus`]`** เพิ่มคอลัมน์ "ประเภทงาน" (repair vs. cleaning/maintenance) บนกระดานใบงาน ซึ่งตั้งไว้นอกขอบเขตของงาน Task 1 (row styling) เพื่อไม่โอเวอร์โหลด

  **คำขอ:** เพิ่ม `airConditioner.status` (จาก `air_conditioners.status` เช่น `"broken"`, `"needs_cleaning"`) เข้าไปใน `workOrders` mapping ของ `getOrgAdminData()` (`src/app/admin/actions.ts:186-205`) เพื่อให้ frontend สามารถอนุมาน "ประเภทงาน" ได้เหมือนวิธีเดียวกับที่ `src/lib/maintenance.ts` ทำสำหรับ technician view (status === `"broken"` → repair, status === `"needs_cleaning"` → cleaning)

  ⚠️ **นี่คือการเพิ่มแบบ additive เท่านั้น** ไม่มีการเปลี่ยน return shape อื่น — เพิ่มฟิลด์เดียวในลูป map แล้วเสร็จ

  **✅ ทำแล้ว — วิธีใช้:** ทุก item ใน `workOrders[]` มี field ใหม่ **`acStatus`** (`"normal" | "broken" | "needs_cleaning"`) ตั้งชื่อแยกจาก `status` เดิมซึ่งเป็นสถานะของ *ใบงาน* (`pending`/`claimed`/...) ไม่ใช่ของเครื่อง — ระวังอย่าสับสน 2 ตัวนี้
  ```ts
  const jobType = wo.acStatus === "broken" ? "repair" : "cleaning";
  ```
  ใช้เกณฑ์เดียวกับปฏิทินและ technician view เป๊ะๆ (`broken` → งานซ่อม, นอกนั้น → งานล้าง) เพื่อไม่ให้ป้ายขัดกันเองระหว่างหน้า
  ทดสอบจริงแล้ว: ค่าไปถึงฝั่ง client ครบ (เห็น `normal`/`needs_cleaning` ใน payload) ไม่กระทบ field เดิมใดๆ

### Org Admin Profile Page (9 สิงหาคม 2026)

หน้า "จัดการโปรไฟล์" (`src/components/admin/profile-panel.tsx`) สร้าง UI ครบแล้ว (ดูข้อมูล + ฟอร์มแก้ไขชื่อ + ปุ่มเปลี่ยนรหัสผ่านที่ทำงานได้จริงผ่าน `requestPasswordReset` เดิม) เหลือ 2 จุดที่ต้องรอ backend:

- [x] **S2. `[Backend ✅ เสร็จแล้ว 10 ส.ค. 2026]`** ปุ่ม "บันทึกการเปลี่ยนแปลง" ตอนนี้แค่โชว์ข้อความเตือนว่ายังบันทึกไม่ได้ ยังไม่มีการเซฟจริง

  **คำขอ:** เพิ่ม Server Action ใหม่ (แนะนำ `updateProfileAction(name: string)`) ใน `src/app/admin/actions.ts` ที่รับ `name` แล้ว `prisma.user.update()` เฉพาะแถวของ user ที่ล็อกอินอยู่ (ยึด `session.user.id`) — คืนค่า success/error กลับมาให้ UI แสดงผล ไม่ต้องมี field อื่นเพิ่ม

  **✅ ทำแล้ว — รวมเบอร์โทรของ S3 เข้ามาด้วยตามที่เสนอ:**
  ```ts
  import { updateProfileAction } from "@/app/admin/actions";

  const result = await updateProfileAction(name, phone);
  // { success: true } | { error: "ข้อความภาษาไทยพร้อมแสดงผลได้เลย" }
  ```
  - **`phone` มี 3 ความหมายต่างกัน** — ไม่ส่งมาเลย (`undefined`) = ไม่แตะเบอร์เดิม, ส่ง `""` = ลบเบอร์หลักทิ้ง, ส่งค่า = **แทนที่**เบอร์หลักเดิม (เบอร์เก่าถูกลบทิ้ง ไม่เก็บไว้เป็นเบอร์รอง — เพราะฟอร์มมีช่องเบอร์ช่องเดียว ถ้าเก็บไว้ผู้ใช้จะมองไม่เห็นและลบเองไม่ได้ เปลี่ยนเบอร์หลายครั้งจะสะสมแถวขยะ) ส่วนเบอร์รองที่ถูกบันทึกไว้ทางอื่นจะไม่ถูกแตะ
  - validate ด้วย Zod แล้ว: ชื่อห้ามว่าง/ยาวเกิน 255, เบอร์ยอมรับรูปแบบไทยทั่วไป (ตัวเลข เว้นวรรค `-` `+` วงเล็บ ยาว 9–20) — ข้อความ error เป็นภาษาไทยพร้อมโชว์ตรงๆ
  - **ใช้ได้ทั้ง org_admin และ technician** (ไม่ได้ล็อกด้วย `verifyOrgAdmin`) เพราะเขียนเฉพาะแถวของตัวเองจาก `session.user.id` เท่านั้น รับ userId จาก client ไม่ได้เลย — หน้าโปรไฟล์ฝั่งช่างใน F5 เรียกตัวนี้ได้เลยไม่ต้องเขียนใหม่
  - `revalidatePath` ให้อัตโนมัติตาม role แล้ว (`/tech` สำหรับช่าง, `/admin` สำหรับแอดมิน)

- [x] **S3. `[Backend ✅ เสร็จแล้ว 10 ส.ค. 2026 — ใช้ object `profile`]`** การ์ด "ข้อมูลส่วนตัว" ยังไม่มีช่องเบอร์โทรศัพท์เลย เพราะตอนนี้ `getOrgAdminData()` ไม่ส่ง `UserPhone` ของ user ที่ล็อกอินอยู่มาด้วย

  **คำขอ:** เพิ่ม field เบอร์โทรหลัก (จาก `user_phones` ที่ `is_primary = true`) เข้าไปใน `user` object ที่ `getOrgAdminData()` คืนกลับให้ UI (หรือ endpoint ใหม่เล็กๆ ก็ได้) — ถ้าจะให้แก้ไขเบอร์ได้ด้วยรวมเข้ากับ `updateProfileAction` ใน S2 ไปเลย (`updateProfileAction(name: string, phone?: string)`) จะได้ไม่ต้องทำ 2 endpoint แยกกัน

  **✅ ทำแล้ว —** `getOrgAdminData()` คืน object ใหม่ชื่อ **`profile`**:
  ```ts
  profile: { name: string; email: string; role: UserRole; phone: string | null }
  ```

  🔴 **สำคัญ — ProfilePanel ควรเปลี่ยนมาอ่านจาก `profile` แทน `user` prop เดิม:** `user` ที่ `page.tsx` ส่งให้ตอนนี้มาจาก **session (JWT)** ซึ่งถูกสร้างตอน login เท่านั้น พอผู้ใช้แก้ชื่อผ่าน `updateProfileAction` แล้ว ชื่อใน JWT จะยังเป็นค่าเก่าจนกว่าจะ login ใหม่ → กดบันทึกแล้วรีเฟรช จะเห็นชื่อเด้งกลับเป็นของเดิม ดูเหมือนบันทึกไม่ติด ทั้งที่ DB อัปเดตแล้ว
  ส่วน `profile` อ่านสดจากตาราง `users` ทุกครั้ง จึงถูกต้องเสมอ — **ใช้ `profile` กับการ์ดโปรไฟล์ ส่วน `user` เดิมยังใช้กับ nav/header ได้ตามเดิม ไม่ต้องแก้**

  **สิ่งที่ต้องทำฝั่ง UI เพื่อให้ครบวงจร** (backend พร้อมหมดแล้ว DoubleKill ไม่แตะไฟล์ UI ตามกฎ):
  1. `src/app/admin/page.tsx` — destructure `profile` เพิ่มจาก `getOrgAdminData()` แล้วส่งเป็น prop ลงไป
  2. `admin-dashboard-view.tsx` — เพิ่ม `profile` ใน props interface แล้วส่งต่อให้ `<ProfilePanel />`
  3. `profile-panel.tsx` — อ่าน `profile` แทน `user`, เพิ่มช่องเบอร์โทร, และเปลี่ยนปุ่ม "บันทึกการเปลี่ยนแปลง" ให้เรียก `updateProfileAction(name, phone)` จริง (ลบ `showBackendPendingNotice` ทิ้งได้)

---

## 📬 คำตอบจาก Esther03u — 6 สิงหาคม 2026

ตอบคำถามที่ DoubleKill ฝากไว้ใน Performance Backlog ด้านบน:

- **P7 (ลบหน้า `/dashboard` demo):** ✅ **ลบทิ้งทั้งชุดได้เลย** ไม่ใช้ `data-table.tsx` เป็นต้นแบบสำหรับ backlog #10 หรือ P13 แล้ว — จะสร้างใหม่ให้เข้ากับ pattern ของหน้าจริงแทน
- **P12 (Calendar filter start/end):** ✅ **รบกวนทำ backend filter ให้ใช้งานจริง** ตาม query param `start`/`end` ที่มีอยู่แล้วใน `/api/admin/maintenance-schedules`
- **P14 (Pagination กระดานใบงาน):** ✅ **ต้องการ** รบกวนเพิ่ม cursor/total count ฝั่ง backend เพื่อรองรับ pagination จริง (ตอนนี้ `take: 50` ตัดข้อมูลเงียบๆ)

> **ทำครบทั้ง 3 ข้อแล้ว** (9 ส.ค. 2026) — ดูรายละเอียดที่ P7 / P12 / P14 ด้านบน

---

## 🔧 บั๊กที่เจอเพิ่มระหว่างทำ Performance Backlog (แก้แล้วทั้งคู่)

### P15 — `/register` ถูก prerender ตอน build

หน้าสมัครสมาชิกอ่านรายชื่อมหาวิทยาลัยจาก DB แต่เป็น static prerender (`○ /register`) ผลคือ **มหาวิทยาลัยที่เพิ่มใหม่จะไม่ขึ้นใน dropdown จนกว่าจะ rebuild** และถ้า DB ต่อไม่ได้ตอน build หน้าจะถูก ship มาพร้อม dropdown ว่างถาวร (เกิดขึ้นจริงระหว่าง session นี้ตอน MySQL ล่ม)

แก้ด้วย `export const dynamic = "force-dynamic"` — route เปลี่ยนจาก `○` เป็น `ƒ` แล้ว

### P16 — วันที่ระดับวันคลาดไป 1 วันช่วงเที่ยงคืนถึง 7 โมงเช้า

`MaintenanceSchedule.lastPerformedAt` และ `.nextDueDate` เป็น **`@db.Date`** (วันปฏิทิน ไม่มีเวลา) แต่ถูกคำนวณจาก `new Date()` ซึ่งเป็น UTC instant ไทยเป็น UTC+7 ดังนั้น **ช่วง 00:00–06:59 น. วันที่แบบ UTC ยังเป็นเมื่อวาน**:
- ช่างปิดงานตอนตี 2 → บันทึกเป็นเมื่อวาน + นัดครั้งหน้าเร็วไป 1 วัน
- เครื่องที่ครบกำหนดวันนี้ ไม่ถูก auto-check เจอจนถึง 7 โมงเช้า

แก้โดยเพิ่ม `businessDateToday()` + `addMaintenanceInterval()` ใน `src/lib/maintenance.ts`

**⚠️ สิ่งที่ต้องรู้ถ้าจะแตะเรื่องวันที่ในอนาคต:**
1. **แยกให้ออกระหว่าง "เวลา" กับ "วัน"** — `performedAt` / `claimedAt` เป็น timestamp เต็ม เก็บเป็น UTC instant **ถูกอยู่แล้ว ห้ามแก้** (ตรวจแล้ว UI แสดงเวลาไทยถูกต้องมาตลอด) ส่วนที่เป็น `@db.Date` เท่านั้นที่ต้องใช้ `businessDateToday()`
2. **อย่าใช้ `date-fns` กับค่าที่ปักไว้ที่ UTC midnight** — `date-fns` อ่านค่าแบบ local time ถ้า deploy บนเซิร์ฟเวอร์ที่ offset ติดลบ (เช่นสหรัฐฯ) จะได้วันผิด `addMaintenanceInterval()` เลยใช้ UTC setter และหนีบวันสิ้นเดือนเอง (31 ม.ค. + 1 เดือน = 28 ก.พ. ไม่ใช่ 3 มี.ค.) — เทียบกับ `date-fns` แล้วตรงกันครบ 11 เคส
3. **MySQL `NOW()` เป็นเวลาไทย (+07) แต่ข้อมูลในตารางเป็น UTC** ห่างกัน 7 ชม. ถ้าจะเขียน raw SQL ที่เทียบ timestamp ระวังจุดนี้ (ตอนนี้ยังไม่มี raw SQL ไหนที่เทียบเวลา)

---

## 🆕 Feature Backlog — วางแผนละเอียดแล้ว พร้อมเริ่มทำ (10 สิงหาคม 2026)

> ผ่านการคุยรายละเอียด/ตัดสินใจกับเจ้าของโปรเจกต์ครบทุกข้อแล้ว (เดิมเป็นแค่ขอบเขตกว้างๆ ตอนบันทึกครั้งแรก) ยังไม่ได้ลงมือเขียนโค้ดข้อไหนเลย — เอกสารนี้คือแผนที่ตกลงกันแล้ว รอเริ่มทำตามลำดับ

### F1. ถอดระบบ Multi-tenant + Super Admin ออกทั้งหมด — ใช้เฉพาะภายใน มรภ.ภูเก็ต

**การตัดสินใจที่ล็อกแล้ว:**
- **`acCode` รูปแบบใหม่:** `[BLDG]-[ROOM]-[NN]` (ตัด segment มหาวิทยาลัยออก ให้สั้นและอ่านง่ายขึ้น) — ของเดิม 189 เครื่องต้อง rename รหัสระหว่างทำ data migration
- **ข้อมูลเดิม:** เก็บเฉพาะข้อมูลของ PKRU ลบข้อมูลมหาวิทยาลัยอื่นทั้งชุดออก (buildings/rooms/AC/users/work orders/logs) — เหตุผล: ข้อมูลทั้งหมดเป็น seed จำลอง (faker) อยู่แล้ว ไม่ใช่ข้อมูลจริงที่ต้องรักษาไว้ทุกฝั่ง แต่ subset ของ PKRU มีข้อมูลครบพร้อม demo/ทดสอบ flow ได้ทันที (73 เครื่อง + work order + log) ประหยัดเวลากว่าการ re-seed ใหม่ทั้งระบบ
- **บัญชี `super_admin` เดิม:** ลบทิ้งไปเลย

**Schema (`prisma/schema.prisma`):**
| เปลี่ยน | รายละเอียด |
|---|---|
| ลบ model `University` | ทั้ง model |
| `Building` | ลบ `universityId` + relation `university`; unique `[universityId, abbreviation]`/`[universityId, name]` → เหลือ unique เดี่ยวบน `abbreviation`/`name` (กลายเป็น global unique) |
| `User` | ลบ `universityId` + relation + index ที่เกี่ยวข้อง |
| `WorkOrder` | ลบ `universityId` (denormalized field) + relation + index |
| `SystemAuditLog` | ลบ `universityId` + relation + index |
| `enum UserRole` | ลบ `super_admin` เหลือ `org_admin \| technician` (คงชื่อ `org_admin` ไว้เพื่อลดจุดที่ต้องแก้ ถึงจะไม่มี "org" อื่นแล้วก็ตาม) |

**ไฟล์ backend ที่ต้องแก้ (ยืนยันจากโค้ดจริงแล้ว):**
`src/app/admin/actions.ts`, `src/app/tech/actions.ts` (เกือบทุกฟังก์ชันใช้ `universityId` scope query — ตัด filter ออกทั้งหมด), `src/app/api/admin/maintenance-schedules/route.ts`, `src/app/api/tech/units/route.ts`, `src/lib/maintenance.ts` (`syncOverdueMaintenanceWorkOrders` ตัด parameter tenant ออก — throttle เปลี่ยนจาก per-tenant เป็น global ตัวเดียว), `src/lib/audit.ts` (ตัด `universityId` ออกจาก `logAudit`/`logAuditMany` params), `src/lib/auth.ts` + `src/lib/auth.config.ts` (ตัด `universityId` ออกจาก JWT/session callback, ลบ role check `super_admin` ใน `authorized()`, ลบ matcher `/super-admin/:path*` และ `/api/super-admin/:path*`), `src/types/next-auth.d.ts` (ตัด `universityId` ออกจาก session/JWT type), `src/app/register/actions.ts` + `register-form.tsx` (ตัด dropdown เลือกมหาวิทยาลัย, `isInstitutionalDomain` ปรับให้เช็คเฉพาะโดเมน มรภ.ภูเก็ต), `src/app/admin/actions.ts` line ~685 (`acCode` generation ตัด `room.building.university.abbreviation` ออก)

**ลบทั้งไฟล์:** `src/app/super-admin/**` (รวม `master-data/**`), `src/app/api/super-admin/**`

**UI ที่ต้องแก้ตาม:** `login-form.tsx` (ปุ่ม quick-login super admin), `nav-header.tsx`/`dashboard-layout.tsx` (เงื่อนไข role `super_admin` + การแสดง `universityName`), `page.tsx` (root redirect ไป `/super-admin`), `qr/[id]/page.tsx` (include `building.university` ที่ไม่มีแล้ว)

**⚠️ Dependency สำคัญกับ F7:** `/super-admin/master-data` (จัดการยี่ห้อ/รุ่นแอร์ — `AcBrand`/`AcModel`) ถูกลบไปด้วยในข้อนี้ ต้องย้ายฟังก์ชันนี้ไปเป็นเมนูแยกของ org_admin ตาม F7 ไม่งั้นจะไม่มีทางเพิ่มยี่ห้อ/รุ่นแอร์ใหม่ได้อีกเลยหลัง F1 เสร็จ

**ลำดับแนะนำ:** cleanup ข้อมูลมหาวิทยาลัยอื่นในDB ก่อน → แก้ schema + สร้าง migration (รวม rename `acCode` เดิม 189 ตัว) → แก้ backend ให้ build ผ่าน (TypeScript จะฟ้องทุกจุดที่ยังอ้าง `universityId`/`university` ใช้เป็น checklist ได้เลย) → ลบโฟลเดอร์ super-admin → แก้ UI ที่เหลือ → ทดสอบ flow org_admin/technician ใหม่ทั้งหมด

---

### F2. ปฏิทิน — Drill-down ตามอาคารเมื่อวันเดียวมีงานเยอะ

**ตัดสินใจแล้ว:** ช่องปฏิทินของวันที่มีงานเยอะ ให้แสดงเป็น **รายชื่อตึกพร้อมจำนวนงาน** แทนการเรียงทีละงาน กดชื่อตึก → เปิดดูรายละเอียดงานทั้งหมดของตึกนั้นในวันนั้น (2 ระดับ: วัน → ตึก → รายการงาน)

| | งาน |
|---|---|
| **Backend** | `/api/admin/maintenance-schedules/route.ts` ตอนนี้คืน `location` เป็น string รวม (`"ตึก A - ห้อง 301"`) เพิ่ม field แยก `buildingId`/`buildingName` ต่างหาก (แก้แค่ select เพิ่ม ไม่กระทบ query เดิม) |
| **Frontend** | `maintenance-calendar.tsx` ปรับ day cell: group ข้อมูลตาม `buildingName` ก่อน render เป็น list ชื่อตึก + จำนวนงาน กดแล้วเปิด modal/panel แสดงรายการงานของตึกนั้นในวันนั้น |

---

### F3. เพิ่มหน้า/ส่วนแสดงประวัติการดูแลรักษาของแอร์แต่ละตัว

| | งาน |
|---|---|
| **Backend** | เพิ่ม action ใหม่ `getAirConditionerHistory(acId)` คืน `MaintenanceLog` ทั้งหมดเรียงล่าสุดก่อน (query pattern นี้มีอยู่แล้วใน `qr/[id]/page.tsx` — แนะนำแยกเป็น shared helper ใน `src/lib/maintenance.ts` ให้ทั้ง QR page และ action ใหม่เรียกร่วมกัน ลดโค้ดซ้ำ) |
| **Frontend** | เพิ่มปุ่ม/โมดัล "ดูประวัติ" ใน `asset-manager.tsx` แสดง timeline (รูปแบบเดียวกับที่มีอยู่แล้วในหน้า QR) |

---

### F4. เพิ่มวันที่ติดตั้งแอร์ (`installedAt`) + default

| | งาน |
|---|---|
| **Backend** | `createAirConditionerAction` (`admin/actions.ts` ~บรรทัด 651) เพิ่มรับ `installedAt` จากฟอร์ม, validate ผ่าน `acSchema` เป็น optional, ไม่กรอก → default เป็น `businessDateToday()` |
| **Frontend** | เพิ่ม date input ในฟอร์มเพิ่มแอร์ (`asset-manager.tsx`) เป็น optional พร้อมข้อความบอกว่าไม่กรอก = ใช้วันนี้ |

---

### F6. QR Code — ดูประวัติได้โดยไม่ต้อง Login แต่บันทึกงานต้อง Login

ยืนยันจากโค้ดจริง: `src/app/qr/[id]/page.tsx` ตอนนี้บังคับ login อยู่แล้ว (เช็ค `session?.user` แล้วเด้งหน้า "ไม่มีสิทธิ์เข้าถึง") และเป็นหน้า read-only ล้วนๆ ไม่มีปุ่มบันทึกงานอยู่แล้วด้วย **ตัดสินใจแล้วว่าไม่ต้องซ่อนชื่อช่างที่เคยทำงาน แม้จะเปิดเป็น public**

| | งาน |
|---|---|
| **Backend** | ตัด auth gate ออกจาก `qr/[id]/page.tsx` ให้ query แสดงได้เลยไม่ต้องมี session (query ตรงด้วย prisma อยู่แล้ว ไม่ผ่าน guarded action ทำง่าย) |
| **Frontend** | เพิ่มปุ่ม "บันทึกงานซ่อมบำรุง" (ตอนนี้ไม่มี) กดแล้วถ้ายังไม่ login → redirect `/login` พร้อม callbackUrl กลับมาหน้า QR เดิม ถ้า login แล้ว → พาไปฟอร์มบันทึกงาน (ผูกกับ `logMaintenanceAction` ที่มีอยู่แล้ว) |

---

### F5. หน้า "โปรไฟล์/preference ส่วนตัว" (ทุก role) + "ตั้งค่าระบบ" (เฉพาะ org_admin)

> **⚠️ อัปเดต 10 ส.ค. 2026 หลัง `git pull`:** Esther03u สร้าง `src/components/admin/profile-panel.tsx` ไปแล้ว (commit `c426bf0`/`2234cf8`) ครอบคลุมส่วน "โปรไฟล์ของ org_admin" ไปบางส่วน — แผนด้านล่างปรับให้ต่อยอดจากของที่มีอยู่แล้ว **ไม่ใช่สร้างใหม่ทับ** และคำขอ backend S2/S3 ในหัวข้อ "UI/Styling Backlog" ด้านบนคือส่วนหนึ่งของงานนี้ (ทำ S2/S3 = ปิดงานโปรไฟล์ฝั่ง org_admin ไปด้วยในตัว)

แบ่งเป็น 2 ชั้นตามที่ตกลงกัน:

**1) โปรไฟล์/preference ส่วนตัว — org_admin และ technician เข้าถึงเหมือนกัน**
- แก้ไขข้อมูลตัวเอง (ชื่อ, เบอร์โทรผ่าน `UserPhone`) — **ตรงกับคำขอ S2 + S3 ที่ Esther03u ฝากไว้แล้ว** ทำเป็น action เดียว `updateProfileAction(name: string, phone?: string)` ใน `src/app/admin/actions.ts` ตามที่ S3 เสนอ (ยึด `session.user.id` เท่านั้น ห้ามรับ userId จาก client)
- **รูปโปรไฟล์** — ต้องเพิ่ม field `avatarUrl` ใน `User` schema (ยังไม่มี) แล้วรวม upload เข้ากับ `updateProfileAction` เดียวกัน โดยใช้ `saveUpload()` เดิมจาก `tech/actions.ts` ร่วมกัน (มี resize/EXIF/sharp ครบแล้ว — ควรย้ายไป `src/lib/` เพื่อให้ import ข้ามโมดูลได้สะอาด)
- **เปลี่ยนรหัสผ่านตัวเอง — ตัดสินใจแล้ว: ใช้ reset-link flow เดิม** (`requestPasswordReset` → อีเมล → `/reset-password?token=`) ไม่ทำแบบกรอกรหัสเก่ายืนยันในหน้าเดียว — ProfilePanel ที่ Esther03u ทำไว้ใช้วิธีนี้อยู่แล้ว จึงไม่ต้องแก้ UI ส่วนนี้เลย และช่างก็ใช้ flow เดียวกันได้ทันทีเมื่อทำหน้าโปรไฟล์ฝั่ง technician
  - ✅ **Blocker นี้แก้แล้ว (10 ส.ค. 2026)** — ระบบส่งอีเมลจริงได้แล้ว เหลือแค่ใส่ค่า SMTP ใน `.env` ดูหัวข้อ "การตั้งค่าอีเมล (SMTP)" ด้านล่าง
  - ⚠️ **ข้อจำกัดที่รับทราบแล้ว:** comment ใน `src/lib/reset-token.ts` ระบุว่า token แบบ HMAC stateless นี้ออกแบบมาสำหรับ "ออกลิงก์ครั้งเดียวจำนวนมากตอน migration" ไม่ใช่ self-service ที่ใช้ซ้ำบ่อย — **token ใช้ซ้ำได้จนกว่าจะหมดอายุ 1 ชม. และ revoke ก่อนกำหนดไม่ได้** ถ้าภายหลังพบว่าเป็นปัญหาจริง ค่อยเปลี่ยนไปเก็บ token ในตาราง DB (มี single-use flag + revoke ได้) แยกเป็นงานต่างหาก
- **ธีมมืด/สว่าง** — เป็น preference ส่วนบุคคลตรงนี้ ไม่ใช่ค่ากลางที่มีผลกับทุกคน (ยืนยันแล้ว)
- **หน้าโปรไฟล์ฝั่ง technician ยังไม่มี** — ProfilePanel ปัจจุบันผูกอยู่กับ `admin-dashboard-view.tsx` เท่านั้น ต้องทำให้ช่างเข้าถึงได้ด้วย (แนะนำ refactor `profile-panel.tsx` ให้เป็น shared component ใน `src/components/shared/` แล้วเรียกจากทั้ง 2 ฝั่ง แทนการ copy)

**2) ตั้งค่าระบบ — เฉพาะ org_admin**
- รอบซ่อมบำรุง Default — ต้องมีที่เก็บค่า เสนอสร้างตารางใหม่เล็กๆ `SystemSettings` (แถวเดียว/singleton) เก็บ `defaultFrequencyValue`/`defaultFrequencyUnit`
- **แก้ข้อมูล/รีเซ็ตรหัสผ่านให้ user คนอื่น** — กรณีช่างลืมรหัสผ่านจริงๆ ให้ org_admin แก้ข้อมูล+ตั้งรหัสใหม่ให้ได้โดยไม่ต้องรู้รหัสเดิม (`adminResetUserPasswordAction`, เฉพาะ org_admin) ต่อยอดจากหน้าจัดการ user ที่มีอยู่แล้ว
  - **ยังจำเป็นถึงแม้จะเลือกใช้ reset-link แล้ว** เพราะ reset-link ต้องเข้าถึงอีเมลได้ ถ้าช่างเข้าอีเมลไม่ได้/อีเมลผิด จะไม่มีทางกู้บัญชีเลย ทางนี้เป็น fallback ที่ไม่พึ่งอีเมล
  - ทางเลือกที่ทำได้เลยตอนนี้โดยไม่ต้องรอ SMTP: ตั้ง `password = NULL` ให้ user (schema ออกแบบไว้แล้วว่า NULL = "ต้องตั้งรหัสใหม่ก่อนเข้าระบบ" — ดู comment ใน `User.password`) แล้ว `authorize()` จะโยน `PasswordResetRequired` ให้เอง ไม่ต้องให้ admin เห็น/ตั้งรหัสของคนอื่นด้วยซ้ำ ปลอดภัยกว่าการให้ admin พิมพ์รหัสใหม่แล้วบอกปากเปล่า
- *แนะนำเพิ่ม (ถ้าสนใจ):* ข้อมูลองค์กร (ชื่อ/ที่อยู่/เบอร์โทร) — เดิมเก็บใน `University` ที่ถูกลบใน F1 ถ้ายังอยากให้มีชื่อหน่วยงานแสดงในระบบ (หัวกระดาษ, หน้า QR) เก็บในตาราง `SystemSettings` เดียวกันได้เลย
- *แนะนำเพิ่ม (ถ้าสนใจ):* หน้าดู audit log — `system_audit_logs` มีข้อมูลอยู่แล้วแต่ไม่มี UI เลยหลังตัด super-admin ออก org_admin อาจอยากเห็นว่าใครทำอะไรไปบ้าง

**หมายเหตุ:** "จัดการยี่ห้อ/รุ่นแอร์" **ไม่ได้รวมอยู่ในตั้งค่าระบบข้างต้น** — แยกเป็นเมนูของตัวเองต่างหาก ดู F7 ด้านล่าง

---

### F7. เมนู "จัดการยี่ห้อ/รุ่นแอร์" (Master Data) — แยกเป็นเมนูของตัวเอง

ย้ายมาจาก `/super-admin/master-data` ที่ถูกลบทิ้งใน F1 — ตัดสินใจแล้วให้แยกเป็นเมนู/หน้าของตัวเองต่างหาก ไม่รวมกับ "ตั้งค่าระบบ" ใน F5 เพื่อให้เห็นชัดและจัดการง่าย เฉพาะ org_admin เข้าถึงได้

| | งาน |
|---|---|
| **Backend** | ฟังก์ชัน CRUD เดิมมีอยู่ครบแล้วใน `src/app/super-admin/master-data/actions.ts` (`getAcMasterData`, `createAcBrandAction`, `createAcModelAction`) — ย้ายไฟล์ไปเป็น `src/app/admin/master-data/actions.ts` แล้วเปลี่ยน guard จาก `verifySuperAdmin()` เป็น `verifyOrgAdmin()` เท่านั้น ไม่ต้องเขียนใหม่ |
| **Frontend** | ย้าย `master-data-client.tsx` + หน้า `page.tsx` จาก `src/app/super-admin/master-data/` มาเป็น `src/app/admin/master-data/` เพิ่มลิงก์เมนูใหม่ในแถบนำทางของ org_admin (`nav-header.tsx`/`dashboard-layout.tsx`) แยกจากเมนู "ตั้งค่า" |

---

*Handoff document last updated: August 10, 2026.*

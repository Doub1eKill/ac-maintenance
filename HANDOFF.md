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

## 🧹 ถึง Esther03u — ไฟล์ UI ที่ไม่มีใครเรียกใช้ ลบได้ไหม? (11 สิงหาคม 2026)

ตรวจทั้งโปรเจกต์แล้วพบไฟล์เหล่านี้ **ไม่มีไฟล์ไหนในระบบ import เลยสักที่** DoubleKill ไม่ลบเองเพราะทั้งหมดอยู่ในเลนของคุณ — ช่วยยืนยันทีละข้อว่าจะลบหรือเก็บไว้ แล้วเขียนตอบไว้ในไฟล์นี้ได้เลย

| ไฟล์ | คืออะไร | หมายเหตุ |
|---|---|---|
| `src/components/layout/nav-header.tsx` | Header แถบบนแบบเก่า | **น่าจะลบได้แน่นอนที่สุด** — ถูกแทนที่ด้วย `dashboard-layout.tsx` ที่มี `<header>` + `SidebarHeader` ในตัวแล้ว ทุกหน้าใช้ตัวใหม่หมด |
| `src/components/examples/c-pagination-3.tsx` | ตัวอย่าง pagination จาก ReUI registry | **ระวัง** — น่าจะเก็บไว้เป็นต้นแบบทำ **P14** (ปุ่มเปลี่ยนหน้ากระดานใบงาน) ที่ยังค้างอยู่ ถ้าจะใช้อย่าลบ |
| `src/components/ui/label.tsx` | shadcn primitive | เพิ่มกลับได้ด้วย `npx shadcn add label` |
| `src/components/ui/toggle.tsx` | shadcn primitive | เพิ่มกลับได้ด้วย `npx shadcn add toggle` |
| `src/components/ui/option-wheel.tsx` + `option-wheel.css` | ตัวเลือกแบบวงล้อ | ไม่ใช่ของมาตรฐาน ถ้าลบแล้วอยากได้คืนต้องเขียนใหม่ (ดึงจาก git ได้) |
| `src/components/ui/thai-alert-dialogs.tsx` | กล่องยืนยันภาษาไทย (`ConfirmDeleteDialog` ฯลฯ) | เขียนเองในโปรเจกต์ ไม่ใช่ของ registry — ถ้าลบแล้วอยากได้คืนต้องดึงจาก git |

**ไม่ได้อยู่ในรายการนี้เพราะยังใช้อยู่จริง (เช็คแล้ว):** `examples/c-file-upload-4.tsx` (หน้าช่างใช้ และมันดึง `hooks/use-file-upload.ts` + `components/reui/alert.tsx` ต่อ — ทั้งสายต้องเก็บไว้)

**`ui/sonner.tsx` (Toaster) ก็ไม่มีใครใช้เหมือนกัน แต่เจ้าของโปรเจกต์ตัดสินใจเก็บไว้แล้ว** พร้อม package `sonner` และ `next-themes` เพราะ `next-themes` คือไลบรารีสลับธีมมืด/สว่างที่ **F5 ต้องใช้**

---

## 🆕 งานรอบแก้ไขข้อมูล (11 สิงหาคม 2026) — Backend เสร็จ รอ UI

สั่งโดยเจ้าของโปรเจกต์ 4 เรื่อง Backend ทำครบแล้ว เหลือ UI ทั้งหมดเป็นของ Esther03u

### 1. แก้ไขข้อมูลแอร์รายเครื่อง — `updateAirConditionerAction(formData)`

แก้ได้: **ยี่ห้อ/รุ่น, BTU, วันที่ติดตั้ง, สถานะเครื่อง** (ปกติ/เสีย/รอล้าง)

field ที่ต้องส่ง — **เหมือนฟอร์มลงทะเบียนแอร์ทุกอย่าง** บวก 2 ตัว:

| field | ค่า |
|---|---|
| `airConditionerId` | id ของเครื่อง (**จำเป็น**) |
| `brandType` | `"master"` หรือ `"other"` |
| `acModelId` | ใช้เมื่อ `brandType="master"` |
| `customBrand` / `customModel` | ใช้เมื่อ `brandType="other"` |
| `btu` | ตัวเลข หรือเว้นว่าง |
| `status` | `"normal"` \| `"broken"` \| `"needs_cleaning"` (**ใหม่**) |
| `installedAt` | `YYYY-MM-DD` หรือเว้นว่าง (**ใหม่** — เว้นว่าง = ล้างค่าเป็น "ไม่ระบุ" ต่างจากตอนลงทะเบียนที่เว้นว่าง = วันนี้) |

**ข้อจำกัดที่ตั้งใจ:** ย้ายห้อง/อาคารไม่ได้ เพราะ `acCode` ถูกสร้างจากตึก+ห้องตอนลงทะเบียนและถูกพิมพ์ลงป้าย QR ไปแล้ว ถ้าย้ายได้รหัสจะไม่ตรงกับที่อยู่จริง (comment ใน schema ก็อ้างอิงว่า `roomId` ไม่เปลี่ยน)

**กรณีแจ้งซ่อมผิดเครื่อง ให้ใช้ "ยกเลิกใบงาน" แทนการแก้สถานะตรงๆ** (ข้อ 5 ด้านล่าง) เพราะยกเลิกแล้วสถานะเครื่องจะกลับเป็นปกติให้เอง ส่วนช่องแก้สถานะในฟอร์มนี้เอาไว้ใช้กรณีที่ข้อมูลเพี้ยนโดยไม่มีใบงานเกี่ยวข้อง

### 2. แก้ไขประวัติการซ่อมบำรุง — `updateMaintenanceLogAction(logId, action, notes?, repairDetail?)`

**สิทธิ์:** ช่างแก้ได้เฉพาะ log ที่ตัวเองบันทึก / org_admin แก้ได้ทุกอัน — ระบบอ่านเจ้าของจากแถวใน DB เอง ไม่เชื่อค่าที่ client ส่งมา

แก้ได้: **ประเภทงาน, หมายเหตุ, รายละเอียดการซ่อม**
แก้ไม่ได้: `performedAt`, รูปภาพ, เครื่องที่ผูกอยู่ — ส่วนเหล่านี้คือหลักฐานว่าไปทำงานจริงเมื่อไหร่ ถ้าผิดควรแจ้ง admin ไม่ใช่แก้เงียบๆ

ทุกการแก้ไขถูกบันทึกลง `system_audit_logs` พร้อมค่าเดิม (เพราะเป็นการแก้ประวัติย้อนหลัง)

**สำหรับทำ UI:** `getMaintenanceHistory()` คืน **`technicianId`** มาด้วยแล้ว ใช้เทียบกับ `session.user.id` เพื่อตัดสินว่าจะโชว์ปุ่ม "แก้ไข" ในรายการไหน

### 3. ช่องรายละเอียดการซ่อม (คอลัมน์ใหม่ `repair_detail`)

เพิ่มคอลัมน์ `repair_detail` ใน `maintenance_logs` แล้ว (migration `20260811140000_add_repair_detail`) **ต้อง `npx prisma migrate deploy` + `generate` หลัง pull**

**กติกา:** ถ้าช่างเลือกประเภทงาน "ซ่อม" **ต้องกรอกรายละเอียดการซ่อม** ไม่งั้น backend ตีกลับด้วยข้อความ `"กรุณาระบุรายละเอียดการซ่อม"`

**📌 คำขอ UI ในฟอร์มบันทึกงาน (`tech-mobile-view.tsx`):** เพิ่ม `<textarea name="repairDetail">` ที่**แสดงเฉพาะเมื่อผู้ใช้ติ๊ก "ซ่อม"** (state `selectedActions` มีอยู่แล้ว) ป้าย: "ซ่อมอะไรไปบ้าง" — แยกจากช่อง `notes` เดิมที่เป็นหมายเหตุรวมของการมาครั้งนั้น

ถ้าช่างเลือกทั้ง "ล้าง" และ "ซ่อม" ระบบสร้าง log 2 แถว โดย `repairDetail` จะติดไปเฉพาะแถวที่เป็น "ซ่อม" เท่านั้น

### 5. ยกเลิกใบงาน + คืนสถานะเครื่องอัตโนมัติ — `cancelWorkOrderAction(workOrderId, reason?)`

**สำหรับกรณีแจ้งซ่อมผิดเครื่องโดยเฉพาะ** เฉพาะ org_admin

**ยกเลิกแล้วสถานะเครื่องกลับเป็น "ปกติ" ให้อัตโนมัติ** — แต่**เฉพาะเมื่อไม่มีใบงานอื่นค้างอยู่แล้วเท่านั้น** ถ้ายังมีใบงานอื่น (คนอื่นแจ้งไว้ หรือถึงรอบล้างตามกำหนด) จะคงสถานะเดิมไว้ เพราะยังมีเรื่องค้างจริง

คืนค่า `{ success: true, statusReset: boolean }` — ใช้ `statusReset` บอกผู้ใช้ได้ว่าสถานะถูกคืนให้หรือไม่

**ยกเลิกไม่ได้ถ้าใบงานปิดไปแล้ว** (`completed`) เพราะมีประวัติการปฏิบัติงานผูกอยู่ การยกเลิกจะทำให้ประวัติเครื่องผิดความจริง — คืน error ข้อความไทยพร้อมแสดง

**📌 คำขอ UI:** เพิ่มปุ่ม "ยกเลิกใบงาน" ในโมดัลรายละเอียดใบงาน (`admin-dashboard-view.tsx`) แสดงเฉพาะใบที่สถานะเป็น `pending`/`claimed` พร้อมช่องกรอกเหตุผล (ไม่บังคับ — เก็บลง `resolutionNotes`)

### 6. บันทึกงานได้แม้ไม่มีใบงานล่วงหน้า — แก้ `logMaintenanceAction`

เดิม `workOrderId` เป็น **required** แปลว่าช่างที่เดินไปเจอเครื่องเสียแล้วซ่อมเลย **บันทึกงานไม่ได้** ถ้าไม่มีใบงานรออยู่

ตอนนี้ `workOrderId` เป็น **optional** — ถ้าไม่ส่งมา ระบบ**สร้างใบงานให้อัตโนมัติ** ในสถานะปิดงานทันที (ผู้แจ้ง/ผู้รับ = ช่างคนนั้น, `issueDescription` ระบุว่าระบบสร้างให้) สร้าง**ภายใน transaction เดียวกับการบันทึกประวัติ** เพื่อไม่ให้เกิดใบงานปิดแล้วแต่ไม่มีประวัติผูกอยู่

audit log แยกได้ว่าใบไหนระบบสร้างให้ ผ่าน field `autoCreatedWorkOrder`

**📌 คำขอ UI:** ฟอร์มบันทึกงานส่ง `workOrderId` เป็นค่าว่างได้แล้วเมื่อไม่มีใบงาน (`tech-mobile-view.tsx` ตอนนี้ส่งจาก `selectedJobForLog.id` เสมอ)

### 7. สแกน QR แล้วกดบันทึกงาน → พาไปหน้าช่างพร้อมรหัสแอร์

ปุ่ม "บันทึกงานซ่อมบำรุง" บนหน้า QR ตอนนี้ลิงก์ไป **`/tech?ac=<acCode>`** แล้ว (เดิมไป `/tech` เฉยๆ ช่างต้องพิมพ์รหัสซ้ำ)

**📌 คำขอ UI ใน `tech-mobile-view.tsx`:** อ่าน query param `ac` ตอนโหลดหน้า แล้วเรียก **`scanQrCodeAction(ac)` ที่มีอยู่แล้ว** — ไม่ต้องเพิ่ม backend ใหม่เลย มันคืน `acDetails` + `pendingJobId` ครบ (เหตุผลที่ส่ง `acCode` ไม่ใช่ id ก็เพราะ action ตัวนี้รับ `acCode` พอดี)

จากนั้นเปิดฟอร์มบันทึกงานให้เลย: ถ้ามี `pendingJobId` ใช้เป็น `workOrderId` / ถ้าไม่มีก็ปล่อยว่าง (ข้อ 6 รองรับแล้ว) ช่างกรอกเองแค่ประเภทงาน

*หมายเหตุ: หน้า `/tech` รับ param นี้ได้โดยไม่พังแล้ว แค่ยังไม่ได้อ่านไปใช้*

### 4. ล็อกอินแล้วกลับหน้าเดิม — เสร็จแล้วทั้งหมด ✅

`login-form.tsx` อ่าน `?callbackUrl=` แล้วพากลับหน้านั้นหลังล็อกอิน และหน้า QR ส่ง callbackUrl ไปให้เองแล้ว

**⚠️ DoubleKill แตะ `login-form.tsx` และ `login/page.tsx`** — จำเป็นเพราะเป็น logic การนำทาง ที่ต้องรู้: `useSearchParams()` ทำให้หน้าถูกถอดออกจาก static prerender และ **build พังทันที** ต้องหุ้ม `<LoginForm />` ด้วย `<Suspense>` ซึ่งทำไว้แล้วใน `login/page.tsx` **อย่าเอา Suspense ออก**

รับเฉพาะ path ที่ขึ้นต้นด้วย `/` และไม่ใช่ `//` — กันคนส่งลิงก์ `?callbackUrl=https://evil.example` แล้วพาผู้ใช้ออกนอกเว็บทันทีหลังล็อกอิน (ทดสอบแล้วเด้งกลับ `/` ตามที่ควร)

---

## ✅ S4–S7 Backend เสร็จแล้ว (17 สิงหาคม 2026) — รอ UI ต่อ

**⚠️ ต้องรัน `npx prisma migrate deploy` + `npx prisma generate` หลัง pull** (migration `20260816120000_add_system_settings`)

### ตารางใหม่ `SystemSettings` — แถวเดียว id = 1

migration **สร้างแถวให้แล้ว** จึงไม่มีสถานะ "ยังไม่ตั้งค่า" ให้ต้องเช็ค — อ่านเมื่อไหร่ก็เจอแถวเสมอ

| ฟังก์ชันอ่าน (`src/lib/organisation.ts`) | คืนอะไร |
|---|---|
| `getOrganisationName()` | ชื่อหน่วยงาน (ยังไม่ตั้ง → `"มหาวิทยาลัยราชภัฏภูเก็ต"`) |
| `getOrganisationInfo()` | `{ name, address, phone }` |
| `getDefaultMaintenanceFrequency()` | `{ value, unit }` (เริ่มต้น 6 เดือน) |

**`ORGANISATION_NAME` ถูกลบแล้ว** — ถ้าโค้ดไหนยัง import อยู่จะ compile ไม่ผ่าน เปลี่ยนไปใช้ `await getOrganisationName()` แทน (แก้ให้ครบทั้ง 5 จุดแล้ว)

### Server Actions ใหม่

| Action | ทำอะไร |
|---|---|
| **S4** `updateDefaultFrequencyAction(value, unit)` | ตั้งรอบเริ่มต้น (`unit` = `days`/`months`/`years`, `value > 0`) |
| **S5** `updateOrganisationInfoAction(name, address?, phone?)` | ตั้งข้อมูลหน่วยงาน — revalidate ทั้ง `/admin` และ `/tech` เพราะชื่อขึ้นหัวทั้งสองฝั่ง |
| **S6** `adminResetUserPasswordAction(userId)` | ตั้ง `password = NULL` ไม่สร้างรหัสใหม่ให้ admin เห็น |
| **S7** `getAuditLogs({ page?, action? })` | คืน `{ logs, page, availableActions }` — แบ่งหน้า 50 รายการ |

ทุกตัวคืน `{ success }` หรือ `{ error }` ข้อความไทย และเขียน `logAudit` ให้แล้ว

**S6 มี guard เพิ่ม:** admin **รีเซ็ตรหัสผ่านตัวเองจากหน้านี้ไม่ได้** (กันล็อกตัวเองออก) และถ้า user นั้น `password` เป็น NULL อยู่แล้วจะบอกว่าไม่ต้องทำซ้ำ

**S7 คืน `availableActions` มาให้ด้วย** — เอาไปทำ dropdown filter ได้เลย ดึงจากค่าที่มีจริงในตาราง ไม่ใช่ลิสต์ hardcode ที่จะล้าสมัยเมื่อมี action ใหม่

### แอร์ใหม่ได้รอบบำรุงรักษาอัตโนมัติแล้ว (ทางเลือก ก.)

**เดิมเป็นช่องโหว่:** ไม่มีโค้ดจุดไหนสร้าง `MaintenanceSchedule` ตอนลงทะเบียนแอร์ (ที่มีครบ 73 เครื่องเพราะ backfill รอบเดียวเมื่อ 27 ก.ค.) แปลว่า**แอร์ที่เพิ่มหลังจากนั้นจะไม่มีรอบเลย และหลุดจากระบบ auto-check ถาวร**

ตอนนี้ `createAirConditionerAction` สร้าง schedule ให้ใน transaction เดียวกับการสร้างแอร์ โดยใช้รอบจาก `SystemSettings`

**กฎวันครบกำหนดครั้งแรก** (ตามที่เจ้าของโปรเจกต์ตัดสินใจ):

| วันติดตั้ง | ครบกำหนดครั้งแรก |
|---|---|
| **เกิน 6 เดือน** | **= วันนี้** ขึ้นค้างทันที (เครื่องเก่าที่เพิ่งมาลงทะเบียน ควรได้รับการดูแลเลย) |
| ไม่เกิน 6 เดือน | วันติดตั้ง + รอบ |
| ไม่ระบุ | วันนี้ + รอบ |

**🐛 แก้บั๊กเพิ่มระหว่างทาง:** `saveMaintenanceScheduleAction` คำนวณ `nextDueDate` ด้วย `new Date()` + setter แบบ local time ซึ่งผิด 3 อย่างกับคอลัมน์ `@db.Date` (บั๊กชุดเดียวกับ P16 ที่ตกค้างเป็นจุดที่ 3): วันคลาดช่วงเที่ยงคืน–7 โมง, อ่าน field ผิดโซนเวลา, และ 31 ม.ค. + 1 เดือน ได้ 3 มี.ค. แทน 28 ก.พ. — เปลี่ยนไปใช้ `businessDateToday()` + `addMaintenanceInterval()` แล้ว

### เก็บกวาดตามที่ฝากไว้

`revalidatePath("/admin/master-data")` → `/admin` แล้วทั้ง 2 จุด

### 📌 เหลือฝั่ง UI

1. `settings-panel.tsx` — ต่อปุ่มบันทึกการ์ด S4/S5 เข้ากับ action จริง แทน `NotConnectedAlert`
2. `team-panel.tsx` — ต่อ `onConfirm` เข้ากับ `adminResetUserPasswordAction`
3. `settings-panel.tsx` — การ์ด "ประวัติการใช้งานระบบ" เปลี่ยนจาก empty-state เป็นตารางจริงจาก `getAuditLogs()`

---

## 🔒 ตรวจ lock-ordering + แก้ deadlock (18 สิงหาคม 2026) — Backend เสร็จ ไม่ต้องรอ UI

ปิดข้อค้างเรื่อง "ความเสี่ยง lock-ordering ที่ยังไม่ได้ตรวจ" แล้ว **ทดสอบด้วยการรัน transaction ชนกันจริงบนฐานข้อมูล** ไม่ใช่แค่อ่านโค้ด

### สรุปผลตรวจ

**ต้นตอ:** ทุก transaction ที่ `INSERT` แถวลูก InnoDB จะจับ **shared lock (S)** บนแถวแม่เพื่อเช็ค foreign key ก่อน แล้วโค้ดค่อยไปขอ **exclusive lock (X)** บนแถวเดียวกันทีหลัง — จังหวะ upgrade S→X นี่แหละที่ทำให้สอง transaction ล็อกตายกัน

| คู่ที่ทดสอบ | ผลก่อนแก้ | ผลหลังแก้ |
|---|---|---|
| auto-check (`syncOverdueMaintenanceWorkOrders`) **vs** บันทึกงาน (`logMaintenanceAction`) เครื่องเดียวกัน | 🔴 **ERROR 1213 Deadlock** | ✅ รอคิวแล้วผ่าน (~0.85 วิ) |
| บันทึกงาน **vs** ยกเลิกใบงาน (`cancelWorkOrderAction`) ใบเดียวกัน | 🔴 **ERROR 1213 Deadlock** | ✅ รอคิวแล้วผ่าน (~0.82 วิ) |
| ลงทะเบียนแอร์ (`createAirConditionerAction`) **vs** auto-check | ✅ ไม่ชนอยู่แล้ว | ✅ ไม่ชน |

**คู่ที่เคยสงสัยไว้ (ลงทะเบียนแอร์ ชนกับ auto-check) ไม่ใช่ปัญหาเลย** — แถวแอร์ที่เพิ่ง `INSERT` แต่ยังไม่ commit มองไม่เห็นและล็อกไม่ได้จาก transaction อื่น auto-check จึงหาไม่เจอและ `updateMany` ก็แมตช์ไม่โดน ไม่มีทรัพยากรร่วมให้แย่งกัน

### วิธีแก้: บังคับลำดับล็อกให้เหมือนกันทั้งระบบ

**`work_orders` (X) → `air_conditioners` (X) → ค่อย INSERT แถวลูก** — จับ X บนแถวแม่ให้เสร็จก่อน FK check จะได้เจอ lock ที่ transaction ตัวเองถืออยู่แล้ว ไม่ต้อง upgrade

| ไฟล์ | เปลี่ยนอะไร |
|---|---|
| `src/app/tech/actions.ts` → `logMaintenanceAction` | ย้าย `UPDATE work_orders` และ `UPDATE air_conditioners` ขึ้นมา**ก่อน** `INSERT maintenance_logs` (เดิม insert ก่อน) |
| `src/lib/maintenance.ts` → `syncOverdueMaintenanceWorkOrders` | สลับ 2 คำสั่งใน `$transaction([...])` ให้ `updateMany` แอร์มาก่อน `createMany` ใบงาน |
| `src/app/admin/actions.ts` → `cancelWorkOrderAction` | **ลำดับถูกอยู่แล้ว ไม่ได้แก้** เพิ่มแค่ comment กันคนมาสลับทีหลัง |
| `src/lib/db-retry.ts` (**ไฟล์ใหม่**) | `withDeadlockRetry(label, fn)` — retry 3 ครั้งเมื่อเจอ error 1213 เป็นตาข่ายรองรับ ครอบ 4 transaction: บันทึกงาน, รับงานหลายใบ, ยกเลิกใบงาน, auto-check |

**⚠️ อย่าสลับลำดับใน 2 ไฟล์แรกกลับ** ถึงผลลัพธ์ข้อมูลจะเหมือนเดิมทุกประการ แต่ deadlock จะกลับมาทันที — มี comment อธิบายเหตุผลคาไว้ในโค้ดแล้วทั้ง 2 จุด

**ทำไมต้องมี retry ทั้งที่จัดลำดับแล้ว:** ลำดับล็อกครอบได้เฉพาะการชนที่เรามองเห็น แต่ InnoDB ยังจับ gap/next-key lock ตาม execution plan ที่เลือก ณ ตอนนั้นด้วย พอข้อมูลโตขึ้น คู่ที่ไม่ได้แตะแถวเดียวกันก็ยังชนกันได้ — และเวลา deadlock เกิด InnoDB roll back ทั้ง transaction ไม่มีเขียนค้างครึ่งๆ การรันซ้ำจึงเป็นคำตอบที่ถูกต้อง ไม่ใช่การกลบปัญหา

**ข้อควรระวังถ้าจะเอา `withDeadlockRetry` ไปใช้ที่อื่น:** ครอบได้เฉพาะงานที่รันซ้ำได้ ทุกอย่างต้องอยู่ใน transaction — ของที่มีผลข้างนอก (อัปโหลดไฟล์, `logAudit`, `revalidatePath`) ต้องอยู่นอกวงเล็บ

### ทดสอบด้วยการรันจริง (ไม่ใช่แค่ build ผ่าน)

`npx tsc --noEmit` → 0 error แล้วรันจริงผ่าน UI ด้วยบัญชี `houston16@example.net`: กด "รับงาน" → "บันทึกและปิดงาน" (ล้างแอร์) บนใบงาน #4 / แอร์ #9 ผลใน DB ถูกครบทั้ง 4 ขั้น — ใบงานเป็น `completed`, `maintenance_logs` แถวใหม่ผูก `work_order_id=4` ถูกต้อง, สถานะแอร์เป็น `normal`, และ `maintenance_schedules` ขยับเป็น `last_performed_at=2026-08-18` / `next_due_date=2026-11-18` (รอบ 3 เดือน) ไม่มี error ทั้ง console และฝั่งเซิร์ฟเวอร์

*หมายเหตุข้อมูลทดสอบ:* ใบงาน #4 ถูกปิดจริงจากการทดสอบนี้ (มี `maintenance_logs` id 615 เพิ่มมา 1 แถว) ไม่ได้ย้อนกลับเพราะเป็นข้อมูล seed และการย้อนจะทำให้ 4 ตารางไม่สอดคล้องกันเอง

### 🚨 เรื่องที่สำคัญกว่า deadlock: อาการ "MySQL ค้างจนต้องรีสตาร์ท" ไม่ได้เกิดจาก deadlock

ระหว่างทดสอบทำซ้ำอาการที่เคยเจอตอนทดสอบ S4 ได้ตรงเป๊ะ และ **ยืนยันว่าคนละเรื่องกับ deadlock โดยสิ้นเชิง**

**deadlock ไม่เคยทำให้ค้าง** — InnoDB ตรวจเจอวงจรแล้วฆ่าตัวใดตัวหนึ่งทันทีภายใน ~1 วินาที คืน error 1213 ออกมา

**ตัวที่ทำให้ค้างจริงคือ client ที่ถูกฆ่ากลางคัน transaction** (เช่นปิด dev server ตอนกำลังเขียน DB): thread ฝั่ง server จะค้างเปิด transaction ไว้พร้อมถือ row lock, สั่ง `KILL <id>` ขึ้นสถานะ `Killed` แต่ไม่ตายจริง, session อื่นค้างตามแม้แต่ query อ่านเฉยๆ, และ `mysqladmin shutdown` ก็ค้างรอ thread พวกนั้นอีกที

**ทางแก้ทางเดียว:**
```powershell
Stop-Process -Name mysqld -Force
Start-Process -FilePath "C:\xampp\mysql\bin\mysqld.exe" -ArgumentList '--defaults-file=C:\xampp\mysql\bin\my.ini' -WindowStyle Hidden
```
InnoDB crash recovery จะ roll back transaction ที่ค้างให้เองตอนสตาร์ท ข้อมูลไม่หาย (ตรวจ row count ทุกตารางหลังกู้แล้วครบเท่าเดิม)

**หลักฐานว่าเคยเกิดมาก่อน:** ใน `C:\xampp\mysql\data\mysql_error.log` มีบรรทัด `Rolled back recovered transaction 15589` ของวันที่ 17 ส.ค. 19:50 ซึ่งคือรอบที่เจอตอนทดสอบ S4 พอดี

**สรุปสำหรับคนทำงานต่อ:** ถ้าเจอ MySQL ค้าง อย่าไปไล่หา deadlock ในโค้ด — ให้ดูว่ามี dev server หรือ script ไหนถูกปิดกลางคันหรือเปล่า แล้ว force restart ตามคำสั่งข้างบน

---

## 🎨 ถึง Esther03u — พบ emoji ใน UI ผิดกฎ `AGENTS.md` (18 สิงหาคม 2026)

เจอระหว่างทดสอบหน้าช่าง กฎห้ามใช้ emoji ใน UI เด็ดขาด ให้ใช้ `lucide-react` แทน — อยู่ในเลนของคุณ DoubleKill เลยไม่แตะให้

| ไฟล์ | บรรทัด | ข้อความ |
|---|---|---|
| `src/components/tech/log-action-modal.tsx` | 131 | `✅ ใช้งานได้ปกติ` |
| `src/components/tech/log-action-modal.tsx` | 132 | `⚠️ รออะไหล่/ใช้งานไม่ได้` |
| `src/components/tech/log-action-modal.tsx` | 133 | `❄️ แอร์ไม่เย็น/รอตรวจสอบ` |
| `src/components/tech/qr-scan-modal.tsx` | 108 | `✅ ปกติ` / `⚠️ มีปัญหา` |

3 อันแรกอยู่ใน `<NativeSelectOption>` ซึ่งใส่ไอคอนข้างในไม่ได้ (option รับได้แต่ text) อาจต้องเปลี่ยนไปใช้ Select ของ shadcn/ReUI ที่ render เป็น div ได้ หรือตัด emoji ออกเฉยๆ แล้วสื่อสถานะด้วยสีข้อความแทน — ตัดสินใจได้ตามสะดวก

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
- [x] 9. `[Backend ✅ — assignToUserId เป็น optional อยู่แล้วใน createWorkOrderAction ไม่ต้องแก้ backend]` หน้าสร้างใบงานซ่อมบำรุง: เพิ่มลำดับการเลือกแบบ cascade — เลือกตึกก่อน แล้วเลือกห้อง จากนั้นตัวเลือกเครื่องปรับอากาศจะกรองให้เห็นเฉพาะเครื่องของห้องที่เลือกเท่านั้น และเพิ่มตัวเลือกช่างเริ่มต้นเป็น "ไม่ระบุช่าง" (สอดคล้องกับ `work_orders.claimed_by` ที่เป็น nullable อยู่แล้ว) — [เสร็จแล้ว (15 ส.ค. 2026): cascade select อาคาร→ห้อง→แอร์ อยู่ใน `create-work-order-modal.tsx` ใช้ข้อมูล `buildings` เดิมที่มีอยู่แล้ว ไม่ต้องแก้ backend เพิ่ม พร้อมแก้บั๊กเดิมที่ช่องช่างติด `required` ทั้งที่ป้ายบอกว่า "ไม่บังคับ" — เอา `required` ออกและเพิ่มตัวเลือก "ไม่ระบุช่าง" เป็นค่าเริ่มต้นแล้ว]

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

- [x] **P10.** แยก client component ก้อนยักษ์ — `admin-dashboard-view.tsx` **1,299 บรรทัด** / `tech-mobile-view.tsx` 992 บรรทัด ทั้งคู่เป็น `"use client"` และรับข้อมูล**ทั้งหมด**เป็น props → ข้อมูลถูก serialize ลง RSC payload ส่งข้ามเน็ตแล้ว hydrate ทั้งก้อน ส่วนที่ไม่ต้อง interactive ควรแยกเป็น Server Component — [เสร็จแล้ว (15 ส.ค. 2026): แยกทั้งสองไฟล์เป็นชิ้นย่อยตามแท็บ — `admin-dashboard-view.tsx` (1,391 → ~380 บรรทัด) แยกเป็น `overview-panel`/`work-order-board`/`user-approvals-panel`/`team-panel`/`create-work-order-modal`/`assign-work-order-modal`/`work-order-detail-dialog` + `types.ts`; `tech-mobile-view.tsx` (1,006 → ~330 บรรทัด) แยกเป็น `assets-panel`/`job-pool-panel`/`my-jobs-panel`/`completed-jobs-panel`/`qr-scan-modal`/`log-action-modal` + `types.ts` ยังคง render แบบ conditional ต่อแท็บเหมือนเดิม (ยังไม่ได้แปลงเป็น Server Component จริงเพราะต้องปรับ data flow จาก `page.tsx` เพิ่ม — ถ้าอยากได้ผลเต็มที่กว่านี้ค่อยคุยกันเป็นงานถัดไป) ระหว่างทางลบ dead code ที่เจอ (`filteredBuildings`/`expandedBuilding` ที่คำนวณไว้แต่ไม่เคยใช้) และ `npm run lint` ปัญหารวมลดจาก 78 → 46 ไม่มี error ใหม่]
- [ ] **P11.** ใส่ `next/dynamic` — ตอนนี้**ไม่มีเลยสักจุด** ปฏิทิน/กราฟ recharts/modal โหลดมาพร้อมหน้าแรกทั้งหมดทั้งที่ผู้ใช้ยังไม่เห็น (chunk ใหญ่สุด 332KB)
- [ ] **P12.** ปฏิทิน — ตอนนี้เกิด waterfall: SSR เสร็จ → hydrate → ค่อย `fetch` → ค่อย render และดึง schedule **ทั้ง 73 รายการ**ทุกครั้งทั้งที่แสดงทีละเดือน
  - ✅ **Backend เสร็จแล้ว** `/api/admin/maintenance-schedules` กรองตาม `start`/`end` ได้จริงแล้ว
    - `?start=2026-09-01&end=2026-09-30` → คืนเฉพาะที่ครบกำหนดในช่วงนั้น (ทดสอบแล้ว: 15 จาก 73 รายการ)
    - **ไม่ส่ง param = คืนทั้งหมดเหมือนเดิม** ของเดิมไม่พัง / วันที่ผิดรูปแบบถูกเมินเฉยๆ ไม่ error
  - เหลือฝั่ง UI: ส่งช่วงเดือนที่กำลังแสดงไปด้วย หรือส่งข้อมูลผ่าน props จาก SSR แทน `fetch` ก็ตัดรอบ waterfall ทิ้งได้เลย
- [ ] **P13.** `<img>` → `next/image` — ทั้งโปรเจกต์**ไม่มี `next/image` เลยสักจุด** ใช้ `<img>` ดิบที่ `admin-dashboard-view.tsx` (~บรรทัด 1173) สำหรับรูปหลักฐานงานซ่อม (**P6 ฝั่ง backend เสร็จแล้ว** — รูปที่อัปโหลดใหม่ถูกย่อเหลือ 1600px แล้ว ทำ P13 คู่ด้วยจะได้ผลเต็มที่)
- [x] **P14. `[Backend ✅ เสร็จแล้ว 18 ส.ค. 2026 — `getWorkOrdersPage(page)` พร้อมเรียกแล้ว]`** Pagination จริงบนกระดานใบงาน

  **ทำตามร่างที่ Esther03u เขียนไว้ ปรับ 3 จุด:**
  1. รวม `findMany` + `count` เป็น `Promise.all` (เดิมยิงทีละอัน)
  2. **แยก select/map เป็นตัวกลาง** (`workOrderBoardSelect` / `toWorkOrderBoardRow`) ให้ `getOrgAdminData()` กับ `getWorkOrdersPage()` ใช้ร่วมกัน — ตาม comment ที่เตือนไว้เองว่าถ้าไม่แยก 2 ที่จะหลุดจากกัน ตอนนี้เพิ่ม field ที่เดียวได้ทั้งคู่
  3. **🐛 แก้บั๊ก pagination ที่ร่างเดิมมี** — ดูด้านล่าง

  **🔴 บั๊กที่เจอตอนทดสอบ (สำคัญ):** `orderBy: { createdAt: "desc" }` อย่างเดียว**ไม่พอ** เพราะ **ใบงาน 17 จาก 52 ใบมี `created_at` เป็น NULL** แถวที่เสมอกันไม่มีลำดับที่แน่นอนใน SQL เครื่องจะคืนลำดับต่างกันได้ในแต่ละครั้ง พอใช้กับ `skip`/`take` จะทำให้**แถวเดียวกันโผล่ 2 หน้า หรือหายไปเลย**

  วัดจริงแล้ว: ไล่ดูทุกหน้าด้วย orderBy เดิมได้ **51 ใบจาก 52** (หายไป 1 ใบถาวร) แก้โดยเพิ่ม `{ id: "desc" }` เป็นตัวตัดสินลำดับ (id เป็น primary key จึงไม่มีทางเสมอกัน) ทดสอบซ้ำได้ครบ 52 ใบ

  **ใช้ยังไง:** `getWorkOrdersPage(page)` คืน `{ workOrders, page, pageSize, total, hasMore }` — `workOrders[]` shape เดียวกับใน `getOrgAdminData()` เป๊ะ (ใช้ mapper ตัวเดียวกัน) เลขหน้าไม่ถูกต้อง (0, ติดลบ, NaN, ทศนิยม) ถูกปรับเป็นหน้า 1 ให้เอง หน้าที่เกินคืน list ว่างไม่ throw ผิดพลาดคืน `{ error }` เพิ่มมา

  **ไม่ filter ฝั่ง server** ตามที่ตกลง — ค้นหา/กรองยังทำในหน้าที่โหลดมาแล้วฝั่ง client เหมือนเดิม
  - ✅ **Backend เสร็จแล้ว** `getOrgAdminData()` คืน `workOrderPage: { total, pageSize, loaded, hasMore }` ใช้ทำปุ่มหน้าถัดไปได้เลย
  - ✅ **แถมแก้บั๊กที่เจอระหว่างทาง:** ตัวเลข "รอดำเนินการ" เดิมนับ pending จากลิสต์ที่ถูก `take: 50` ตัดไว้แล้ว เลยแสดง **47 ทั้งที่จริงมี 48** — เปลี่ยนไปนับด้วย SQL `count()` แล้ว
  - เหลือฝั่ง UI: ทำปุ่มเปลี่ยนหน้า (ตอนนี้ยังโหลดแค่หน้าแรก 50 รายการ)

  **⚠️ อัปเดต 14 ส.ค. 2026 หลังลองต่อจริง:** `workOrderPage` บอกได้แค่ว่ามี `hasMore` แต่ **ไม่มีทางดึงรายการที่เกินหน้าแรก 50 รายการมาได้เลย** — `getOrgAdminData()` ไม่รับ page/cursor param ใดๆ และ query ใช้ `take: 50` ตายตัว (`src/app/admin/actions.ts:127`) ตอนนี้ปุ่มเปลี่ยนหน้าที่ทำได้จริงคือแค่พลิกดูภายใน 50 รายการที่โหลดมาแล้วเท่านั้น (ใช้ได้พอดีตราบใดที่ `total ≤ 50` เหมือนข้อมูล seed ปัจจุบัน แต่จะพังทันทีที่มีใบงานเกิน 50 ใบ)

  **📌 คำขอ:** เพิ่ม server action ใหม่ (แนะนำ `getWorkOrdersPage(page: number)`) ที่รับเลขหน้าแล้ว query ด้วย `skip`/`take` ตาม `WORK_ORDER_PAGE_SIZE` คืน shape เดียวกับ `workOrders[]` ใน `getOrgAdminData()` จะได้ map ผลลัพธ์แบบเดิมได้เลยไม่ต้องแก้ UI ที่ render แถวอยู่แล้ว — เผื่อไว้ด้วยว่าถ้ามี filter/search ฝั่ง client (เช่นช่องค้นหารหัสแอร์) อยากให้ backend filter ตรงนี้ด้วยไหม หรือ UI จะ filter เฉพาะหน้าที่โหลดมาแล้วพอ (คุยกันได้)

  **📌 อัปเดต 15 ส.ค. 2026 — ร่างโค้ดให้พร้อมก็อปวางเลย (Esther03u ทำ UI ฝั่ง `work-order-board.tsx` เสร็จรอเรียกอยู่ หลังแยกไฟล์ตาม P10 แล้ว):** ก็อปโครง select/map มาจาก `getOrgAdminData()` เป๊ะๆ (บรรทัด 90-127 กับ 275-297) เพื่อให้ shape ตรงกันแบบไม่ต้องเดา

  ```ts
  export async function getWorkOrdersPage(page: number) {
    await verifyOrgAdmin();

    const safePage = Math.max(1, Math.floor(page) || 1);

    const workOrdersRaw = await prisma.workOrder.findMany({
      select: {
        id: true,
        status: true,
        priority: true,
        issueDescription: true,
        resolutionNotes: true,
        images: true,
        assignedAt: true,
        claimedAt: true,
        completedAt: true,
        createdAt: true,
        airConditionerId: true,
        airConditioner: {
          select: {
            acCode: true,
            brand: true,
            btu: true,
            status: true,
            room: {
              select: {
                name: true,
                building: { select: { name: true, abbreviation: true } },
              },
            },
            acBrand: { select: { name: true } },
          },
        },
        claimedByUser: { select: { name: true } },
        reportedByUser: { select: { name: true } },
        assignedToUser: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (safePage - 1) * WORK_ORDER_PAGE_SIZE,
      take: WORK_ORDER_PAGE_SIZE,
    });

    // Same mapping as workOrders in getOrgAdminData() — keep the two in sync
    // if either one changes, or the board will render two slightly different shapes.
    const workOrders = workOrdersRaw.map((wo) => ({
      id: wo.id.toString(),
      acCode: wo.airConditioner.acCode,
      brand: wo.airConditioner.acBrand?.name || wo.airConditioner.brand || "ไม่ระบุ",
      btu: wo.airConditioner.btu,
      acStatus: wo.airConditioner.status,
      location: `${wo.airConditioner.room.building.name} (${wo.airConditioner.room.building.abbreviation}) - ห้อง ${wo.airConditioner.room.name}`,
      status: wo.status,
      priority: wo.priority,
      issueDescription: wo.issueDescription,
      resolutionNotes: wo.resolutionNotes,
      images: wo.images,
      reportedByName: wo.reportedByUser?.name || null,
      assignedToName: wo.assignedToUser?.name || null,
      assignedAt: wo.assignedAt ? wo.assignedAt.toISOString() : null,
      claimedByName: wo.claimedByUser?.name || null,
      claimedAt: wo.claimedAt ? wo.claimedAt.toISOString() : null,
      completedAt: wo.completedAt ? wo.completedAt.toISOString() : null,
      createdAt: wo.createdAt ? wo.createdAt.toISOString() : null,
      airConditionerId: wo.airConditionerId.toString(),
    }));

    const total = await prisma.workOrder.count();

    return {
      workOrders,
      page: safePage,
      pageSize: WORK_ORDER_PAGE_SIZE,
      total,
      hasMore: safePage * WORK_ORDER_PAGE_SIZE < total,
    };
  }
  ```

  ไม่ filter ฝั่ง server เพิ่ม — ตาม `workOrder-board.tsx` ตอนนี้ค้นหา/กรองทำในหน้าที่โหลดมาแล้วฝั่ง client อยู่แล้ว (เหมือนพฤติกรรมเดิม) ถ้าอยากได้ server-side search ทีหลังค่อยเพิ่ม `where` แยกเป็นงานใหม่ได้ ไม่ต้องรวมกับ pagination รอบนี้

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

### Org Admin System Settings Page (16 สิงหาคม 2026)

หน้า "ตั้งค่าระบบ" (`src/components/admin/settings-panel.tsx`) สร้าง UI ครบ 4 การ์ดแล้ว ตามสเปก `docs/superpowers/specs/2026-08-16-org-admin-system-settings-page-design.md` การ์ด "จัดการยี่ห้อ/รุ่นแอร์" ทำงานได้จริง (reuse ของเดิม ไม่ต้องรอ) ส่วนอีก 3 การ์ดเป็น UI placeholder รอ backend:

- [ ] **S4.** การ์ด "รอบซ่อมบำรุงเริ่มต้น" — กดบันทึกแล้วโชว์แค่ข้อความเตือน ยังไม่มีที่เก็บค่า

  **คำขอ:** สร้างตาราง `SystemSettings` ใหม่ (แถวเดียว/singleton, `id` ตายตัว = 1): `defaultFrequencyValue Int @default(6)`, `defaultFrequencyUnit String @default("months")`, `organisationName String?`, `organisationAddress String?`, `organisationPhone String?`, `updatedAt DateTime @updatedAt` (รวมกับ S5 ในตารางเดียวกัน) แล้วเพิ่ม Server Action `updateDefaultFrequencyAction(value: number, unit: string)` ใน `src/app/admin/actions.ts` — validate ด้วย Zod (`value > 0`, `unit` เป็นหนึ่งใน `"days" | "months" | "years"`) แล้ว upsert แถวเดียวนั้น พร้อม `logAudit`

  **ตัดสินใจแล้ว:** เปลี่ยนค่า default นี้มีผลกับ**เครื่องปรับอากาศที่เพิ่มใหม่เท่านั้น** ไม่กระทบเครื่องที่มีรอบตั้งไว้แล้ว — **แก้คำอธิบายเดิมตรงนี้ที่ชี้ผิดจุด:** `registerAc` ใน `src/app/admin/actions.ts` (บรรทัด ~938, `prisma.airConditioner.create`) สร้างแค่แถว `AirConditioner` เฉยๆ **ไม่มี** โค้ดจุดไหนสร้าง `MaintenanceSchedule` ตอนลงทะเบียนแอร์ใหม่เลยในตอนนี้ — จุดเดียวในทั้งระบบที่เรียก `prisma.maintenanceSchedule.create` อยู่ในฟอร์ม "ตั้งค่ารอบซ่อมบำรุง" ต่อเครื่อง (`src/app/admin/actions.ts` บรรทัด ~1278) ซึ่งรับ `frequencyValue`/`frequencyUnit` ตรงจากฟอร์มที่ผู้ใช้กรอกเสมอ ไม่เคยตกไปใช้ค่า hardcode ใน `prisma/schema.prisma:261-262` เลย (ค่า default ในนั้นไม่เคยถูกใช้จริงโดยโค้ดปัจจุบัน)

  ค่า "6 เดือน" hardcode ที่ผู้ใช้เห็นจริงๆ ตอนนี้อยู่ที่ **ฟอร์มแก้ไขรอบซ่อมบำรุง** ใน `src/components/admin/asset-manager.tsx` — เป็นค่า fallback ตอนเครื่องยังไม่เคยมีการตั้งรอบมาก่อน: `defaultValue={showPmSettings.maintenanceSchedule?.frequencyValue || 6}` (บรรทัด 461) และ `defaultValue={showPmSettings.maintenanceSchedule?.frequencyUnit || "months"}` (บรรทัด 467)

  **มีเรื่องต้องตัดสินใจก่อนเริ่มเขียน:** จะให้ค่า default จาก `SystemSettings` มีผลยังไงกันแน่ — (ก) เปลี่ยนพฤติกรรมใหม่ ให้ตอนลงทะเบียนแอร์เพิ่มการสร้าง `MaintenanceSchedule` ให้อัตโนมัติเลยโดยอ่านค่าจาก `SystemSettings` (ตอนนี้เครื่องใหม่ไม่มี schedule จนกว่าจะมีคนมาตั้งเองผ่านฟอร์ม PM settings) หรือ (ข) ทำแบบ minimal change ตรงกับพฤติกรรมปัจจุบัน คือแค่เอาค่าจาก `SystemSettings` ไปแทนที่ hardcode `|| 6` / `|| "months"` สองจุดใน `asset-manager.tsx` ที่ว่า (schedule ยังถูกสร้างตอนกรอกฟอร์ม PM settings เหมือนเดิม ไม่ได้สร้างตอนลงทะเบียน) — ทั้งสองแบบยังคงคำสัญญา "มีผลกับเครื่องใหม่เท่านั้น" ไว้ได้เหมือนกัน แค่ implementation ต่างกัน รอ DoubleKill ตัดสินใจตอนเขียน backend

- [ ] **S5.** การ์ด "ข้อมูลองค์กร" — กดบันทึกแล้วโชว์แค่ข้อความเตือนเหมือนกัน ชื่อหน่วยงานตอนนี้ยังเป็นค่าคงที่ `ORGANISATION_NAME` ใน `src/lib/organisation.ts` (ที่อยู่/เบอร์โทรไม่มีที่เก็บเลย)

  **คำขอ:** เพิ่ม Server Action `updateOrganisationInfoAction(name: string, address?: string, phone?: string)` ใน `src/app/admin/actions.ts` — upsert แถว `SystemSettings` เดียวกับ S4 พร้อม `logAudit` แล้วเปลี่ยน `src/lib/organisation.ts` จาก export ค่าคงที่ `ORGANISATION_NAME` เป็นฟังก์ชัน async `getOrganisationName()` ที่อ่านจาก `SystemSettings.organisationName` (fallback เป็นสตริงเดิม `"มหาวิทยาลัยราชภัฏภูเก็ต"` ถ้ายังไม่เคยตั้งค่า) แล้วอัปเดต 3 จุดที่เรียกใช้ค่าคงที่เดิมอยู่ (`src/app/tech/actions.ts`, `src/app/admin/actions.ts`, `src/app/pending-approval/page.tsx`) ให้เรียก `await getOrganisationName()` แทน

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

- [x] **Backend เสร็จแล้ว (11 ส.ค. 2026)**
- [ ] **Frontend รอ Esther03u** — ดูคำขอด้านล่าง

**สิ่งที่ backend ทำแล้ว:** `/api/admin/maintenance-schedules` เพิ่ม 3 field ใหม่ต่อ 1 รายการ

| field ใหม่ | ตัวอย่างค่า | ใช้ทำอะไร |
|---|---|---|
| `buildingId` | `"3"` | ใช้เป็น key ตอน group / เป็น id ของกลุ่ม (เป็น string แล้ว ไม่ใช่ BigInt) |
| `buildingName` | `"Administration Building 293183"` | ชื่อตึกที่แสดงบนหัวกลุ่ม |
| `roomName` | `"4-568994"` | ชื่อห้อง แยกออกมาเพื่อไม่ต้องแสดงชื่อตึกซ้ำในแต่ละแถวย่อย |

**`location` เดิมยังอยู่เหมือนเดิมทุกประการ** (`"ชื่อตึก - ชื่อห้อง"`) โค้ดที่ใช้อยู่ตอนนี้ไม่ต้องแก้อะไรถ้ายังไม่พร้อมทำ

**📌 คำขอถึง Esther03u — ปรับ `src/components/shared/maintenance-calendar.tsx`**

group รายการของแต่ละวันด้วย `buildingId` ก่อน render เช่น:

```ts
const byBuilding = jobs.reduce<Record<string, { name: string; jobs: Job[] }>>((acc, job) => {
  (acc[job.buildingId] ??= { name: job.buildingName, jobs: [] }).jobs.push(job);
  return acc;
}, {});
```

แล้วในช่องวันแสดงเป็น `ชื่อตึก (จำนวนงาน)` กดแล้วเปิด modal/panel แสดงรายการงานของตึกนั้น โดยในโมดัลใช้ `roomName` + `acCode` + `jobType` ได้เลย ไม่ต้องโชว์ชื่อตึกซ้ำ

⚠️ **ข้อมูล seed ปัจจุบันมีมากสุดแค่ 2 งาน/วัน** ทำให้ทดสอบหน้าตาแบบ "วันเดียว 100 งาน" ไม่ได้จากข้อมูลจริง ถ้าจะลองให้เห็นผลชัด แนะนำ mock ข้อมูลฝั่ง client ชั่วคราวตอนพัฒนา หรือบอก DoubleKill ให้เขียน script ยัดข้อมูลทดสอบให้

**หมายเหตุ:** ระหว่างทางเปลี่ยน query จาก `include` เป็น `select` ด้วย (เดิมดึง `room` กับ `building` มาทั้งแถว) — ทดสอบแล้ว response เดิมครบทุก field ปฏิทินแสดงผลเหมือนเดิม และ filter `start`/`end` ของ P12 ยังทำงานถูกต้อง

---

### F3. เพิ่มหน้า/ส่วนแสดงประวัติการดูแลรักษาของแอร์แต่ละตัว

- [x] **Backend เสร็จแล้ว (11 ส.ค. 2026)**
- [ ] **Frontend รอ Esther03u** — ดูคำขอด้านล่าง

**Server Action ใหม่: `getAirConditionerHistory(airConditionerId: string)`** (`src/app/admin/actions.ts`)

คืนทั้งข้อมูลเครื่องและประวัติในครั้งเดียว จะได้ไม่ต้องยิง 2 รอบ:

```ts
{
  unit: {
    acCode: string;
    brand: string;          // ยี่ห้อจาก catalog ถ้าไม่มีใช้ค่าที่พิมพ์เอง ถ้าไม่มีอีกเป็น "ไม่ระบุ"
    model: string | null;
    btu: number | null;
    status: "normal" | "broken" | "needs_cleaning";
    location: string;       // "ชื่อตึก - ห้อง xxx"
    installedAt: string | null;   // ISO
  },
  history: Array<{
    id: string;
    action: "cleaning" | "repair" | "refill_refrigerant";
    performedAt: string;          // ISO — เป็น UTC instant ให้แปลงเป็นเวลาไทยตอนแสดง
    technicianName: string;
    notes: string | null;
    beforePhotoUrl: string | null;
    afterPhotoUrl: string | null;
  }>
}
```

กรณีผิดพลาดคืน `{ error: string }` (ข้อความไทย พร้อมแสดงเลย) — เช็คด้วย `"error" in result` ก่อนใช้

**เรียงจากล่าสุดไปเก่าสุดให้แล้ว** และ **มี URL รูปก่อน/หลัง** ซึ่งหน้า QR ไม่ได้แสดง แต่ฝั่ง admin น่าจะอยากเห็นเป็นหลักฐาน

**ป้ายภาษาไทยของประเภทงาน** (ก๊อปไปใช้ได้เลย — หน้า QR ใช้ชุดนี้):
```ts
const MAINTENANCE_ACTION_LABEL: Record<string, string> = {
  cleaning: "ล้างแอร์",
  repair: "ซ่อมแซม",
  refill_refrigerant: "เติมน้ำยาแอร์",
};
```

**📌 คำขอ:** เพิ่มปุ่ม "ดูประวัติ" ในการ์ดแอร์แต่ละใบใน `src/components/admin/asset-manager.tsx` (ตอนนี้มีปุ่ม "ล้างทุก X เดือน" กับ "QR Code" อยู่แล้ว) กดแล้วเปิดโมดัลแสดง timeline — หน้าตาลอกจากหน้า QR ได้เลย (`src/app/qr/[id]/page.tsx` ส่วน "ประวัติการซ่อมบำรุง")

**หมายเหตุการ refactor:** query ประวัติถูกย้ายไปเป็น `getMaintenanceHistory()` ใน `src/lib/maintenance.ts` แล้ว หน้า QR เปลี่ยนมาเรียกตัวนี้แทน query ของตัวเอง เพื่อไม่ให้ 2 หน้านิยาม "ประวัติของเครื่องนี้" ไม่ตรงกัน — ทดสอบแล้วหน้า QR แสดงผลเหมือนเดิมทุกอย่าง

---

### F4. เพิ่มวันที่ติดตั้งแอร์ (`installedAt`) + default

- [x] **Backend เสร็จแล้ว (11 ส.ค. 2026)** — `createAirConditionerAction` รับ `installedAt` จากฟอร์มแล้ว
- [ ] **Frontend รอ Esther03u** — ดูคำขอด้านล่าง

**สิ่งที่ backend ทำแล้ว:**
- `acSchema` รับ field ใหม่ชื่อ **`installedAt`** เป็น **optional** รูปแบบ **`YYYY-MM-DD`** (ตรงกับที่ `<input type="date">` ส่งมาพอดี ไม่ต้องแปลงอะไร)
- **ไม่ส่งมาหรือส่งค่าว่าง = ใช้วันที่วันนี้** (ตามเวลาไทย) — ฟอร์มปัจจุบันที่ยังไม่มีช่องนี้จึงยังทำงานได้ปกติ ไม่พัง
- กรอกรูปแบบผิดหรือวันที่ไม่มีจริง (เช่น `2026-02-31`) จะคืน error ข้อความไทยว่า *"วันที่ติดตั้งไม่ถูกต้อง"*

**🐛 แก้บั๊กไปด้วยระหว่างทาง 2 ข้อ:**

1. **`installedAt` บันทึกผิดวันช่วงกลางคืน** — ของเดิมเขียน `installedAt: new Date()` ลงคอลัมน์ `@db.Date` ซึ่งเป็นบั๊กชุดเดียวกับ **P16** ลงทะเบียนแอร์ช่วง 00:00–06:59 น. จะบันทึกวันติดตั้งเป็น**เมื่อวาน** ตอนนี้ใช้ `businessDateToday()` แล้ว

2. **🔴 ลงทะเบียนแอร์ไม่ได้เลยทั้งสองแบบ (บั๊กเดิม เจอตอนกดทดสอบจริง)** — กดปุ่มแล้วขึ้น error ว่า `Invalid input` เฉยๆ ไม่บอกสาเหตุ

   **สาเหตุ:** `z.string().optional()` ของ Zod รับ `undefined` แต่ **ไม่รับ `null`** ส่วน `formData.get()` คืน **`null`** เมื่อไม่มี input ชื่อนั้นใน DOM — และฟอร์มนี้ render แค่ฝั่งเดียวตามแท็บที่เลือก:
   - เลือก **"รุ่นมาตรฐาน"** → ไม่มี input `customBrand`/`customModel` → ทั้งคู่เป็น `null` → parse ล้ม
   - เลือก **"กำหนดเอง"** → ไม่มี input `acModelId` → เป็น `null` → parse ล้ม

   **แก้แล้ว** โดยอ่านทุก field ที่เป็น optional ด้วย `?? undefined` (`btu` ไม่โดนเพราะประกาศเป็น `.nullable()` ซึ่งรับ `null` ได้อยู่แล้ว ส่วน `assignToUserId` กับ `notes` ตรวจแล้วปลอดภัยเพราะใช้ `|| undefined` อยู่ก่อนแล้ว)

   ⚠️ **บทเรียนเดียวกับบั๊ก brand dropdown:** build ผ่าน TypeScript ผ่าน แต่พังตอนใช้จริง — เจอเพราะไปกดปุ่มลงทะเบียนจริง **ถ้าเขียน schema ใหม่ที่มี `.optional()` แล้วอ่านค่าจาก `formData.get()` ต้องใส่ `?? undefined` เสมอ**

**ทดสอบด้วยการรันจริงแล้ว:** ลงทะเบียนแอร์ใหม่ผ่านหน้าเว็บสำเร็จ ได้รหัส `B467711-1-19179-03` (รูปแบบใหม่หลัง F1 นับลำดับต่อจากเครื่องเดิมถูกต้อง) และ `installed_at` เป็นวันที่ไทยวันนี้ — ลบข้อมูลทดสอบออกแล้ว

**📌 คำขอถึง Esther03u — เพิ่มช่องวันที่ในฟอร์มลงทะเบียนแอร์**

ไฟล์ `src/components/admin/asset-manager.tsx` ในโมดัล "ลงทะเบียนเครื่องปรับอากาศ" (~บรรทัด 450 ก่อนปุ่ม submit) เพิ่มช่องนี้:

```tsx
<div>
  <label className="mb-1.5 block font-bold text-foreground">
    วันที่ติดตั้ง (ไม่บังคับ)
  </label>
  <input
    name="installedAt"
    type="date"
    className="w-full rounded-xl border border-border px-3.5 py-2.5 text-foreground focus:border-primary focus:outline-none"
  />
  <p className="mt-1 text-[11px] text-muted-foreground">ไม่กรอก = ใช้วันที่วันนี้</p>
</div>
```

**ต้องวางไว้นอกเงื่อนไข `acBrandType === "master" ? ... : ...`** เพื่อให้ขึ้นทั้งสองแบบ (ตอนนี้ช่อง BTU อยู่ในฝั่ง "กำหนดเอง" อย่างเดียว — ถ้าเอาช่องวันที่ไปวางในนั้นด้วย คนที่เลือกรุ่นมาตรฐานจะกรอกวันที่ไม่ได้)

ชื่อ field ต้องเป็น **`installedAt`** เป๊ะๆ เพราะ backend อ่านจาก `formData.get("installedAt")`

---

### F6. QR Code — ดูประวัติได้โดยไม่ต้อง Login แต่บันทึกงานต้อง Login

- [x] **เสร็จแล้ว (11 ส.ค. 2026)** — ทำทั้ง backend และ UI ในไฟล์เดียว `src/app/qr/[id]/page.tsx`

**ตัดสินใจแล้วว่าไม่ต้องซ่อนชื่อช่างที่เคยทำงาน แม้จะเปิดเป็น public**

**พฤติกรรมตอนนี้ แยกตามผู้เข้าชม:**

| ผู้เข้าชม | เห็นอะไร |
|---|---|
| **ไม่ได้ล็อกอิน** (สแกน QR มาเฉยๆ) | เห็นข้อมูลเครื่อง + รอบบำรุงรักษา + ประวัติการซ่อมบำรุงครบ พร้อมการ์ด **"เข้าสู่ระบบ"** ท้ายหน้า — ไม่มีลิงก์ "กลับสู่หน้าหลัก" เพราะคนที่สแกนป้ายมาไม่มีหน้า dashboard ให้กลับ |
| **ช่างซ่อมบำรุง** | เห็นทุกอย่าง + ปุ่ม **"บันทึกงานซ่อมบำรุง"** ลิงก์ไป `/tech` (ที่ฟอร์มบันทึกงานอยู่) + ลิงก์กลับหน้าหลัก |
| **ผู้ดูแลระบบ** | เห็นทุกอย่าง + ลิงก์กลับหน้าหลัก (ไม่มีปุ่มบันทึกงาน เพราะ admin ไม่ใช่คนลงบันทึก) |

**ความปลอดภัยไม่ได้ลดลง:**
- URL ใช้ `qrCode` ซึ่งเป็น **uuid สุ่ม** ไม่ใช่ `acCode` ที่เดาได้ — เปิดหน้านี้ได้เฉพาะคนที่มีป้าย QR อยู่ในมือ (หรือได้ลิงก์มา)
- **การบันทึกงานยังต้องล็อกอินเหมือนเดิม** — `logMaintenanceAction` มี `verifyTechnician()` ครอบอยู่ ไม่ได้ถูกแตะ ปุ่มบนหน้านี้เป็นแค่ทางลัด ไม่ใช่ตัวตัดสินสิทธิ์
- หน้านี้ไม่ได้อยู่ใน matcher ของ `src/proxy.ts` อยู่แล้ว (`/admin`, `/tech` เท่านั้น) จึงไม่ต้องแก้ proxy

**⚠️ หมายเหตุถึง Esther03u:** งานนี้แตะไฟล์ `src/app/qr/[id]/page.tsx` ซึ่งมีทั้ง logic และ UI ปนกัน DoubleKill ทำทั้งไฟล์เพราะถ้าตัด auth gate อย่างเดียวจะเหลือลิงก์ "กลับสู่หน้าหลัก" ที่พาคนไม่ได้ล็อกอินไปเด้ง login **หน้าตาปรับได้ตามใจ** ขอแค่คงเงื่อนไข `isSignedIn` / `isTechnician` ไว้

**ข้อเสนอปรับปรุงเพิ่ม (ยังไม่ได้ทำ):** ตอนนี้ปุ่ม "เข้าสู่ระบบ" ลิงก์ไป `/login` เฉยๆ พอล็อกอินเสร็จจะเด้งไป dashboard ไม่ได้กลับมาหน้า QR เดิม ถ้าอยากให้กลับมา ต้องแก้ `src/components/login-form.tsx` ที่ตอนนี้ `router.push("/")` ตายตัว ให้อ่าน `callbackUrl` จาก query param แทน — **เป็นไฟล์ฝั่ง UI ของ Esther03u**

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

# Handoff Documentation: AC Maintenance System

## 📌 Project Overview
**AC Maintenance System** คือแพลตฟอร์มบริหารจัดการและแจ้งซ่อมบำรุงเครื่องปรับอากาศระดับมหาวิทยาลัยแบบ Multi-Tenant พัฒนาด้วย **Next.js 16 App Router**, **Prisma 7 ORM**, **NextAuth v5**, **Tailwind CSS v4** และ **Motion (Animated Lucide Icons)**

---

## 🏗️ Architecture & Multi-Tenant Boundary

### 1. Tenant Scope & Authorization Boundaries
- **University (`university_id`)** เป็นขอบเขตหลักของการจัดการแบบ Multi-Tenant (`University` ➔ `Building` ➔ `Room` ➔ `AirConditioner`)
- **Super Admin (`super_admin`):** บัญชีระดับแพลตฟอร์มส่วนกลาง (`universityId: null`) เข้าถึงพื้นที่ควบคุมหลัก `/super-admin`
- **Org Admin (`org_admin`):** บัญชีผู้ดูแลประจำมหาวิทยาลัย (`universityId` ตรงตามสถาบัน) เข้าถึงศูนย์ควบคุม `/admin`
- **Technician (`technician`):** บัญชีช่างเทคนิคซ่อมบำรุงหน้างาน (`universityId` ตรงตามสถาบัน) เข้าถึงพื้นที่ปฏิบัติงานช่าง `/tech`

---

## 🔑 Key Technology Stack & Modules

| Layer | Technology | Key Details & Conventions |
| :--- | :--- | :--- |
| **Framework** | Next.js 16.2 (App Router) | ใช้ `src/proxy.ts` และ `src/lib/auth.config.ts` ในการป้องกันเส้นทางตามบทบาท |
| **Authentication** | NextAuth.js v5 (Beta 32) | Credentials Provider พร้อมการแปลงอีเมลเป็นตัวพิมพ์เล็ก (`toLowerCase().trim()`) และตรวจสอบสถานะบัญชี (`active`) |
| **Database & ORM** | Prisma 7.9 (`@prisma/adapter-mariadb`) | MariaDB/MySQL Connection Pool Driver Adapter ใน [src/lib/prisma.ts](file:///c:/Users/LENOVO/OneDrive%20-%20Phuket%20Rajabhat%20University/Study/%E0%B8%9B%E0%B8%B5_3/Project/ac-maintenance/src/lib/prisma.ts) |
| **Typography** | `Noto Sans Thai` (Google Fonts) | แบบอักษรหลักภาษาไทยและอังกฤษ กำหนดใน `src/app/layout.tsx` และ `src/app/globals.css` |
| **Icon Standard** | `lucide-react` + `motion/react` | ใช้ Vector SVG Icons ร่วมกับ Micro-animations (`AnimatedIcon`) **ไม่ใช้อีโมจิใน UI ทุกกรณี** |

---

## 🚀 Workspaces & Features

### 1. 👑 **Super Admin Workspace (`/super-admin`)**
- **File Location:** [src/app/super-admin/page.tsx](file:///c:/Users/LENOVO/OneDrive%20-%20Phuket%20Rajabhat%20University/Study/%E0%B8%9B%E0%B8%B5_3/Project/ac-maintenance/src/app/super-admin/page.tsx), [actions.ts](file:///c:/Users/LENOVO/OneDrive%20-%20Phuket%20Rajabhat%20University/Study/%E0%B8%9B%E0%B8%B5_3/Project/ac-maintenance/src/app/super-admin/actions.ts), [super-admin-view.tsx](file:///c:/Users/LENOVO/OneDrive%20-%20Phuket%20Rajabhat%20University/Study/%E0%B8%9B%E0%B8%B5_3/Project/ac-maintenance/src/components/super-admin/super-admin-view.tsx)
- **Features:**
  - 4 High-contrast Metric Cards (จำนวนมหาวิทยาลัย, บัญชีรอการอนุมัติ 🟡, ช่างเทคนิครวม, ใบงานรวม)
  - **Pending Approvals Table:** ตารางกดอนุมัติสิทธิ์เข้าใช้งานสำหรับช่างและแอดมินใหม่ (`Approve` / `Reject`)
  - **University Management Table:** รายชื่อมหาวิทยาลัยพร้อมสถิติอาคาร/ช่าง และ Modal เพิ่มมหาวิทยาลัยใหม่ลงระบบ

### 2. 🏫 **Org Admin Workspace (`/admin`)**
- **File Location:** [src/app/admin/page.tsx](file:///c:/Users/LENOVO/OneDrive%20-%20Phuket%20Rajabhat%20University/Study/%E0%B8%9B%E0%B8%B5_3/Project/ac-maintenance/src/app/admin/page.tsx), [actions.ts](file:///c:/Users/LENOVO/OneDrive%20-%20Phuket%20Rajabhat%20University/Study/%E0%B8%9B%E0%B8%B5_3/Project/ac-maintenance/src/app/admin/actions.ts), [admin-dashboard-view.tsx](file:///c:/Users/LENOVO/OneDrive%20-%20Phuket%20Rajabhat%20University/Study/%E0%B8%9B%E0%B8%B5_3/Project/ac-maintenance/src/components/admin/admin-dashboard-view.tsx)
- **Features:**
  - 4 Metric Cards (จำนวนแอร์ทั้งหมด ❄️, แอร์ชำรุด/ต้องล้าง ⚠️, ใบงานที่รอช่างรับ 📋, ช่างปฏิบัติงาน 🛠️)
  - **Work Order Dispatch Center Table:** ตารางติดตามสถานะใบงานซ่อมบำรุง Real-time พร้อม Filter สถานะ (Pending, Claimed, Completed) และ Modal ออกใบงานซ่อมด่วน
  - **Asset Hierarchy Tree View:** แสดงลำดับขั้น อาคาร ➔ ห้อง ➔ เครื่องปรับอากาศ พร้อมสถานะรายเครื่อง

### 3. 🛠️ **Technician Mobile Workspace (`/tech`)**
- **File Location:** [src/app/tech/page.tsx](file:///c:/Users/LENOVO/OneDrive%20-%20Phuket%20Rajabhat%20University/Study/%E0%B8%9B%E0%B8%B5_3/Project/ac-maintenance/src/app/tech/page.tsx), [actions.ts](file:///c:/Users/LENOVO/OneDrive%20-%20Phuket%20Rajabhat%20University/Study/%E0%B8%9B%E0%B8%B5_3/Project/ac-maintenance/src/app/tech/actions.ts), [tech-mobile-view.tsx](file:///c:/Users/LENOVO/OneDrive%20-%20Phuket%20Rajabhat%20University/Study/%E0%B8%9B%E0%B8%B5_3/Project/ac-maintenance/src/components/tech/tech-mobile-view.tsx)
- **Features:**
  - Mobile Bar พร้อมปุ่มสแกน **QR Code** หน้างาน (พร้อม Modal จำลองผลสแกนป้ายรหัสแอร์)
  - **2-Tab Navigation:**
    - `Job Pool (งานในคลัง):` รายการงานซ่อมบำรุงที่รอช่างกดรับงาน (Claim Order)
    - `My Jobs (งานของฉัน):` รายการงานที่ช่างรับมาปฏิบัติงาน พร้อมปุ่มเปิด Sheet บันทึกประวัติซ่อมบำรุง
  - **Action Logger Sheet Modal:** เลือกระบุประเภทการซ่อมบำรุง (ล้างแอร์ 🧼, ซ่อมแซม 🛠️, เติมน้ำยา ❄️) บันทึกหมายเหตุ และย้ายสถานะใบงานเป็นเสร็จสิ้น (`completed`)

---

## 🔐 Credentials & Test Accounts

| Role | Email | Password | Dashboard URL |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@ac-maintenance.com` | `Password123!` | `/super-admin` |
| **Org Admin** | `admin@pkru.ac.th` | `Password123!` | `/admin` |
| **Technician** | `tech@pkru.ac.th` | `Password123!` | `/tech` |

---

## 🛠️ Verification & Maintenance Commands

```bash
# 1. Run local development server
npm run dev

# 2. Check TypeScript compilation cleanly
npx tsc --noEmit

# 3. Seed test users and sample data
npx tsx prisma/seed.ts
```

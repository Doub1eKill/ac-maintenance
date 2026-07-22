# Handoff Documentation: AC Maintenance System

## 📌 Project Overview
**AC Maintenance System** คือแพลตฟอร์มบริหารจัดการและแจ้งซ่อมบำรุงเครื่องปรับอากาศระดับมหาวิทยาลัยแบบ Multi-Tenant พัฒนาด้วย **Next.js 16 App Router**, **Prisma 7 ORM**, **NextAuth v5**, **Tailwind CSS v4** และ **Motion (Animated Lucide Icons)**

---

## 🏗️ Architecture & Multi-Tenant Boundary

### 1. Tenant Scope & Authorization Boundaries
- **University (`university_id`)** เป็นขอบเขตหลักของการจัดการแบบ Multi-Tenant (`University` ➔ `Building` ➔ `Room` ➔ `AirConditioner`)
- **Super Admin (`super_admin`):** บัญชีระดับแพลตฟอร์มส่วนกลาง (`universityId: null`) เข้าถึงพื้นที่ควบคุมหลัก `/super-admin` ดูแลการเพิ่มมหาวิทยาลัยและอนุมัติสิทธิ์แอดมินประจำมหาวิทยาลัย
- **Org Admin (`org_admin`):** บัญชีผู้ดูแลประจำมหาวิทยาลัย (`universityId` ตรงตามสถาบัน) เข้าถึงศูนย์ควบคุม `/admin` ดูแลใบงานแอร์ อนุมัติสิทธิ์ช่าง/พนักงาน และจัดการบุคลากรในสังกัด
- **Technician (`technician`):** บัญชีช่างเทคนิคซ่อมบำรุงหน้างาน (`universityId` ตรงตามสถาบัน) เข้าถึงพื้นที่ปฏิบัติงานช่าง `/tech` รับงาน สแกน QR Code และบันทึกประวัติการซ่อมบำรุง

---

## 🔑 Key Technology Stack & Modules

| Layer | Technology | Key Details & Conventions |
| :--- | :--- | :--- |
| **Framework** | Next.js 16.2 (App Router) | ใช้ `src/proxy.ts` และ `src/lib/auth.config.ts` ในการป้องกันเส้นทางตามบทบาท |
| **Authentication** | NextAuth.js v5 (Beta 32) | Credentials Provider + Domain Auto-Approval + Dedicated `/pending-approval` Page |
| **Database & ORM** | Prisma 7.9 (`@prisma/adapter-mariadb`) | MariaDB/MySQL Connection Pool Driver Adapter ใน [src/lib/prisma.ts](file:///c:/Users/LENOVO/OneDrive%20-%20Phuket%20Rajabhat%20University/Study/%E0%B8%9B%E0%B8%B5_3/Project/ac-maintenance/src/lib/prisma.ts) |
| **Typography** | `Noto Sans Thai` (Google Fonts) | แบบอักษรหลักภาษาไทยและอังกฤษ กำหนดใน `src/app/layout.tsx` และ `src/app/globals.css` |
| **Icon Standard** | `lucide-react` + `motion/react` | ใช้ Vector SVG Icons ร่วมกับ Micro-animations (`AnimatedIcon`) **ไม่ใช้อีโมจิใน UI ทุกกรณี** |
| **Responsiveness** | Mobile-First & Adaptive | รองรับการทำงานบนมือถือและสมาร์ทโฟนทุกหน้าด้วย Mobile Sub-Tab Navigation และ Responsive Dialog Modals |

---

## 🚀 Workspaces & Enterprise Features

### 1. 👑 **Super Admin Workspace (`/super-admin`)**
- **File Location:** [src/app/super-admin/page.tsx](file:///c:/Users/LENOVO/OneDrive%20-%20Phuket%20Rajabhat%20University/Study/%E0%B8%9B%E0%B8%B5_3/Project/ac-maintenance/src/app/super-admin/page.tsx), [actions.ts](file:///c:/Users/LENOVO/OneDrive%20-%20Phuket%20Rajabhat%20University/Study/%E0%B8%9B%E0%B8%B5_3/Project/ac-maintenance/src/app/super-admin/actions.ts), [super-admin-view.tsx](file:///c:/Users/LENOVO/OneDrive%20-%20Phuket%20Rajabhat%20University/Study/%E0%B8%9B%E0%B8%B5_3/Project/ac-maintenance/src/components/super-admin/super-admin-view.tsx)
- **Features:**
  - 4 High-contrast Metric Cards (จำนวนมหาวิทยาลัย, บัญชีรอการอนุมัติ, ช่างเทคนิครวม, ใบงานรวม)
  - **Pending Approvals Table:** อนุมัติสิทธิ์แอดมินประจำมหาวิทยาลัยส่วนกลาง (`Approve` / `Reject`)
  - **University Management Table:** รายชื่อมหาวิทยาลัยพร้อมสถิติอาคาร/ช่าง และ Modal เพิ่มมหาวิทยาลัยใหม่ลงระบบ

### 2. 🏫 **Org Admin Workspace (`/admin`)**
- **File Location:** [src/app/admin/page.tsx](file:///c:/Users/LENOVO/OneDrive%20-%20Phuket%20Rajabhat%20University/Study/%E0%B8%9B%E0%B8%B5_3/Project/ac-maintenance/src/app/admin/page.tsx), [actions.ts](file:///c:/Users/LENOVO/OneDrive%20-%20Phuket%20Rajabhat%20University/Study/%E0%B8%9B%E0%B8%B5_3/Project/ac-maintenance/src/app/admin/actions.ts), [admin-dashboard-view.tsx](file:///c:/Users/LENOVO/OneDrive%20-%20Phuket%20Rajabhat%20University/Study/%E0%B8%9B%E0%B8%B5_3/Project/ac-maintenance/src/components/admin/admin-dashboard-view.tsx)
- **Features:**
  - Metric Banner & Gauge Indicator แสดงอัตราความสมบูรณ์ของแอร์และสถิติใบงาน
  - **Work Order Kanban Columns:** คอลัมน์จัดระดับใบงานซ่อมบำรุง (Pending Claims, In Progress, Completed) พร้อม Modal ออกใบงานซ่อมด่วน
  - **User Approvals Tab:** ตารางอนุมัติสิทธิ์เข้าใช้งานสำหรับช่าง/พนักงานใหม่ที่ลงทะเบียนสังกัดมหาวิทยาลัยตนเอง
  - **Staff & Techs Directory Tab:** การบริหารจัดการบัญชีผู้ใช้งานในสังกัด (Activate / Suspend) พร้อม Audit Trail Log
  - **Asset Hierarchy Tree View:** แสดงลำดับขั้น อาคาร ➔ ห้อง ➔ เครื่องปรับอากาศ

### 3. 🛠️ **Technician Mobile Workspace (`/tech`)**
- **File Location:** [src/app/tech/page.tsx](file:///c:/Users/LENOVO/OneDrive%20-%20Phuket%20Rajabhat%20University/Study/%E0%B8%9B%E0%B8%B5_3/Project/ac-maintenance/src/app/tech/page.tsx), [actions.ts](file:///c:/Users/LENOVO/OneDrive%20-%20Phuket%20Rajabhat%20University/Study/%E0%B8%9B%E0%B8%B5_3/Project/ac-maintenance/src/app/tech/actions.ts), [tech-mobile-view.tsx](file:///c:/Users/LENOVO/OneDrive%20-%20Phuket%20Rajabhat%20University/Study/%E0%B8%9B%E0%B8%B5_3/Project/ac-maintenance/src/components/tech/tech-mobile-view.tsx)
- **Features:**
  - Mobile Bar พร้อมปุ่มสแกน **QR Code** หน้างาน (พร้อม Modal จำลองผลสแกนป้ายรหัสแอร์)
  - **2-Tab Navigation:**
    - `Job Pool (งานในคลัง):` รายการงานซ่อมบำรุงที่รอช่างกดรับงาน (Claim Order)
    - `My Jobs (งานของฉัน):` รายการงานที่ช่างรับมาปฏิบัติงาน พร้อมปุ่มเปิด Sheet บันทึกประวัติซ่อมบำรุง
  - **Action Logger Sheet Modal:** เลือกระบุประเภทการซ่อมบำรุง (Cleaning, Repair, Gas Refill) บันทึกหมายเหตุ และย้ายสถานะใบงานเป็นเสร็จสิ้น (`completed`)

### 4. 🔒 **Enterprise Domain Auto-Approval & Pending UX (`/pending-approval`)**
- **Domain Auto-Approval:** บัญชีที่สมัครด้วยอีเมลสถาบัน/องค์กร (`.ac.th`, `.edu`, `.edu.th` หรือตรงตามตัวย่อสถาบัน) จะได้รับการอนุมัติใช้งานทันทีอัตโนมัติ (`status: 'active'`)
- **Pending Approval Page (`/pending-approval`):** บัญชีอีเมลทั่วไป (`@gmail.com`, `@hotmail.com`) จะถูกส่งมายังหน้าจอนี้เพื่อแสดงข้อมูลติดต่อสถาบัน (เบอร์โทร, ที่อยู่) และคำแนะนำระหว่างรอ Org Admin อนุมัติ

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

# 2. Production build verification
npm run build

# 3. Seed test users and sample data
npx tsx prisma/seed.ts
```

# 🎨 Design System & Architecture Specification (`design.md`)
> **Project:** AC Maintenance System (ระบบบริหารจัดการและแจ้งซ่อมเครื่องปรับอากาศ)  
> **Target Framework:** Next.js 16 (App Router) + Tailwind CSS v4 + Prisma 7  
> **Design Philosophy:** Modern Enterprise Utility, Clean, High-Contrast & Mobile-First  

---

## 1. 📌 Executive Summary & Project Vision

ระบบ **AC Maintenance** เป็นแพลตฟอร์มบริหารจัดการและบันทึกประวัติการบำรุงรักษาเครื่องปรับอากาศระดับมหาวิทยาลัย (Multi-tenant Architecture) ออกแบบมารองรับผู้ใช้งาน 3 กลุ่มหลัก ได้แก่ **Super Admin**, **Org Admin (มหาวิทยาลัย)** และ **Technician (ช่างเทคนิค)**

### Key Objectives
1. **Visual Clarity:** แสดงสถานะเครื่องปรับอากาศและใบงานซ่อมบำรุง (Work Orders) ได้ทันทีผ่าน Dashboard ที่เข้าใจง่าย
2. **Field-Optimized UX:** รองรับการใช้งานของช่างเทคนิคบนสมาร์ทโฟนแบบ Mobile-First (สแกน QR Code, กดรับงาน, บันทึกการซ่อม)
3. **Data Integrity & Multi-Tenancy:** แยกขอบเขตข้อมูลของแต่ละมหาวิทยาลัยอย่างเด็ดขาด (`university_id`)
4. **Fast & Responsive:** โหลดรวดเร็ว ใช้งานง่ายด้วยโทนสีที่สบายตา มี Hierarchy ชัดเจน

---

## 2. 🎨 Design Aesthetics & Visual Tokens

### 2.1 Color Palette (โทนสีสถาปัตยกรรม)
เน้นโทนสีสดใสที่สะท้อนถึงความเย็น ความสะอาด และความน่าเชื่อถือทางวิศวกรรม

* **Primary (Cooling Teal & Ice Blue):**
  * `Primary 600`: `#0284C7` (Sky Blue - ปุ่มหลัก / Header Highlights)
  * `Primary 500`: `#0EA5E9` (Cyan Accent - Active State / Interactive Elements)
  * `Primary 50`: `#F0F9FF` (Background Highlight / Soft Badge)
* **Neutral Surface (Dark/Light Balance):**
  * `Surface Canvas`: `#F8FAFC` (Light Background) / `#0F172A` (Dark Background)
  * `Card Surface`: `#FFFFFF` / `#1E293B` (Elevated Cards with subtle border)
  * `Text Main`: `#0F172A` / `#F8FAFC` (High contrast readability)
  * `Text Muted`: `#64748B` / `#94A3B8` (Sub-headers & Labels)
* **Status Colors (การแสดงสถานะที่ชัดเจน):**
  * 🟢 **Normal / Completed:** `#10B981` (Emerald Green) - แอร์ปกติ / งานเสร็จสิ้น
  * 🟡 **Needs Cleaning / Pending:** `#F59E0B` (Amber Gold) - ครบกำหนดล้าง / รอช่างรับงาน
  * 🔴 **Broken / Critical:** `#EF4444` (Coral Red) - เครื่องเสีย / แจ้งซ่อมด่วน
  * 🔵 **Claimed / In-Progress:** `#6366F1` (Indigo) - ช่างรับงานแล้ว กำลังซ่อม

---

### 2.2 Typography (แบบอักษร)
* **Font Family:** `Noto Sans Thai` (Google Fonts), `Inter`, sans-serif (รองรับภาษาไทยและอังกฤษอย่างสมบูรณ์ อ่านง่าย สบายตา สวยงามประณีตบนทุกอุปกรณ์)
* **Hierarchy Scale:**
  * `Page Title (H1)`: 28px / SemiBold (Tracking Tight)
  * `Section Header (H2)`: 20px / SemiBold
  * `Card Title (H3)`: 16px / Medium
  * `Body Text`: 14px / Regular (Leading Relaxed)
  * `Caption / Badge`: 12px / Medium (Uppercase Tracking Wider)

---

### 2.3 UI Components & Micro-Interactions
* **Glassmorphism & Clean Borders:** การใช้ Card ที่มีเงาบางเบา (`shadow-sm`) และขอบชัดเจน (`border border-slate-200`)
* **Status Pills:** ป้ายกำกับสถานะหัวมน (Rounded Full) พร้อมจุดไฟ LED Animated Pulse สำหรับงานด่วน
* **Micro-Animations:** Transition Smooth (150ms - 200ms) เมื่อ Hover ปุ่มหรือสลับ Tab

---

## 3. 🏗️ UX Workflows & Role-Based Dashboards

```
                   ┌──────────────────────────────────────┐
                   │             Authentication           │
                   │    /login  /reset-password           │
                   └──────────────────┬───────────────────┘
                                      │
           ┌──────────────────────────┼──────────────────────────┐
           ▼                          ▼                          ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│    /super-admin     │    │       /admin        │    │        /tech        │
│  Platform Overview  │    │  Org Admin Workspace │    │ Technician Workspace│
│ - Universities List │    │ - Dashboard Metrics │    │ - Claim Job Pool    │
│ - Global System Log │    │ - Asset Tree        │    │ - My Claimed Jobs   │
│                     │    │ - Work Order Dispatch│    │ - QR Code Scanner   │
│                     │    │ - User/Tech Status  │    │ - Log Repair Form   │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

### 3.1 Org Admin Workspace (`/admin`)
เน้นการบริหารจัดการ assets และการจ่ายงานช่างในมหาวิทยาลัย
* **Top Metric Cards:**
  * จำนวนแอร์ทั้งหมด (Total Units)
  * แอร์ที่ชำรุด/ต้องล้าง (Broken / Cleaning Due)
  * ใบงานซ่อมบำรุงที่รอช่างรับงาน (Pending Work Orders)
  * จำนวนช่างที่ปฏิบัติงาน (Active Technicians)
* **Asset Hierarchy Tree (โครงสร้างอาคาร):**
  * `University` ➔ `Building` ➔ `Room` ➔ `AirConditioner (acCode)`
* **Work Order Dispatch Center:**
  * ตารางติดตามสถานะงานแบบ Real-time Filter ตามตึก/สถานะ/ประเภทการซ่อม
  * ปุ่มออกใบงานซ่อมด่วน (Create Work Order)

---

### 3.2 Technician Workspace (`/tech`) — Mobile-First Design
ออกแบบมาให้ใช้บนมือถือได้ด้วยมือเดียว สะดวกสำหรับช่างหน้างาน
1. **Tab 1: Job Pool (งานที่เปิดรับซ่อม):**
   * แสดงการ์ดงานซ่อมที่ยังไม่มีผู้รับ (`status: pending`) พร้อมปุ่มกด **"รับงานนี้" (Claim Order)**
2. **Tab 2: My Active Jobs (งานของฉัน):**
   * แสดงงานที่รับมาแล้ว (`status: claimed`)
   * ปุ่มสแกน QR Code หรือปุ่ม **"บันทึกประวัติซ่อม" (Log Action)**
3. **Quick Action: Action Logger Modal / Sheet:**
   * เลือกประเภทงาน: 🧼 ล้างแอร์ (`cleaning`), 🛠️ ซ่อมแซม (`repair`), ❄️ เติมน้ำยาแอร์ (`refill_refrigerant`)
   * ช่องกรอกหมายเหตุ (Notes) และปุ่มยืนยันปิดงาน

---

## 4. 📐 Route Structure & Layout Architecture

```
src/app/
├── (auth)/
│   ├── login/page.tsx               # หน้าล็อกอินแยกตาม Credentials
│   ├── request-password-reset/      # ขอรีเซ็ตรหัสผ่าน
│   └── reset-password/              # ตั้งรหัสผ่านใหม่
├── admin/                           # Org Admin Module (/admin/*)
│   ├── page.tsx                     # Dashboard หลักของ Org Admin
│   ├── assets/                      # จัดการตึก/ห้อง/เครื่องปรับอากาศ
│   ├── work-orders/                 # จัดการและติดตามใบงานซ่อม
│   └── users/                       # จัดการผู้ใช้งานและช่างซ่อม
├── tech/                            # Technician Module (/tech/*)
│   ├── page.tsx                     # Mobile Pool & My Jobs
│   ├── scan/                        # หน้าสแกน QR Code สำหรับช่าง
│   └── history/                     # ประวัติงานที่ช่างเคยทำสำเร็จ
└── api/                             # Route Handlers / Actions Validation
```

---

## 5. ♿ Accessibility & Responsive Specs

1. **Responsive Breakpoints:**
   * Mobile (< 640px): Bottom Navigation Bar สำหรับช่าง, Single Column Card Stack
   * Tablet (640px - 1024px): 2-Column Dashboard Grid
   * Desktop (> 1024px): Collapsible Sidebar Navigation, 4-Column Metric Grid, Full Data Table
2. **WCAG Compliance:**
   * Contrast ratio ของตัวหนังสือบน Background เกิน 4.5:1
   * มี `aria-label` และ Support การใช้ Keyboard Tab Navigation ในทุก Form และ Modal
   * ไม่ใช้สีเพียงอย่างเดียวในการระบุสถานะ (มี Icon + Text ควบคู่เสมอ)

---

## 6. 🚀 Next Steps & Implementation Roadmap

1. **Phase 1: Shell & Components Setup** (ทำ App Shell, Theme, Navigation, Header, Reusable Badge/Button)
2. **Phase 2: Org Admin Dashboard (`/admin`)** (หน้าสรุป Metrics, Table แสดง Work Orders, Asset Tree)
3. **Phase 3: Technician Interface (`/tech`)** (Mobile Navigation, Job Pool Cards, Claim & Repair Form Sheet)
4. **Phase 4: Verification & Polish** (สอบทานการทำงานของ Server Actions, Responsive & User Experience)

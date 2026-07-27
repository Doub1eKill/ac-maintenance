# 🎨 Design System & Architecture Specification (`DESIGN.md`)
> **Project:** AC Maintenance System (ระบบบริหารจัดการและแจ้งซ่อมเครื่องปรับอากาศ มหาวิทยาลัย)  
> **Visual Reference:** ReUI Design System & Executive SaaS Dashboard (BizLink Aesthetic Specification)  
> **Target Framework:** Next.js 16 (App Router) + Tailwind CSS v4 + Prisma 7 + ReUI / shadcn  
> **Design Philosophy:** Warm Off-White Minimalist, Executive Kanban Grid, High Contrast & User-Friendly  

---

## 1. 📌 Executive Summary & Visual Direction

ระบบ **AC Maintenance** ได้รับการปรับปรุงสถาปัตยกรรม UI/UX ให้ตรงตามแรงบันดาลใจจากแดชบอร์ด **BizLink Executive SaaS** (เน้นความสะอาด โปร่ง สบายตา และมี Hierarchy ระดับพรีเมียม)

### Key Design Pillars
1. **Clean White Canvas (`#ffffff`):** พื้นหลังโทนสว่างสะอาดตา เน้นความคลีนแบบ Modern
2. **Elevated White Cards & Dark Highlight Card:** การ์ดสีขาวสะอาดสะอ้าน (`#ffffff`) พร้อมขอบบาง (`border-slate-200/80`) และการ์ดเน้นไฮไลท์โทนเข้ม (`#18181b` Dark High-Contrast Card)
3. **Left Sidebar Navigation:** เมนูแนวตั้งด้านซ้ายจัดเรียงหมวดหมู่ชัดเจน พร้อมสถิติจำนวนย่อย
4. **Analytic Widgets & Kanban Status Grid:** ด้านบนแสดงกราฟแท่งสถิติรายสัปดาห์ (Weekly Bar Chart) ร่วมกับมาตรวัดความสมบูรณ์ (Progress Gauge) และเรียงลำดับการ์ดแอร์/ใบงานซ่อมตาม Kanban Columns (`Pending`, `Claimed`, `Completed`)

---

## 2. 🎨 Design Aesthetics & Visual Tokens

### 2.1 Color Palette (โทนสีระบบ)

* **Canvas & Surface (พื้นหลังและพื้นที่ใช้งาน):**
  * `Canvas Background`: `#ffffff` (Pure White)
  * `Sidebar & Top Bar`: `#ffffff` (Pure Crisp White)
  * `Card Surface`: `#ffffff` (Elevated White with `border border-slate-200/80` & `shadow-sm`)
  * `Highlight Surface`: `#18181b` (Dark Slate / Charcoal Card for Active/Selected Items)
* **Typography Colors:**
  * `Heading Text`: `#09090b` (Deep Charcoal / Black)
  * `Body Text`: `#27272a` (Slate 800)
  * `Sub-text / Muted`: `#71717a` (Slate 500)
* **Status Badges & Indicators:**
  * 🟢 **Completed / Healthy:** `#10b981` (Emerald Green)
  * 🟡 **Pending / Cleaning Due:** `#f59e0b` (Amber Gold)
  * 🔴 **Broken / Urgent:** `#ef4444` (Coral Red)
  * 🔵 **Claimed / In-Progress:** `#0284c7` (Sky Blue)

---

## 2.2 Typography & Hierarchy

* **Font Family:** `Noto Sans Thai`, `Inter`, sans-serif
* **Hierarchy:**
  * `Header H1`: 24px / Bold / `tracking-tight`
  * `Section Title H2`: 18px / SemiBold
  * `Card Title H3`: 15px / Bold / `#09090b`
  * `Body Text`: 13px / Regular / `#27272a`
  * `Metadata / Pill`: 11px / SemiBold / `#71717a`

---

## 3. 🏗️ Layout Structure (BizLink Layout Pattern)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Left Sidebar   │ Top Search Bar: Search AC/WorkOrder... [Sort] [Filters] [+New] │
│                ├─────────────────────────────────────────────────────────────┤
│ - Dashboard    │ Analytic Banner: [Weekly Chart] [Gauge 92%] [Key Metrics]  │
│ - Work Orders  ├─────────────────────────────────────────────────────────────┤
│ - Asset Tree   │ Kanban Status Columns:                                      │
│ - Techs        │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│ - Settings     │ │ Pending (12) │ │ Claimed (17) │ │Completed (13)│          │
│                │ ├──────────────┤ ├──────────────┤ ├──────────────┤          │
│ Projects       │ │ Card 1       │ │ Card 1       │ │ Card 1       │          │
│ Members        │ │ Card 2       │ │ [DARK CARD]  │ │ Card 2       │          │
│ [Logout]       │ └──────────────┘ └──────────────┘ └──────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. 📐 Role-Based View Architecture

1. **Super Admin Dashboard (`/super-admin`)**:
   - แดชบอร์ดบริหารส่วนกลาง ควบคุมรายชื่อมหาวิทยาลัยและศูนย์อนุมัติสิทธิ์บัญชีผู้ใช้ใหม่
2. **Org Admin Dashboard (`/admin`)**:
   - แดชบอร์ดประจำสถาบัน แสดงกราฟแอร์รายสัปดาห์, มาตรวัดความสมบูรณ์ของแอร์ (Fleet Health Gauge), คลังจ่ายงานซ่อม (Work Order Kanban Columns) และผังอาคาร (Asset Tree)
3. **Technician Workspace (`/tech`)**:
   - หน้าจอช่างซ่อมบนมือถือแบบสว่าง สบายตา สแกน QR Code และกดรับงานจาก Job Pool ได้ด้วยมือเดียว

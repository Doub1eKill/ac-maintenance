# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Org Admin (ผู้ดูแลระบบระดับมหาวิทยาลัย/คณะ):** ผู้บริหารจัดการสินทรัพย์ (เครื่องปรับอากาศ, อาคาร, ห้อง) ควบคุม ออกใบงานซ่อมบำรุง (Work Order Dispatching) และติดตามสถานะภาพรวมของมหาวิทยาลัย
- **Technician (ช่างเทคนิคซ่อมบำรุง):** ช่างปฏิบัติงานซ่อมบำรุงหน้างาน ใช้งานผ่านสมาร์ทโฟน (Mobile-first UI) เพื่อสแกน QR Code กดรับงานซ่อม และบันทึกประวัติการซ่อมบำรุง
- **Super Admin (ผู้ดูแลระบบส่วนกลางระดับแพลตฟอร์ม):** ผู้ดูแลระบบระดับสูงสุด จัดการข้อมูลมหาวิทยาลัย สิทธิ์ผู้ใช้งาน และภาพรวมระบบ Multi-tenant

## Product Purpose
ระบบบริหารจัดการและบันทึกประวัติการบำรุงรักษาเครื่องปรับอากาศระดับมหาวิทยาลัย (AC Maintenance Platform) เพื่อเพิ่มความโปร่งใส ควบคุมขั้นตอนการแจ้งซ่อม และอำนวยความสะดวกให้ช่างเทคนิคปฏิบัติงานหน้างานได้อย่างรวดเร็ว แม่นยำ และมีประสิทธิภาพ

## Positioning
ระบบซ่อมบำรุงเครื่องปรับอากาศที่รองรับ Multi-tenant แยกขอบเขตข้อมูลรายมหาวิทยาลัยอย่างเด็ดขาด (`university_id`) พร้อมการออกแบบ UX/UI แยกตามบทบาทผู้ใช้โดยเฉพาะ เน้น Mobile-First Workflow สำหรับช่างเทคนิคที่สามารถใช้งานได้สะดวกด้วยมือเดียวขณะปฏิบัติงานหน้างาน

## Operating Context
- **สภาพแวดล้อมหน้างาน (Field Environment):** ช่างเทคนิคทำงานในสถานที่จริง ต้องสแกน QR Code บนตัวเครื่องปรับอากาศด้วยมือถือ และบันทึกงานซ่อมขณะเคลื่อนไหว
- **โครงสร้างสินทรัพย์ (Asset Hierarchy):** การจัดเก็บและอ้างอิงข้อมูลแบบลำดับขั้น `University` ➔ `Building` ➔ `Room` ➔ `AirConditioner` (`acCode`)
- **การจ่ายงานซ่อมบำรุง (Work Order Dispatch):** การติดตามสถานะใบงานแบบ Real-time ตั้งแต่เปิดแจ้งซ่อม (`pending`) ช่างรับงาน (`claimed`) กำลังดำเนินการ (`in_progress`) จนถึงปิดงาน (`completed`)

## Capabilities and Constraints
- **Tech Stack:** Next.js 16 (App Router), Tailwind CSS v4, Prisma 7 (`@prisma/adapter-mariadb`), NextAuth v5, React 19
- **Role-Based Access Control (RBAC):** สิทธิ์การเข้าถึงแยกตามเส้นทาง `/super-admin/*`, `/admin/*`, `/tech/*` และมีการตรวจ authorization ซ้ำใน Server Actions / Route Handlers
- **Multi-Tenant Boundary:** แยกขอบเขตข้อมูลรายมหาวิทยาลัยด้วย `university_id` อย่างเด็ดขาด ป้องกันการเข้าถึงข้ามหน่วยงาน
- **Authentication Rules:** ผู้ใช้ที่ไม่มี password (`password: null`) จะต้องรีเซ็ตรหัสผ่านก่อนเข้าใช้งาน และผู้ใช้ที่มีสถานะไม่ใช่ `active` จะถูกบล็อกการเข้าถึงระบบ

## Brand Commitments
- **ชื่อผลิตภัณฑ์:** AC Maintenance System (ระบบบริหารจัดการและแจ้งซ่อมเครื่องปรับอากาศ)
- **ภาพลักษณ์:** Modern Enterprise Utility, Clean, High-Contrast & Professional
- **โทนสีหลัก:** Cooling Teal & Ice Blue (`#0284C7`, `#0EA5E9`) สื่อถึงความเย็น ความสะอาด และความน่าเชื่อถือทางวิศวกรรม

## Evidence on Hand
- ข้อกำหนดสถาปัตยกรรมและระบบดีไซน์ใน [DESIGN.md](file:///c:/Users/LENOVO/OneDrive%20-%20Phuket%20Rajabhat%20University/Study/%E0%B8%9B%E0%B8%B5_3/Project/ac-maintenance/DESIGN.md)
- โครงสร้างแอปพลิเคชันและฐานข้อมูลที่มีอยู่ใน repository (`src/app/`, `prisma/schema.prisma`)

## Product Principles
1. **Field-First Utility:** ออกแบบอินเทอร์เฟซสำหรับช่างเทคนิคให้ใช้งานง่าย กระชับ ปุ่มกดชัดเจน และรองรับการใช้บนมือถือด้วยมือเดียว
2. **Strict Multi-Tenant Boundary:** แยกข้อมูลของแต่ละมหาวิทยาลัยผ่าน `university_id` อย่างเด็ดขาด ป้องกันการเข้าถึงข้ามหน่วยงาน
3. **Visual Clarity & Instant Status:** สื่อสารสถานะของแอร์และใบงานอย่างชัดเจนด้วย Contrast สูง มี Indicator สีและข้อความกำกับเสมอ
4. **Complete Maintenance History:** ทุกกิจกรรมการซ่อมบำรุง (ล้างแอร์, ซ่อมแซม, เติมน้ำยา) ต้องบันทึกย้อนหลังได้อย่างแม่นยำและตรวจสอบได้

## Accessibility & Inclusion
- รองรับมาตรฐาน WCAG 2.1 AA (Contrast Ratio ตัวหนังสือกับพื้นหลังอย่างน้อย 4.5:1)
- มีจุดสังเกตสถานะด้วย Icon + Text คู่กันเสมอ ไม่ใช้สีเพียงอย่างเดียวในการสื่อความหมาย
- รองรับชุดแบบอักษรภาษาไทยและภาษาอังกฤษ (`Noto Sans Thai`, `Inter`) อย่างสมบูรณ์ อ่านง่าย สบายตาบนทุกหน้าจอ

# Enterprise SaaS Design: Hybrid Operational & Compliance (AC Maintenance)

## 1. Overview
This design combines "Operational Excellence" for technicians with "Enterprise Compliance" for management. It introduces Preventive Maintenance, advanced QR scanning flows, Offline-First PWA capabilities, Immutable Audit Logging, Analytics (MTTR/Costing), **Evidence Verification (Photos/Signatures), and Automated Notifications.**

## 2. Architecture & Data Models (Prisma)

### 2.1 Audit & Compliance (Enterprise Focus)
To satisfy enterprise requirements, every critical action (create/update/delete on Work Orders, ACs, Users) must be logged immutably.
- **Model: `SystemAuditLog`**
  - `id`: BigInt
  - `universityId`: BigInt (For tenant isolation)
  - `userId`: BigInt (Who did it)
  - `action`: String (e.g., 'WORK_ORDER_COMPLETED', 'AC_STATUS_CHANGED')
  - `entityType`: String (e.g., 'WorkOrder', 'AirConditioner')
  - `entityId`: BigInt
  - `oldValues`: Json?
  - `newValues`: Json?
  - `ipAddress`: String?
  - `createdAt`: DateTime
- **Soft Deletion Strategy**: Update critical models (`AirConditioner`, `User`) to include `deletedAt: DateTime?`. Enterprise systems rarely hard-delete records.

### 2.2 Preventive Maintenance (Operational Focus)
Moving from Break-Fix to Proactive Maintenance.
- **Model: `MaintenanceSchedule`**
  - `id`: BigInt
  - `airConditionerId`: BigInt
  - `frequencyMonths`: Int (e.g., 6 for every 6 months)
  - `lastPerformedAt`: DateTime?
  - `nextDueDate`: DateTime
  - `isActive`: Boolean

### 2.3 Asset Costing & MTTR (Analytics Focus)
Track time-to-repair and costs.
- **Update to `WorkOrder`:**
  - Add `completedAt`: DateTime? (To calculate MTTR: `completedAt - createdAt`)
  - Add `estimatedCost`: Decimal? (For asset cost analysis)

### 2.4 Evidence & Verification (Accountability Focus)
Real businesses require proof of work.
- **Update to `MaintenanceLog`:**
  - Add `beforePhotoUrl`: String?
  - Add `afterPhotoUrl`: String?
  - Add `customerSignatureUrl`: String? (E-Signature captured on mobile)

## 3. PWA, Offline Support & Communication Strategy
Technicians often work in areas with poor connectivity (basements, roofs).
- **Service Worker (Next.js PWA):** Cache static assets and app shell.
- **Offline Data Sync:** 
  - When a technician claims or completes a work order offline, the mutation is saved in IndexedDB (using a library like `idb`).
  - A background online listener pushes the queued mutations to the server once the network is restored.
  - Read operations (QR Scan -> AC History) cache the last known state.
- **Automated Notifications (LINE OA / Webhook):**
  - Send instant alerts to Org Admins when an SLA is breached or a Work Order is marked complete.

## 4. Advanced QR Workflow
- When a technician scans the physical QR code on the AC:
  1. The mobile app routes to `/tech/ac/[qrCode]`.
  2. The page fetches `AirConditioner` details AND past `MaintenanceLogs`.
  3. Displays a prominent "Create Work Order" or "Complete Scheduled Maintenance" button.
  4. Shows breakdown frequency to warn the technician of recurring issues.

## 5. Recommended Implementation Order
Since this is a large enterprise update, it should be implemented in phases:
- **Phase 1:** Database Schema Updates (AuditLog, MaintenanceSchedule, Soft Deletes, Evidence Fields) + API changes.
- **Phase 2:** PWA setup, Offline Sync logic, and Camera Integration for Technicians (Mobile UI).
- **Phase 3:** Analytics Dashboard for Org Admin (MTTR, Cost, Audit Log UI) and Notification Integrations.

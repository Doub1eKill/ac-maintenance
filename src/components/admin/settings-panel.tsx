"use client";

import { useState } from "react";
import { Clock, Building2, History, Wind, AlertTriangle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { MasterDataClient, type BrandType } from "@/app/admin/master-data/master-data-client";

interface SettingsPanelProps {
  brands: BrandType[];
  universityName: string;
}

// Shared by every card whose "save" action has no backend to persist to
// yet — see docs/superpowers/specs/2026-08-16-org-admin-system-settings-page-design.md
// Section 0. The corresponding backend request is logged in HANDOFF.md (S4/S5/S6).
function NotConnectedAlert() {
  return (
    <Alert className="border-warning/30 bg-warning/10">
      <AlertTriangle className="text-warning" />
      <AlertTitle>ยังไม่เชื่อมต่อกับระบบหลังบ้าน</AlertTitle>
      <AlertDescription>
        มีการฝากคำขอไว้ให้ทีม Backend แล้ว การเปลี่ยนแปลงนี้ยังไม่ถูกบันทึก
      </AlertDescription>
    </Alert>
  );
}

export function SettingsPanel({ brands, universityName }: SettingsPanelProps) {
  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in">
      <DefaultFrequencyCard />
      <OrganisationInfoCard universityName={universityName} />
      <MasterDataCard brands={brands} />
      <AuditLogCard />
    </div>
  );
}

function DefaultFrequencyCard() {
  const [value, setValue] = useState("6");
  const [unit, setUnit] = useState("months");
  const [showNotice, setShowNotice] = useState(false);

  return (
    <div className="biz-card p-6 space-y-4">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" />
        รอบซ่อมบำรุงเริ่มต้น
      </h3>
      <p className="text-xs text-muted-foreground">
        ใช้เป็นค่าเริ่มต้นเมื่อเพิ่มเครื่องปรับอากาศใหม่เข้าระบบ มีผลกับเครื่องที่เพิ่มใหม่เท่านั้น
        ไม่กระทบเครื่องที่มีรอบตั้งไว้แล้ว
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label htmlFor="default-frequency-value" className="mb-1.5 block text-xs font-bold text-foreground">
            จำนวน
          </label>
          <input
            id="default-frequency-value"
            type="number"
            min={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="default-frequency-unit" className="mb-1.5 block text-xs font-bold text-foreground">
            หน่วย
          </label>
          <NativeSelect id="default-frequency-unit" value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full h-auto py-3 px-3.5 rounded-xl border-border text-sm text-foreground">
            <NativeSelectOption value="days">วัน</NativeSelectOption>
            <NativeSelectOption value="months">เดือน</NativeSelectOption>
            <NativeSelectOption value="years">ปี</NativeSelectOption>
          </NativeSelect>
        </div>
      </div>

      {showNotice && <NotConnectedAlert />}

      <button
        type="button"
        onClick={() => setShowNotice(true)}
        className="w-full sm:w-auto rounded-xl bg-foreground px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90 transition-colors"
      >
        บันทึก
      </button>
    </div>
  );
}

function OrganisationInfoCard({ universityName }: { universityName: string }) {
  const [name, setName] = useState(universityName);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [showNotice, setShowNotice] = useState(false);

  return (
    <div className="biz-card p-6 space-y-4">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" />
        ข้อมูลองค์กร
      </h3>

      <div className="space-y-4">
        <div>
          <label htmlFor="org-name" className="mb-1.5 block text-xs font-bold text-foreground">
            ชื่อหน่วยงาน
          </label>
          <input
            id="org-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
          />
        </div>
        <div>
          <label htmlFor="org-address" className="mb-1.5 block text-xs font-bold text-foreground">
            ที่อยู่
          </label>
          <input
            id="org-address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="ยังไม่ได้ระบุ"
            className="w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
          />
        </div>
        <div>
          <label htmlFor="org-phone" className="mb-1.5 block text-xs font-bold text-foreground">
            เบอร์โทร
          </label>
          <input
            id="org-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="ยังไม่ได้ระบุ"
            className="w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
          />
        </div>
      </div>

      {showNotice && <NotConnectedAlert />}

      <button
        type="button"
        onClick={() => setShowNotice(true)}
        className="w-full sm:w-auto rounded-xl bg-foreground px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90 transition-colors"
      >
        บันทึก
      </button>
    </div>
  );
}

function MasterDataCard({ brands }: { brands: BrandType[] }) {
  const totalModels = brands.reduce((sum, b) => sum + b.modelsCount, 0);

  return (
    <div className="biz-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Wind className="h-4 w-4 text-primary" />
          จัดการยี่ห้อ/รุ่นแอร์
        </h3>
        <span className="text-xs font-bold text-muted-foreground">
          {brands.length} ยี่ห้อ • {totalModels} รุ่น
        </span>
      </div>
      <MasterDataClient initialBrands={brands} />
    </div>
  );
}

function AuditLogCard() {
  return (
    <div className="biz-card p-6 space-y-4">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <History className="h-4 w-4 text-primary" />
        ประวัติการใช้งานระบบ
      </h3>
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
        <History className="h-6 w-6 text-muted-foreground" />
        <p className="text-xs text-muted-foreground max-w-xs">
          ประวัติการใช้งานระบบจะแสดงที่นี่ เมื่อ Backend เปิดให้ดึงข้อมูลจากตาราง audit log
        </p>
      </div>
    </div>
  );
}

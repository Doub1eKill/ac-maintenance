"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Clock, Building2, History, Wind, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { MasterDataClient, type BrandType } from "@/app/admin/master-data/master-data-client";
import type { CustomUnitGroup } from "@/lib/admin/custom-unit-groups";
import {
  updateDefaultFrequencyAction,
  updateOrganisationInfoAction,
  getAuditLogs,
} from "@/app/admin/actions";

interface SettingsPanelProps {
  brands: BrandType[];
  customUnitGroups: CustomUnitGroup[];
  organisationInfo: { name: string; address: string | null; phone: string | null };
  defaultFrequency: { value: number; unit: string };
}

export function SettingsPanel({ brands, customUnitGroups, organisationInfo, defaultFrequency }: SettingsPanelProps) {
  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in">
      <DefaultFrequencyCard defaultFrequency={defaultFrequency} />
      <OrganisationInfoCard organisationInfo={organisationInfo} />
      <MasterDataCard brands={brands} customUnitGroups={customUnitGroups} />
      <AuditLogCard />
    </div>
  );
}

function DefaultFrequencyCard({ defaultFrequency }: { defaultFrequency: { value: number; unit: string } }) {
  const [value, setValue] = useState(String(defaultFrequency.value));
  const [unit, setUnit] = useState(defaultFrequency.unit);
  const [isSaving, startSaveTransition] = useTransition();

  function handleSave() {
    const numericValue = parseInt(value, 10);
    if (!numericValue || numericValue <= 0) {
      toast.error("รอบบำรุงรักษาต้องมากกว่า 0");
      return;
    }
    startSaveTransition(async () => {
      const res = await updateDefaultFrequencyAction(numericValue, unit);
      if (res.error) toast.error(res.error);
      else toast.success("บันทึกรอบซ่อมบำรุงเริ่มต้นสำเร็จ");
    });
  }

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

      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className="w-full sm:w-auto rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {isSaving ? "กำลังบันทึก..." : "บันทึก"}
      </button>
    </div>
  );
}

function OrganisationInfoCard({
  organisationInfo,
}: {
  organisationInfo: { name: string; address: string | null; phone: string | null };
}) {
  const [name, setName] = useState(organisationInfo.name);
  const [address, setAddress] = useState(organisationInfo.address ?? "");
  const [phone, setPhone] = useState(organisationInfo.phone ?? "");
  const [isSaving, startSaveTransition] = useTransition();

  function handleSave() {
    if (!name.trim()) {
      toast.error("กรุณาระบุชื่อหน่วยงาน");
      return;
    }
    startSaveTransition(async () => {
      const res = await updateOrganisationInfoAction(name, address, phone);
      if (res.error) toast.error(res.error);
      else toast.success("บันทึกข้อมูลองค์กรสำเร็จ");
    });
  }

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

      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className="w-full sm:w-auto rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {isSaving ? "กำลังบันทึก..." : "บันทึก"}
      </button>
    </div>
  );
}

function MasterDataCard({ brands, customUnitGroups }: { brands: BrandType[]; customUnitGroups: CustomUnitGroup[] }) {
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
      <MasterDataClient initialBrands={brands} customUnitGroups={customUnitGroups} />
    </div>
  );
}

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues: unknown;
  newValues: unknown;
  createdAt: string;
  userName: string;
}

function AuditLogCard() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // A filter change goes back to page 1 in the same render it arrives in
  // (React's "adjust state on change" form), so the fetch below never sees
  // the new filter with the old page.
  const [filterForPage, setFilterForPage] = useState(actionFilter);
  if (filterForPage !== actionFilter) {
    setFilterForPage(actionFilter);
    setPage(1);
  }

  // Loading is "the page/filter shown is not the one loaded yet" — derived,
  // rather than a flag flipped from inside the effect.
  const wanted = `${page}|${actionFilter}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const isLoading = loadedKey !== wanted;

  useEffect(() => {
    let cancelled = false;

    getAuditLogs({ page, action: actionFilter || undefined }).then((result) => {
      if (cancelled) return;
      setLogs(result.logs);
      setAvailableActions((prev) => (result.availableActions.length ? result.availableActions : prev));
      setTotalPages(Math.max(1, Math.ceil(result.page.total / result.page.pageSize)));
      setError(result.error ?? null);
      setLoadedKey(`${page}|${actionFilter}`);
    });

    return () => {
      cancelled = true;
    };
  }, [page, actionFilter]);

  return (
    <div className="biz-card p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          ประวัติการใช้งานระบบ
        </h3>
        {availableActions.length > 0 && (
          <NativeSelect
            value={actionFilter}
            aria-label="กรองประวัติตามประเภท"
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full sm:w-auto h-auto py-2 px-3 rounded-lg border-border text-xs font-bold text-foreground"
          >
            <NativeSelectOption value="">ทุกประเภท</NativeSelectOption>
            {availableActions.map((a) => (
              <NativeSelectOption key={a} value={a}>{a}</NativeSelectOption>
            ))}
          </NativeSelect>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดข้อมูล...
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTitle>โหลดข้อมูลไม่สำเร็จ</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
          <History className="h-6 w-6 text-muted-foreground" />
          <p className="text-xs text-muted-foreground max-w-xs">ไม่พบประวัติการใช้งานระบบ</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="rounded-xl border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-muted transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-foreground truncate">{log.action}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {log.userName} • {log.entityType} #{log.entityId} • {new Date(log.createdAt).toLocaleString("th-TH")}
                  </div>
                </div>
                {expandedId === log.id ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>
              {expandedId === log.id && (
                <div className="px-3.5 pb-3 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-muted">
                  <div>
                    <div className="font-bold text-muted-foreground mb-1">ค่าเดิม</div>
                    <pre className="whitespace-pre-wrap break-words rounded-lg border border-border bg-card p-2 text-foreground">
                      {log.oldValues ? JSON.stringify(log.oldValues, null, 2) : "-"}
                    </pre>
                  </div>
                  <div>
                    <div className="font-bold text-muted-foreground mb-1">ค่าใหม่</div>
                    <pre className="whitespace-pre-wrap break-words rounded-lg border border-border bg-card p-2 text-foreground">
                      {log.newValues ? JSON.stringify(log.newValues, null, 2) : "-"}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!isLoading && !error && totalPages > 1 && (
        <div className="pt-2">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }}
                  className={page === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="text-xs font-medium text-muted-foreground px-4">
                  หน้า {page} จาก {totalPages}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)); }}
                  className={page === totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}

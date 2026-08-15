"use client";

import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import {
  Building2, Plus, ChevronDown, ChevronUp, X, QrCode, CalendarClock, Printer, Clock
} from "lucide-react";
import { createBuildingAction, createRoomAction, createAirConditionerAction, saveMaintenanceScheduleAction } from "@/app/admin/actions";
import { QRCodeSVG } from "qrcode.react";
import { AcHistoryModal } from "@/components/admin/ac-history-modal";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface ACUnit {
  id: string;
  acCode: string;
  brand: string;
  model: string | null;
  btu: number | null;
  status: string;
  qrCode: string;
  maintenanceSchedule: {
    frequencyValue: number;
    frequencyUnit: string;
    nextDueDate: string;
  } | null;
}

interface RoomItem {
  id: string;
  name: string;
  floor: number | null;
  acUnits: ACUnit[];
}

interface BuildingItem {
  id: string;
  name: string;
  abbreviation: string;
  unitsCount: number;
  rooms: RoomItem[];
}

interface BrandItem {
  id: string;
  name: string;
  models: {
    id: string;
    name: string;
    defaultBtu: number | null;
  }[];
}

interface AssetManagerProps {
  buildings: BuildingItem[];
  brands: BrandItem[];
  globalSearch: string;
}

export function AssetManager({ buildings, brands, globalSearch }: AssetManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [expandedBuilding, setExpandedBuilding] = useState<string | null>(buildings[0]?.id || null);
  
  // Modals state
  const [showAddBuilding, setShowAddBuilding] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState<{ buildingId: string } | null>(null);
  const [showAddAc, setShowAddAc] = useState<{ roomId: string } | null>(null);
  const [showPmSettings, setShowPmSettings] = useState<ACUnit | null>(null);
  const [showQrCode, setShowQrCode] = useState<ACUnit | null>(null);
  const [showHistoryFor, setShowHistoryFor] = useState<string | null>(null);

  // AC Form state
  const [acBrandType, setAcBrandType] = useState<"master" | "other">("master");
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");

  const [buildingsPage, setBuildingsPage] = useState(1);
  const BUILDINGS_PER_PAGE = 5;

  useEffect(() => {
    setBuildingsPage(1);
  }, [globalSearch]);

  const filteredBuildings = buildings.map((b) => {
    if (!globalSearch.trim()) return b;
    const s = globalSearch.toLowerCase();
    const matchesBuilding = b.name.toLowerCase().includes(s) || b.abbreviation.toLowerCase().includes(s);

    const matchingRooms = b.rooms.filter((r) => {
      return r.name.toLowerCase().includes(s);
    });

    if (matchesBuilding || matchingRooms.length > 0) {
      return {
        ...b,
        rooms: matchingRooms.length > 0 ? matchingRooms : b.rooms,
      };
    }
    return null;
  }).filter(Boolean) as BuildingItem[];

  const totalBuildingsPages = Math.ceil(filteredBuildings.length / BUILDINGS_PER_PAGE);
  const paginatedBuildings = filteredBuildings.slice((buildingsPage - 1) * BUILDINGS_PER_PAGE, buildingsPage * BUILDINGS_PER_PAGE);

  async function handleAddBuilding(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createBuildingAction(formData);
      if (res.error) toast.error(res.error);
      else {
        setShowAddBuilding(false);
        toast.success("เพิ่มอาคารสำเร็จ");
      }
    });
  }

  async function handleAddRoom(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (showAddRoom) formData.append("buildingId", showAddRoom.buildingId);
    startTransition(async () => {
      const res = await createRoomAction(formData);
      if (res.error) toast.error(res.error);
      else {
        setShowAddRoom(null);
        toast.success("เพิ่มห้องสำเร็จ");
      }
    });
  }

  async function handleAddAc(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (showAddAc) formData.append("roomId", showAddAc.roomId);
    formData.append("brandType", acBrandType);

    startTransition(async () => {
      const res = await createAirConditionerAction(formData);
      if (res.error) toast.error(res.error);
      else {
        setShowAddAc(null);
        toast.success("ลงทะเบียนแอร์สำเร็จ");
      }
    });
  }

  async function handleSavePmSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (showPmSettings) formData.append("airConditionerId", showPmSettings.id);

    startTransition(async () => {
      const res = await saveMaintenanceScheduleAction(formData);
      if (res.error) toast.error(res.error);
      else {
        setShowPmSettings(null);
        toast.success("บันทึกรอบการล้างแอร์สำเร็จ");
      }
    });
  }

  const selectedBrand = brands.find(b => b.id === selectedBrandId);

  return (
    <div className="biz-card p-6 space-y-5 animate-in fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border pb-4 gap-4">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Building2 className="h-5 w-5 text-foreground" />
          <span>โครงสร้างสินทรัพย์ ({buildings.length} อาคาร)</span>
        </h2>
        <button
          onClick={() => setShowAddBuilding(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-xs font-bold text-white hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> เพิ่มอาคาร
        </button>
      </div>

      <div className="space-y-3">
        {paginatedBuildings.map((b) => (
          <div key={b.id} className="rounded-2xl border border-border bg-muted overflow-hidden">
            <div className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary transition-colors cursor-pointer" onClick={() => setExpandedBuilding(expandedBuilding === b.id ? null : b.id)}>
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white font-mono text-xs font-bold">
                  {b.abbreviation}
                </span>
                <div>
                  <h3 className="font-bold text-foreground text-sm">{b.name}</h3>
                  <p className="text-xs text-muted-foreground">{b.rooms.length} ห้อง • {b.unitsCount} แอร์</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowAddRoom({ buildingId: b.id }); }}
                  className="inline-flex items-center gap-1 rounded-md bg-white border border-border px-2 py-1 text-[11px] font-bold text-foreground hover:bg-muted shadow-sm transition-colors"
                >
                  <Plus className="h-3 w-3" /> เพิ่มห้อง
                </button>
                <span className="text-muted-foreground font-bold">
                  {expandedBuilding === b.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </span>
              </div>
            </div>

            {expandedBuilding === b.id && (
              <div className="border-t border-border bg-white p-4 space-y-3">
                {b.rooms.map((r) => (
                  <div key={r.id} className="rounded-xl border border-border p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-foreground border-b border-border pb-2">
                      <span>ห้อง {r.name} (ชั้น {r.floor || 1})</span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground font-normal">{r.acUnits.length} แอร์</span>
                        <button
                          onClick={() => setShowAddAc({ roomId: r.id })}
                          className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary border border-primary/20 px-2 py-1 text-[10px] uppercase font-bold hover:bg-primary/20 transition-colors"
                        >
                          <Plus className="h-3 w-3" /> ลงทะเบียนแอร์
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {r.acUnits.map((ac) => (
                        <div key={ac.id} className="rounded-lg border border-border bg-muted p-3 text-xs flex flex-col gap-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-mono font-bold text-foreground text-sm">{ac.acCode}</div>
                              <div className="text-[11px] text-muted-foreground mt-0.5">{ac.brand} {ac.model ? `• ${ac.model}` : ""}</div>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-success/20 text-success-foreground border border-success/30 whitespace-nowrap">
                              {ac.status}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 pt-2 border-t border-border">
                            <button
                              onClick={() => setShowPmSettings(ac)}
                              className="flex-1 rounded border border-border bg-white py-1.5 text-[10px] font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-center"
                            >
                              {ac.maintenanceSchedule ? `ล้างทุก ${ac.maintenanceSchedule.frequencyValue} ${ac.maintenanceSchedule.frequencyUnit === 'days' ? 'วัน' : ac.maintenanceSchedule.frequencyUnit === 'months' ? 'เดือน' : 'ปี'}` : 'ตั้งค่าล้างแอร์'}
                            </button>
                            <button
                              onClick={() => setShowQrCode(ac)}
                              className="flex-1 rounded border border-border bg-white py-1.5 text-[10px] font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-center"
                            >
                              QR Code
                            </button>
                            <button
                              onClick={() => setShowHistoryFor(ac.id)}
                              className="flex-1 inline-flex items-center justify-center gap-1 rounded border border-border bg-white py-1.5 text-[10px] font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-center"
                            >
                              <Clock className="h-3 w-3" /> ดูประวัติ
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {totalBuildingsPages > 1 && (
        <div className="py-4 border-t border-border mt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); setBuildingsPage(p => Math.max(1, p - 1)); }} 
                  className={buildingsPage === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="text-xs font-medium text-muted-foreground px-4">
                  หน้า {buildingsPage} จาก {totalBuildingsPages}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); setBuildingsPage(p => Math.min(totalBuildingsPages, p + 1)); }}
                  className={buildingsPage === totalBuildingsPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Add Building Modal */}
      {showAddBuilding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">เพิ่มอาคารใหม่</h3>
              <button onClick={() => setShowAddBuilding(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddBuilding} className="space-y-4 text-xs">
              <div>
                <label className="mb-1.5 block font-bold text-foreground">ชื่ออาคาร</label>
                <input name="name" required placeholder="เช่น อาคารคณะวิทยาศาสตร์" className="w-full rounded-xl border border-border px-3.5 py-2.5 text-foreground focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="mb-1.5 block font-bold text-foreground">ตัวย่อ (สำหรับรหัสแอร์)</label>
                <input name="abbreviation" required placeholder="เช่น SCI" className="w-full font-mono rounded-xl border border-border px-3.5 py-2.5 text-foreground focus:border-primary focus:outline-none" />
              </div>
              <button type="submit" disabled={isPending} className="w-full rounded-xl bg-foreground py-2.5 font-bold text-white hover:bg-primary/90 disabled:opacity-50">
                {isPending ? "กำลังบันทึก..." : "บันทึกอาคาร"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Room Modal */}
      {showAddRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">เพิ่มห้อง</h3>
              <button onClick={() => setShowAddRoom(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddRoom} className="space-y-4 text-xs">
              <div>
                <label className="mb-1.5 block font-bold text-foreground">ชื่อห้อง / หมายเลขห้อง</label>
                <input name="name" required placeholder="เช่น 204 หรือ ห้องสมุด" className="w-full rounded-xl border border-border px-3.5 py-2.5 text-foreground focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="mb-1.5 block font-bold text-foreground">ชั้น (ไม่บังคับ)</label>
                <input name="floor" type="number" placeholder="เช่น 2" className="w-full rounded-xl border border-border px-3.5 py-2.5 text-foreground focus:border-primary focus:outline-none" />
              </div>
              <button type="submit" disabled={isPending} className="w-full rounded-xl bg-foreground py-2.5 font-bold text-white hover:bg-primary/90 disabled:opacity-50">
                {isPending ? "กำลังบันทึก..." : "บันทึกห้อง"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add AC Modal */}
      {showAddAc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">ลงทะเบียนเครื่องปรับอากาศ</h3>
              <button onClick={() => setShowAddAc(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddAc} className="space-y-4 text-xs">
              
              <div className="flex gap-2 p-1 bg-secondary rounded-lg">
                <button type="button" onClick={() => setAcBrandType("master")} className={`flex-1 py-1.5 rounded-md font-bold transition-all ${acBrandType === "master" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  เลือกรุ่นมาตรฐาน
                </button>
                <button type="button" onClick={() => setAcBrandType("other")} className={`flex-1 py-1.5 rounded-md font-bold transition-all ${acBrandType === "other" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  กำหนดเอง (อื่นๆ)
                </button>
              </div>

              {acBrandType === "master" ? (
                <>
                  <div>
                    <label className="mb-1.5 block font-bold text-foreground">ยี่ห้อ (Brand)</label>
                    <NativeSelect value={selectedBrandId} onChange={(e) => setSelectedBrandId(e.target.value)} required className="w-full h-auto py-3 px-3.5 rounded-xl border-border text-xs text-foreground">
                      <NativeSelectOption value="" disabled>-- เลือกยี่ห้อ --</NativeSelectOption>
                      {brands.map(b => (
                        <NativeSelectOption key={b.id} value={b.id}>
                          {b.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </div>
                  <div>
                    <label className="mb-1.5 block font-bold text-foreground">รุ่น (Model)</label>
                    <NativeSelect name="acModelId" required disabled={!selectedBrandId} className="w-full h-auto py-3 px-3.5 rounded-xl border-border text-xs text-foreground disabled:opacity-50" defaultValue="">
                      <NativeSelectOption value="" disabled>-- เลือกรุ่น --</NativeSelectOption>
                      {selectedBrand?.models.map(m => (
                        <NativeSelectOption key={m.id} value={m.id}>
                          {m.name} {m.defaultBtu ? `(${m.defaultBtu} BTU)` : ""}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="mb-1.5 block font-bold text-foreground">ยี่ห้อแอร์ (พิมพ์เอง)</label>
                    <input name="customBrand" required placeholder="เช่น Daikin, Carrier" className="w-full rounded-xl border border-border px-3.5 py-2.5 text-foreground focus:border-primary focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1.5 block font-bold text-foreground">รุ่น (พิมพ์เอง - ไม่บังคับ)</label>
                    <input name="customModel" placeholder="เช่น Inverter X" className="w-full rounded-xl border border-border px-3.5 py-2.5 text-foreground focus:border-primary focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1.5 block font-bold text-foreground">ขนาด BTU (ไม่บังคับ)</label>
                    <input name="btu" type="number" placeholder="เช่น 18000" className="w-full rounded-xl border border-border px-3.5 py-2.5 text-foreground focus:border-primary focus:outline-none" />
                  </div>
                </>
              )}

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

              <button type="submit" disabled={isPending} className="w-full rounded-xl bg-foreground py-2.5 font-bold text-white hover:bg-primary/90 disabled:opacity-50 mt-4">
                {isPending ? "กำลังบันทึก..." : "ลงทะเบียนเครื่องปรับอากาศ"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PM Settings Modal */}
      {showPmSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-primary" />
                รอบบำรุงรักษา ({showPmSettings.acCode})
              </h3>
              <button onClick={() => setShowPmSettings(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSavePmSettings} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block font-bold text-foreground">ตัวเลข</label>
                  <input 
                    name="frequencyValue" 
                    type="number"
                    required 
                    min="1"
                    defaultValue={showPmSettings.maintenanceSchedule?.frequencyValue || 6}
                    className="w-full rounded-xl border border-border px-3.5 py-2.5 text-foreground focus:border-primary focus:outline-none" 
                  />
                </div>
                <div>
                  <label className="mb-1.5 block font-bold text-foreground">หน่วยเวลา</label>
                  <NativeSelect name="frequencyUnit" required defaultValue={showPmSettings.maintenanceSchedule?.frequencyUnit || "months"} className="w-full h-auto py-3 px-3.5 rounded-xl border-border text-xs text-foreground">
                    <NativeSelectOption value="" disabled>-- เลือกหน่วย --</NativeSelectOption>
                    <NativeSelectOption value="days">วัน</NativeSelectOption>
                    <NativeSelectOption value="months">เดือน</NativeSelectOption>
                    <NativeSelectOption value="years">ปี</NativeSelectOption>
                  </NativeSelect>
                </div>
              </div>
              <button type="submit" disabled={isPending} className="w-full rounded-xl bg-foreground py-2.5 font-bold text-white hover:bg-primary/90 disabled:opacity-50 mt-2">
                {isPending ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-white p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 relative">
            <button onClick={() => setShowQrCode(null)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground bg-secondary p-1.5 rounded-full transition-colors">
              <X className="h-4 w-4" />
            </button>
            
            <div className="text-center space-y-1 pt-2">
              <h3 className="text-lg font-bold text-foreground tracking-tight flex items-center justify-center gap-2">
                <QrCode className="w-5 h-5 text-foreground" />
                QR ประจำเครื่อง
              </h3>
              <p className="text-xs text-muted-foreground font-medium">สแกนเพื่อดูประวัติการซ่อมบำรุง</p>
            </div>

            <div className="flex justify-center" id="qr-code-print-area">
              <div className="bg-white p-4 rounded-2xl border-2 border-border shadow-sm flex flex-col items-center gap-3">
                <QRCodeSVG 
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/qr/${showQrCode.qrCode}`}
                  size={180}
                  level="H"
                  includeMargin={true}
                  className="rounded-lg"
                />
                <div className="text-center">
                  <div className="font-mono font-bold text-foreground text-sm tracking-widest">{showQrCode.acCode}</div>
                  <div className="text-[10px] text-muted-foreground font-medium mt-0.5">{showQrCode.brand} {showQrCode.model ? `(${showQrCode.model})` : ''}</div>
                </div>
              </div>
            </div>

            <button 
              onClick={() => {
                const printWindow = window.open('', '_blank');
                if (!printWindow) return;
                const qrHtml = document.getElementById('qr-code-print-area')?.innerHTML;
                printWindow.document.write(`
                  <html>
                    <head>
                      <title>Print QR Code - ${showQrCode.acCode}</title>
                      <style>
                        body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: sans-serif; }
                        .print-container { text-align: center; padding: 20px; border: 2px dashed #ccc; border-radius: 10px; }
                        .ac-code { font-family: monospace; font-size: 24px; font-weight: bold; margin-top: 15px; letter-spacing: 2px; }
                        .ac-brand { font-size: 14px; color: #666; margin-top: 5px; }
                      </style>
                    </head>
                    <body>
                      <div class="print-container">
                        ${qrHtml?.replace('class="', 'style="')}
                      </div>
                      <script>
                        window.onload = () => { window.print(); window.close(); }
                      </script>
                    </body>
                  </html>
                `);
                printWindow.document.close();
              }}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-white hover:bg-primary/90 transition-colors shadow-md shadow-slate-900/20"
            >
              <Printer className="w-4 h-4" /> พิมพ์ (Print)
            </button>
          </div>
        </div>
      )}

      {showHistoryFor && (
        <AcHistoryModal
          airConditionerId={showHistoryFor}
          onClose={() => setShowHistoryFor(null)}
        />
      )}
    </div>
  );
}

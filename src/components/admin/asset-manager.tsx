"use client";

import { useState, useTransition } from "react";
import { Building2, Plus, ChevronDown, ChevronUp, X } from "lucide-react";
import { createBuildingAction, createRoomAction, createAirConditionerAction } from "@/app/admin/actions";

interface ACUnit {
  id: string;
  acCode: string;
  brand: string;
  model: string | null;
  btu: number | null;
  status: string;
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
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // AC Form state
  const [acBrandType, setAcBrandType] = useState<"master" | "other">("master");
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");

  const filteredBuildings = buildings.map((b) => {
    if (!globalSearch.trim()) return b;
    const s = globalSearch.toLowerCase();
    const matchesBuilding = b.name.toLowerCase().includes(s) || b.abbreviation.toLowerCase().includes(s);

    const matchingRooms = b.rooms.filter((r) => {
      const matchesRoom = r.name.toLowerCase().includes(s);
      const matchesAC = r.acUnits.some(
        (ac) => ac.acCode.toLowerCase().includes(s) || ac.brand.toLowerCase().includes(s)
      );
      return matchesRoom || matchesAC;
    });

    if (matchesBuilding || matchingRooms.length > 0) {
      return {
        ...b,
        rooms: matchingRooms.length > 0 ? matchingRooms : b.rooms,
      };
    }
    return null;
  }).filter(Boolean) as BuildingItem[];

  async function handleAddBuilding(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setToastMessage(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createBuildingAction(formData);
      if (res.error) setToastMessage({ type: "error", text: res.error });
      else {
        setShowAddBuilding(false);
        setToastMessage({ type: "success", text: "เพิ่มอาคารสำเร็จ" });
      }
    });
  }

  async function handleAddRoom(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setToastMessage(null);
    const formData = new FormData(e.currentTarget);
    if (showAddRoom) formData.append("buildingId", showAddRoom.buildingId);
    startTransition(async () => {
      const res = await createRoomAction(formData);
      if (res.error) setToastMessage({ type: "error", text: res.error });
      else {
        setShowAddRoom(null);
        setToastMessage({ type: "success", text: "เพิ่มห้องสำเร็จ" });
      }
    });
  }

  async function handleAddAc(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setToastMessage(null);
    const formData = new FormData(e.currentTarget);
    if (showAddAc) formData.append("roomId", showAddAc.roomId);
    formData.append("brandType", acBrandType);
    
    startTransition(async () => {
      const res = await createAirConditionerAction(formData);
      if (res.error) setToastMessage({ type: "error", text: res.error });
      else {
        setShowAddAc(null);
        setToastMessage({ type: "success", text: "ลงทะเบียนแอร์สำเร็จ" });
      }
    });
  }

  const selectedBrand = brands.find(b => b.id === selectedBrandId);

  return (
    <div className="biz-card p-6 space-y-5 animate-in fade-in">
      {toastMessage && (
        <div className={`p-4 rounded-xl text-sm font-bold border ${toastMessage.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"}`}>
          {toastMessage.text}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
        <h2 className="text-base font-bold text-slate-950 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-slate-700" />
          <span>Asset Hierarchy Tree ({buildings.length} อาคาร)</span>
        </h2>
        <button
          onClick={() => setShowAddBuilding(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> เพิ่มอาคาร
        </button>
      </div>

      <div className="space-y-3">
        {filteredBuildings.map((b) => (
          <div key={b.id} className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
            <div className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => setExpandedBuilding(expandedBuilding === b.id ? null : b.id)}>
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white font-mono text-xs font-bold">
                  {b.abbreviation}
                </span>
                <div>
                  <h3 className="font-bold text-slate-950 text-sm">{b.name}</h3>
                  <p className="text-xs text-slate-500">{b.rooms.length} ห้อง • {b.unitsCount} แอร์</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowAddRoom({ buildingId: b.id }); }}
                  className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
                >
                  <Plus className="h-3 w-3" /> เพิ่มห้อง
                </button>
                <span className="text-slate-400 font-bold">
                  {expandedBuilding === b.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </span>
              </div>
            </div>

            {expandedBuilding === b.id && (
              <div className="border-t border-slate-200 bg-white p-4 space-y-3">
                {b.rooms.map((r) => (
                  <div key={r.id} className="rounded-xl border border-slate-200 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">
                      <span>ห้อง {r.name} (ชั้น {r.floor || 1})</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500 font-normal">{r.acUnits.length} แอร์</span>
                        <button
                          onClick={() => setShowAddAc({ roomId: r.id })}
                          className="inline-flex items-center gap-1 rounded-md bg-sky-50 text-sky-700 border border-sky-100 px-2 py-1 text-[10px] uppercase font-bold hover:bg-sky-100 transition-colors"
                        >
                          <Plus className="h-3 w-3" /> ลงทะเบียนแอร์
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {r.acUnits.map((ac) => (
                        <div key={ac.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs flex items-center justify-between">
                          <div>
                            <div className="font-mono font-bold text-slate-950">{ac.acCode}</div>
                            <div className="text-[10px] text-slate-500">{ac.brand} {ac.model ? `• ${ac.model}` : ""}</div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {ac.status}
                          </span>
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

      {/* Add Building Modal */}
      {showAddBuilding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-950">เพิ่มอาคารใหม่</h3>
              <button onClick={() => setShowAddBuilding(false)} className="text-slate-400 hover:text-slate-950">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddBuilding} className="space-y-4 text-xs">
              <div>
                <label className="mb-1.5 block font-bold text-slate-700">ชื่ออาคาร</label>
                <input name="name" required placeholder="เช่น อาคารคณะวิทยาศาสตร์" className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-slate-900 focus:border-slate-950 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1.5 block font-bold text-slate-700">ตัวย่อ (สำหรับรหัสแอร์)</label>
                <input name="abbreviation" required placeholder="เช่น SCI" className="w-full font-mono rounded-xl border border-slate-200 px-3.5 py-2.5 text-slate-900 focus:border-slate-950 focus:outline-none" />
              </div>
              <button type="submit" disabled={isPending} className="w-full rounded-xl bg-slate-950 py-2.5 font-bold text-white hover:bg-slate-800 disabled:opacity-50">
                {isPending ? "กำลังบันทึก..." : "บันทึกอาคาร"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Room Modal */}
      {showAddRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-950">เพิ่มห้อง</h3>
              <button onClick={() => setShowAddRoom(null)} className="text-slate-400 hover:text-slate-950">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddRoom} className="space-y-4 text-xs">
              <div>
                <label className="mb-1.5 block font-bold text-slate-700">ชื่อห้อง / หมายเลขห้อง</label>
                <input name="name" required placeholder="เช่น 204 หรือ ห้องสมุด" className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-slate-900 focus:border-slate-950 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1.5 block font-bold text-slate-700">ชั้น (ไม่บังคับ)</label>
                <input name="floor" type="number" placeholder="เช่น 2" className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-slate-900 focus:border-slate-950 focus:outline-none" />
              </div>
              <button type="submit" disabled={isPending} className="w-full rounded-xl bg-slate-950 py-2.5 font-bold text-white hover:bg-slate-800 disabled:opacity-50">
                {isPending ? "กำลังบันทึก..." : "บันทึกห้อง"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add AC Modal */}
      {showAddAc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-950">ลงทะเบียนเครื่องปรับอากาศ</h3>
              <button onClick={() => setShowAddAc(null)} className="text-slate-400 hover:text-slate-950">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddAc} className="space-y-4 text-xs">
              
              <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                <button type="button" onClick={() => setAcBrandType("master")} className={`flex-1 py-1.5 rounded-md font-bold transition-all ${acBrandType === "master" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
                  เลือกรุ่นมาตรฐาน
                </button>
                <button type="button" onClick={() => setAcBrandType("other")} className={`flex-1 py-1.5 rounded-md font-bold transition-all ${acBrandType === "other" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
                  กำหนดเอง (อื่นๆ)
                </button>
              </div>

              {acBrandType === "master" ? (
                <>
                  <div>
                    <label className="mb-1.5 block font-bold text-slate-700">ยี่ห้อ (Brand)</label>
                    <select required value={selectedBrandId} onChange={(e) => setSelectedBrandId(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-slate-900 focus:border-slate-950 focus:outline-none">
                      <option value="" disabled>-- เลือกยี่ห้อ --</option>
                      {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block font-bold text-slate-700">รุ่น (Model)</label>
                    <select name="acModelId" required className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-slate-900 focus:border-slate-950 focus:outline-none disabled:opacity-50" disabled={!selectedBrandId}>
                      <option value="" disabled>-- เลือกรุ่น --</option>
                      {selectedBrand?.models.map(m => (
                        <option key={m.id} value={m.id}>{m.name} {m.defaultBtu ? `(${m.defaultBtu} BTU)` : ""}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="mb-1.5 block font-bold text-slate-700">ยี่ห้อแอร์ (พิมพ์เอง)</label>
                    <input name="customBrand" required placeholder="เช่น Daikin, Carrier" className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-slate-900 focus:border-slate-950 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1.5 block font-bold text-slate-700">รุ่น (พิมพ์เอง - ไม่บังคับ)</label>
                    <input name="customModel" placeholder="เช่น Inverter X" className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-slate-900 focus:border-slate-950 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1.5 block font-bold text-slate-700">ขนาด BTU (ไม่บังคับ)</label>
                    <input name="btu" type="number" placeholder="เช่น 18000" className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-slate-900 focus:border-slate-950 focus:outline-none" />
                  </div>
                </>
              )}

              <button type="submit" disabled={isPending} className="w-full rounded-xl bg-slate-950 py-2.5 font-bold text-white hover:bg-slate-800 disabled:opacity-50 mt-4">
                {isPending ? "กำลังบันทึก..." : "ลงทะเบียนเครื่องปรับอากาศ"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

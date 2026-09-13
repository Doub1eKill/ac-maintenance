"use client";

import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import {
  Building2, Plus, ChevronDown, ChevronUp, X, QrCode, CalendarClock, Printer, Clock, Pencil, Hash
} from "lucide-react";
import {
  createBuildingAction,
  createRoomAction,
  createAirConditionerAction,
  saveMaintenanceScheduleAction,
  updateAirConditionerAction,
  getAirConditionerHistory,
} from "@/app/admin/actions";
import { QRCodeSVG } from "qrcode.react";
import { AcHistoryModal } from "@/components/admin/ac-history-modal";
import { useEscapeToClose } from "@/hooks/use-escape-to-close";
import {
  StickerCard,
  openStickerSheet,
  roomSequenceOf,
  qrTargetUrl,
} from "@/components/shared/qr-sticker";
import { formatUnitLocation } from "@/lib/location";
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
import { CatalogueMark } from "@/components/shared/catalogue-mark";
import { FloorGroupList, groupByFloor } from "@/components/shared/building-groups";

interface ACUnit {
  id: string;
  acCode: string;
  brand: string;
  model: string | null;
  // Whether the brand/model above has been retired from the catalogue.
  // See @/lib/catalogue-status — the name still resolves either way.
  brandDeleted: boolean;
  modelDeleted: boolean;
  btu: number | null;
  status: string;
  qrCode: string;
  maintenanceSchedule: {
    frequencyValue: number;
    frequencyUnit: string;
    nextDueDate: string;
  } | null;
}

interface QrModalData extends ACUnit {
  buildingName: string;
  roomName: string;
  floor: number | null;
  roomSequence: number | null;
  roomUnitsCount: number;
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
  onClearSearch: () => void;
}

export function AssetManager({ buildings, brands, globalSearch, onClearSearch }: AssetManagerProps) {
  const [isPending, startTransition] = useTransition();
  // Every building starts collapsed, like the seven grouped lists that
  // BuildingGroupList drives. This one predates that component and kept
  // auto-opening the alphabetically-first building, which buried the other
  // four under ~20 rows belonging to a building nobody asked about — and now
  // that a floor level sits inside, under a whole tier more than that.
  // "none" is a separate value from null on purpose: null means "nothing
  // chosen yet", and the sole-building fallback below has to be able to tell
  // the two apart or a closed single building would reopen itself.
  const [expandedBuilding, setExpandedBuilding] = useState<string | null | "none">(null);
  
  // Modals state
  const [showAddBuilding, setShowAddBuilding] = useState(false);
  // `floor` set means "add a room to this floor" and the field is filled in and
  // locked; left undefined it means "start a new floor", and the field is open.
  // There is no floors table — rooms.floor is a column on the room — so a floor
  // only exists because a room carries its number, and creating one is creating
  // that first room.
  const [showAddRoom, setShowAddRoom] = useState<
    { buildingId: string; floor?: number | null } | null
  >(null);
  const [showAddAc, setShowAddAc] = useState<{ roomId: string } | null>(null);
  const [showPmSettings, setShowPmSettings] = useState<ACUnit | null>(null);
  const [showQrCode, setShowQrCode] = useState<QrModalData | null>(null);
  const [showHistoryFor, setShowHistoryFor] = useState<string | null>(null);
  const [showEditAc, setShowEditAc] = useState<ACUnit | null>(null);

  // AC Form state
  const [acBrandType, setAcBrandType] = useState<"master" | "other">("master");
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");

  // Edit AC form state — defaults to "other" (free text) because the unit
  // list only carries the resolved brand/model strings, not the catalog
  // acBrandId/acModelId to preselect the master dropdowns with. installedAt
  // isn't in the list either, so it's fetched fresh when the modal opens —
  // leaving it blank here would silently clear a real install date on save,
  // since the update action treats an empty date as "clear it" (unlike
  // registration, where empty means "today").
  const [editAcBrandType, setEditAcBrandType] = useState<"master" | "other">("other");
  const [editSelectedBrandId, setEditSelectedBrandId] = useState<string>("");
  const [editAcInstalledAt, setEditAcInstalledAt] = useState<string>("");
  const [isLoadingEditAc, setIsLoadingEditAc] = useState(false);
  const [editAcLoadFailed, setEditAcLoadFailed] = useState(false);

  const [buildingsPage, setBuildingsPage] = useState(1);
  // The building created a moment ago. Alphabetical order and five to a
  // page meant a new one usually landed on page 2 behind "เพิ่มอาคารสำเร็จ"
  // and "หน้า 1 จาก 2" (QA 20260913-1742, BUG-008). While set, the page and
  // the open building are derived from it; the user's own paging or click
  // clears it. Kept as a token so the same effect works for a second
  // building created in the same visit.
  const [focusBuilding, setFocusBuilding] = useState<{ id: string; token: number } | null>(null);
  const BUILDINGS_PER_PAGE = 5;

  // Only the QR preview. The add/edit forms in this file deliberately keep
  // their explicit cancel: half-typed room and unit details are worth more
  // than the convenience of dismissing them with a key.
  useEscapeToClose(() => setShowQrCode(null), showQrCode !== null);

  useEffect(() => {
    setBuildingsPage(1);
    // Also drops a deliberate collapse, so it can't outlive the list it was
    // aimed at. Without this, closing a building and then searching would
    // suppress the search's own auto-open and answer with a page that looks
    // empty — which is the bug the auto-open was added to fix.
    setExpandedBuilding(null);
  }, [globalSearch]);

  // Matches what the header box says it searches — "ค้นหารหัสแอร์, สถานที่,
  // หรือแบรนด์" — and in particular the unit code, which is how the overview's
  // "ไปดูรายละเอียด" links here (/admin/assets?q=<ac code>). Matching only
  // buildings and rooms meant that link always landed on "ไม่พบอาคารที่ตรงกับ
  // B467711-1-846367-01": the unit is right there, but nothing was comparing
  // the term against it.
  const filteredBuildings = buildings.map((b) => {
    if (!globalSearch.trim()) return b;
    const s = globalSearch.trim().toLowerCase();

    // A building match keeps the building whole — someone searching a building
    // is asking for all of it, not for the parts whose names repeat its own.
    if (b.name.toLowerCase().includes(s) || b.abbreviation.toLowerCase().includes(s)) return b;

    const matchingRooms = b.rooms
      .map((r) => {
        if (r.name.toLowerCase().includes(s)) return r;

        // Narrowed to the units that matched rather than the whole room: a
        // search for one unit code should land on that unit, not on a room of
        // eight with the answer somewhere inside it.
        const matchingUnits = r.acUnits.filter(
          (ac) =>
            ac.acCode.toLowerCase().includes(s) ||
            ac.brand.toLowerCase().includes(s) ||
            (ac.model ?? "").toLowerCase().includes(s)
        );
        return matchingUnits.length > 0 ? { ...r, acUnits: matchingUnits } : null;
      })
      .filter(Boolean) as RoomItem[];

    return matchingRooms.length > 0 ? { ...b, rooms: matchingRooms } : null;
  }).filter(Boolean) as BuildingItem[];

  // While a search is active the one building left has to be open, or the
  // result is a single collapsed header and the page still looks empty. The
  // fallback also covers the building that was open scrolling out of the
  // result set.
  // A search that leaves exactly one building opens onto it rather than
  // answering with a single collapsed bar — the same rule the grouped lists
  // follow, extended here to any lone building rather than only a searched-for
  // one, since a tenant with one building would otherwise pay a click on every
  // visit that no other page charges.
  const soleBuildingId = filteredBuildings.length === 1 ? filteredBuildings[0].id : null;
  const focusIndex = focusBuilding ? filteredBuildings.findIndex((b) => b.id === focusBuilding.id) : -1;
  const effectiveExpandedBuilding =
    focusIndex >= 0
      ? filteredBuildings[focusIndex].id
      : expandedBuilding === "none"
        ? null
        : filteredBuildings.some((b) => b.id === expandedBuilding)
          ? expandedBuilding
          : globalSearch.trim()
            ? filteredBuildings[0]?.id ?? null
            : soleBuildingId;

  const totalBuildingsPages = Math.ceil(filteredBuildings.length / BUILDINGS_PER_PAGE);
  const currentBuildingsPage =
    focusIndex >= 0 ? Math.floor(focusIndex / BUILDINGS_PER_PAGE) + 1 : buildingsPage;
  const paginatedBuildings = filteredBuildings.slice(
    (currentBuildingsPage - 1) * BUILDINGS_PER_PAGE,
    currentBuildingsPage * BUILDINGS_PER_PAGE
  );
  // Every hand-driven change to the list goes through here first, so the
  // focused page stays where it is rather than snapping back.
  function endFocus() {
    setFocusBuilding(null);
    setBuildingsPage(currentBuildingsPage);
  }

  async function handleAddBuilding(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createBuildingAction(formData);
      if (res.error) toast.error(res.error);
      else {
        setShowAddBuilding(false);
        toast.success("เพิ่มอาคารสำเร็จ");
        if (res.id) setFocusBuilding({ id: res.id, token: Date.now() });
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
        // Nothing else to do for a new floor: it appears as soon as the room
        // that carries its number does.
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

  function handleOpenEditAc(ac: ACUnit) {
    setShowEditAc(ac);
    setEditAcBrandType("other");
    setEditSelectedBrandId("");
    setEditAcInstalledAt("");
    setEditAcLoadFailed(false);
    setIsLoadingEditAc(true);
    getAirConditionerHistory(ac.id).then((result) => {
      if ("error" in result) {
        // Leaving the date blank here would silently clear a real install
        // date on save (update treats "" as "clear it"), so block submission
        // instead of guessing.
        setEditAcLoadFailed(true);
        toast.error("โหลดวันที่ติดตั้งเดิมไม่สำเร็จ ลองปิดแล้วเปิดใหม่อีกครั้ง");
      } else {
        setEditAcInstalledAt(result.unit.installedAt ? result.unit.installedAt.slice(0, 10) : "");
      }
      setIsLoadingEditAc(false);
    });
  }

  async function handleUpdateAc(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!showEditAc) return;
    const formData = new FormData(e.currentTarget);
    formData.append("airConditionerId", showEditAc.id);
    formData.append("brandType", editAcBrandType);

    startTransition(async () => {
      const res = await updateAirConditionerAction(formData);
      if (res.error) toast.error(res.error);
      else {
        setShowEditAc(null);
        toast.success("แก้ไขข้อมูลเครื่องปรับอากาศสำเร็จ");
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
  const editSelectedBrand = brands.find(b => b.id === editSelectedBrandId);

  return (
    <div className="biz-card p-6 space-y-5 animate-in fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border pb-4 gap-4">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Building2 className="h-5 w-5 text-foreground" />
          <span>โครงสร้างสินทรัพย์ ({filteredBuildings.length} อาคาร)</span>
        </h2>
        <button
          onClick={() => setShowAddBuilding(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> เพิ่มอาคาร
        </button>
      </div>

      {filteredBuildings.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl space-y-3">
          {globalSearch.trim() ? (
            <>
              <p>ไม่พบอาคารที่ตรงกับ &quot;{globalSearch}&quot;</p>
              <button
                onClick={onClearSearch}
                className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted transition-colors"
              >
                ล้างคำค้นหา
              </button>
            </>
          ) : (
            <p>ยังไม่มีข้อมูลอาคารในระบบ</p>
          )}
        </div>
      ) : (
      <div className="space-y-3">
        {paginatedBuildings.map((b) => (
          <div key={b.id} className="rounded-2xl border border-border bg-muted overflow-hidden">
            <div className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary transition-colors cursor-pointer" onClick={() => { endFocus(); setExpandedBuilding(effectiveExpandedBuilding === b.id ? "none" : b.id); }}>
              <div className="flex min-w-0 items-center gap-3">
                {/* An icon, not the abbreviation. This is a fixed 32px box and
                    the abbreviations in real data are seven characters
                    ("B467711"), which overflowed it and left what looked like a
                    stray number. The same badge in BuildingGroupList has always
                    used this icon; the abbreviation moved to the line below,
                    where it has room and reads as what it is — the first
                    segment of every acCode in the building. */}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Building2 className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold text-foreground text-sm">{b.name}</h3>
                  {/* Both halves counted off the same (filtered) rooms. Taking
                      the unit half from the server's `unitsCount` instead made
                      one line contradict itself under a search — "1 ห้อง • 22
                      แอร์", a room count narrowed to the result next to a unit
                      count for the whole building. Identical when nothing is
                      filtered, which is why it went unnoticed. */}
                  <p className="truncate text-xs text-muted-foreground">
                    <span className="font-mono">{b.abbreviation}</span> • {b.rooms.length} ห้อง •{" "}
                    {b.rooms.reduce((n, r) => n + r.acUnits.length, 0)} แอร์
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* A building opens onto floors, so the button here starts a
                    floor rather than a room — the old "เพิ่มห้อง" sat one level
                    above the thing it created and asked which floor as a bare
                    number field. Adding a room to a floor that already exists
                    is on that floor's own header. */}
                <button
                  onClick={(e) => { e.stopPropagation(); setShowAddRoom({ buildingId: b.id }); }}
                  className="inline-flex items-center gap-1 rounded-md bg-card border border-border px-2 py-1 text-[11px] font-bold text-foreground hover:bg-muted shadow-sm transition-colors"
                >
                  <Plus className="h-3 w-3" /> เพิ่มชั้น
                </button>
                <span className="text-muted-foreground font-bold">
                  {effectiveExpandedBuilding === b.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </span>
              </div>
            </div>

            {effectiveExpandedBuilding === b.id && (
              <div className="border-t border-border bg-card p-4 space-y-3">
                <FloorGroupList
                  floors={groupByFloor(b.rooms)}
                  getSubtitle={(floor) =>
                    `${floor.items.length} ห้อง • ${floor.items.reduce((n, r) => n + r.acUnits.length, 0)} แอร์`
                  }
                  renderExtra={(floor) => (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAddRoom({ buildingId: b.id, floor: floor.floor });
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-bold text-foreground shadow-sm transition-colors hover:bg-muted"
                    >
                      <Plus className="h-3 w-3" /> เพิ่มห้อง
                    </button>
                  )}
                  renderItems={(floor) => (
                    <div className="space-y-3">
                      {floor.items.map((r) => (
                  <div key={r.id} className="rounded-xl border border-border p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-foreground border-b border-border pb-2">
                      <span>ห้อง {r.name}</span>
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
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                {ac.brand} {ac.model ? `• ${ac.model}` : ""}
                                <CatalogueMark brandDeleted={ac.brandDeleted} modelDeleted={ac.modelDeleted} className="ml-1" />
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-success/20 text-success-foreground border border-success/30 whitespace-nowrap">
                              {ac.status}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-border">
                            <button
                              onClick={() => handleOpenEditAc(ac)}
                              className="inline-flex items-center justify-center gap-1 rounded border border-border bg-card py-1.5 text-[10px] font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-center"
                            >
                              <Pencil className="h-3 w-3" /> แก้ไข
                            </button>
                            <button
                              onClick={() => setShowPmSettings(ac)}
                              className="rounded border border-border bg-card py-1.5 text-[10px] font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-center"
                            >
                              {ac.maintenanceSchedule ? `ล้างทุก ${ac.maintenanceSchedule.frequencyValue} ${ac.maintenanceSchedule.frequencyUnit === 'days' ? 'วัน' : ac.maintenanceSchedule.frequencyUnit === 'months' ? 'เดือน' : 'ปี'}` : 'ตั้งค่าล้างแอร์'}
                            </button>
                            <button
                              onClick={() =>
                                setShowQrCode({
                                  ...ac,
                                  buildingName: b.name,
                                  roomName: r.name,
                                  floor: r.floor,
                                  roomSequence: roomSequenceOf(ac.acCode),
                                  roomUnitsCount: r.acUnits.length,
                                })
                              }
                              className="rounded border border-border bg-card py-1.5 text-[10px] font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-center"
                            >
                              QR Code
                            </button>
                            <button
                              onClick={() => setShowHistoryFor(ac.id)}
                              className="inline-flex items-center justify-center gap-1 rounded border border-border bg-card py-1.5 text-[10px] font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-center"
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
                />
              </div>
            )}
          </div>
        ))}
      </div>
      )}

      {totalBuildingsPages > 1 && (
        <div className="py-4 border-t border-border mt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); endFocus(); setBuildingsPage(Math.max(1, currentBuildingsPage - 1)); }} 
                  className={currentBuildingsPage === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="text-xs font-medium text-muted-foreground px-4">
                  หน้า {currentBuildingsPage} จาก {totalBuildingsPages}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); endFocus(); setBuildingsPage(Math.min(totalBuildingsPages, currentBuildingsPage + 1)); }}
                  className={currentBuildingsPage === totalBuildingsPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Add Building Modal */}
      {showAddBuilding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in">
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
              <button type="submit" disabled={isPending} className="w-full rounded-xl bg-primary py-2.5 font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {isPending ? "กำลังบันทึก..." : "บันทึกอาคาร"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Room Modal */}
      {showAddRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">
                {showAddRoom.floor === undefined
                  ? "เพิ่มชั้นใหม่"
                  : `เพิ่มห้อง (${showAddRoom.floor === null ? "ไม่ระบุชั้น" : `ชั้น ${showAddRoom.floor}`})`}
              </h3>
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
                <label className="mb-1.5 block font-bold text-foreground">ชั้น</label>
                <input
                  name="floor"
                  type="number"
                  min={0}
                  required
                  placeholder="เช่น 2"
                  // Filled in and read-only when the floor is already known, so
                  // the room cannot land on a different floor than the header
                  // it was opened from says.
                  defaultValue={showAddRoom.floor ?? undefined}
                  readOnly={showAddRoom.floor !== undefined && showAddRoom.floor !== null}
                  className="w-full rounded-xl border border-border px-3.5 py-2.5 text-foreground focus:border-primary focus:outline-none read-only:bg-muted read-only:text-muted-foreground"
                />
                {showAddRoom.floor === undefined && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    ชั้นเกิดขึ้นจากห้องที่อยู่บนชั้นนั้น การสร้างชั้นใหม่จึงคือการสร้างห้องแรกของชั้น
                  </p>
                )}
              </div>
              <button type="submit" disabled={isPending} className="w-full rounded-xl bg-primary py-2.5 font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {isPending ? "กำลังบันทึก..." : "บันทึกห้อง"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add AC Modal */}
      {showAddAc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">ลงทะเบียนเครื่องปรับอากาศ</h3>
              <button onClick={() => setShowAddAc(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddAc} className="space-y-4 text-xs">
              
              <div className="flex gap-2 p-1 bg-secondary rounded-lg">
                <button type="button" onClick={() => setAcBrandType("master")} className={`flex-1 py-1.5 rounded-md font-bold transition-all ${acBrandType === "master" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  เลือกรุ่นมาตรฐาน
                </button>
                <button type="button" onClick={() => setAcBrandType("other")} className={`flex-1 py-1.5 rounded-md font-bold transition-all ${acBrandType === "other" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
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
                    <input name="btu" type="number" min="1" step="1" placeholder="เช่น 18000" className="w-full rounded-xl border border-border px-3.5 py-2.5 text-foreground focus:border-primary focus:outline-none" />
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

              <button type="submit" disabled={isPending} className="w-full rounded-xl bg-primary py-2.5 font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 mt-4">
                {isPending ? "กำลังบันทึก..." : "ลงทะเบียนเครื่องปรับอากาศ"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit AC Modal */}
      {showEditAc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">แก้ไขข้อมูลเครื่องปรับอากาศ ({showEditAc.acCode})</h3>
              <button onClick={() => setShowEditAc(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateAc} className="space-y-4 text-xs">

              <div className="flex gap-2 p-1 bg-secondary rounded-lg">
                <button type="button" onClick={() => setEditAcBrandType("master")} className={`flex-1 py-1.5 rounded-md font-bold transition-all ${editAcBrandType === "master" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  เลือกรุ่นมาตรฐาน
                </button>
                <button type="button" onClick={() => setEditAcBrandType("other")} className={`flex-1 py-1.5 rounded-md font-bold transition-all ${editAcBrandType === "other" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  กำหนดเอง (อื่นๆ)
                </button>
              </div>

              {editAcBrandType === "master" ? (
                <>
                  <div>
                    <label className="mb-1.5 block font-bold text-foreground">ยี่ห้อ (Brand)</label>
                    <NativeSelect value={editSelectedBrandId} onChange={(e) => setEditSelectedBrandId(e.target.value)} required className="w-full h-auto py-3 px-3.5 rounded-xl border-border text-xs text-foreground">
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
                    <NativeSelect name="acModelId" required disabled={!editSelectedBrandId} className="w-full h-auto py-3 px-3.5 rounded-xl border-border text-xs text-foreground disabled:opacity-50" defaultValue="">
                      <NativeSelectOption value="" disabled>-- เลือกรุ่น --</NativeSelectOption>
                      {editSelectedBrand?.models.map(m => (
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
                    <input name="customBrand" required defaultValue={showEditAc.brand} placeholder="เช่น Daikin, Carrier" className="w-full rounded-xl border border-border px-3.5 py-2.5 text-foreground focus:border-primary focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1.5 block font-bold text-foreground">รุ่น (พิมพ์เอง - ไม่บังคับ)</label>
                    <input name="customModel" defaultValue={showEditAc.model ?? ""} placeholder="เช่น Inverter X" className="w-full rounded-xl border border-border px-3.5 py-2.5 text-foreground focus:border-primary focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1.5 block font-bold text-foreground">ขนาด BTU (ไม่บังคับ)</label>
                    <input name="btu" type="number" min="1" step="1" defaultValue={showEditAc.btu ?? ""} placeholder="เช่น 18000" className="w-full rounded-xl border border-border px-3.5 py-2.5 text-foreground focus:border-primary focus:outline-none" />
                  </div>
                </>
              )}

              <div>
                <label className="mb-1.5 block font-bold text-foreground">สถานะเครื่อง</label>
                <NativeSelect name="status" required defaultValue={showEditAc.status} className="w-full h-auto py-3 px-3.5 rounded-xl border-border text-xs text-foreground">
                  <NativeSelectOption value="normal">ปกติ</NativeSelectOption>
                  <NativeSelectOption value="broken">เสีย</NativeSelectOption>
                  <NativeSelectOption value="needs_cleaning">รอล้าง</NativeSelectOption>
                </NativeSelect>
              </div>

              <div>
                <label className="mb-1.5 block font-bold text-foreground">
                  วันที่ติดตั้ง (ไม่บังคับ)
                </label>
                <input
                  name="installedAt"
                  type="date"
                  value={editAcInstalledAt}
                  onChange={(e) => setEditAcInstalledAt(e.target.value)}
                  disabled={isLoadingEditAc || editAcLoadFailed}
                  className="w-full rounded-xl border border-border px-3.5 py-2.5 text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
                />
                <p className={`mt-1 text-[11px] ${editAcLoadFailed ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                  {isLoadingEditAc
                    ? "กำลังโหลดวันที่ติดตั้งเดิม..."
                    : editAcLoadFailed
                    ? "โหลดวันที่ติดตั้งเดิมไม่สำเร็จ ปิดหน้าต่างนี้แล้วเปิดใหม่ก่อนบันทึก"
                    : "เว้นว่าง = ล้างค่าเป็นไม่ระบุ"}
                </p>
              </div>

              <button type="submit" disabled={isPending || isLoadingEditAc || editAcLoadFailed} className="w-full rounded-xl bg-primary py-2.5 font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 mt-4">
                {isPending ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PM Settings Modal */}
      {showPmSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in">
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
              <button type="submit" disabled={isPending} className="w-full rounded-xl bg-primary py-2.5 font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 mt-2">
                {isPending ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 relative">
            <button
              onClick={() => setShowQrCode(null)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground bg-secondary p-1.5 rounded-full transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="text-center space-y-1 pt-2">
              <h3 className="text-lg font-bold text-foreground tracking-tight flex items-center justify-center gap-2">
                <QrCode className="w-5 h-5 text-foreground" />
                ตัวอย่าง QR ประจำเครื่อง
              </h3>
              <p className="text-xs text-muted-foreground font-medium">สแกนเพื่อดูประวัติการซ่อมบำรุง</p>
            </div>

            <div className="flex justify-center">
              {/* force-light: this box is what gets printed/scanned, so it stays
                  a plain white card with dark text no matter the dashboard's
                  active theme. */}
              <div className="force-light bg-card p-4 rounded-2xl border-2 border-border shadow-sm flex flex-col items-center gap-3">
                <QRCodeSVG
                  value={qrTargetUrl(showQrCode.qrCode)}
                  size={160}
                  level="H"
                  includeMargin={true}
                  className="rounded-lg"
                />
                <div className="text-center">
                  <div className="font-mono font-bold text-foreground text-sm tracking-widest">{showQrCode.acCode}</div>
                  <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
                    {showQrCode.brand} {showQrCode.model ? `(${showQrCode.model})` : ""}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium">
                    {showQrCode.btu ? `${showQrCode.btu.toLocaleString()} BTU` : "ไม่ระบุ BTU"}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-muted px-4 py-3 text-center space-y-1">
              <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-foreground">
                <Hash className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {showQrCode.roomSequence !== null
                  ? `เครื่องที่ ${showQrCode.roomSequence} ของห้องนี้`
                  : "ไม่ทราบลำดับในห้อง"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {formatUnitLocation(
                  {
                    name: showQrCode.roomName,
                    floor: showQrCode.floor,
                    building: { name: showQrCode.buildingName },
                  },
                  { withFloor: true }
                )}
                {" · "}
                ห้องนี้มีแอร์ในระบบ {showQrCode.roomUnitsCount} เครื่อง
              </p>
            </div>

            {/* Hidden sticker artifact lifted by the print button */}
            <div id="asset-single-sticker-print-area" className="hidden">
              <StickerCard ac={showQrCode} />
            </div>

            <button
              onClick={() => {
                const html = document.getElementById("asset-single-sticker-print-area")?.innerHTML;
                if (!html) {
                  toast.error("เตรียมข้อมูลสำหรับพิมพ์ไม่สำเร็จ กรุณาโหลดหน้าใหม่แล้วลองอีกครั้ง");
                  return;
                }
                openStickerSheet(html, `พิมพ์ QR Code - ${showQrCode.acCode}`);
              }}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow-md shadow-slate-900/20"
            >
              <Printer className="w-4 h-4" /> พิมพ์ (Print)
            </button>
          </div>
        </div>
      )}

      {showHistoryFor && (
        <AcHistoryModal
          airConditionerId={showHistoryFor}
          isAdmin
          onClose={() => setShowHistoryFor(null)}
        />
      )}
    </div>
  );
}

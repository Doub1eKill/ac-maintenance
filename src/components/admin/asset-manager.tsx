"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  ChevronDown,
  ChevronUp,
  X,
  Clock,
  Pencil,
} from "lucide-react";
import {
  createBuildingAction,
  createRoomAction,
  updateBuildingAction,
  updateRoomAction,
  createAirConditionerAction,
  saveMaintenanceScheduleAction,
  updateAirConditionerAction,
  getAirConditionerHistory,
} from "@/app/admin/actions";
import { AcHistoryModal } from "@/components/admin/ac-history-modal";
import { useEscapeToClose } from "@/hooks/use-escape-to-close";
import { installDateLimits, nativeValidity } from "@/lib/native-validity";
import { UnitPhotoField } from "@/components/shared/unit-photo-field";
import { roomSequenceOf } from "@/components/shared/qr-sticker";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { CatalogueMark } from "@/components/shared/catalogue-mark";
import { UnitPhoto } from "@/components/shared/unit-photo";
import { FloorGroupList, groupByFloor } from "@/components/shared/building-groups";
import {
  BrandModelPicker,
  appendBrandModel,
  emptyBrandModel,
  type BrandModelValue,
} from "@/components/shared/brand-model-picker";
import { getAcMasterDataAction } from "@/app/tech/actions";
import { type ACUnit, type QrModalData } from "@/components/admin/asset-manager-types";
import {
  AddBuildingModal,
  AddRoomModal,
  EditBuildingModal,
  PmSettingsModal,
  QrCodeModal,
  type EditBuildingTarget,
} from "@/components/admin/asset-manager-modals";
import { EditRoomModal, type EditRoomTarget } from "@/components/shared/edit-room-modal";
import { AC_STATUS_LABEL, acStatusLabel, acStatusTone } from "@/lib/labels";

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
  const [editBuilding, setEditBuilding] = useState<EditBuildingTarget | null>(null);
  const [editRoom, setEditRoom] = useState<EditRoomTarget | null>(null);
  const [showPmSettings, setShowPmSettings] = useState<ACUnit | null>(null);
  const [showQrCode, setShowQrCode] = useState<QrModalData | null>(null);
  const [showHistoryFor, setShowHistoryFor] = useState<string | null>(null);
  const [showEditAc, setShowEditAc] = useState<ACUnit | null>(null);

  // AC Form state
  // The register form's brand and model: the same picker the technician's
  // form uses, so a model missing from the catalogue can be added right there
  // instead of on the catalogue page. BTU is optional; empty takes the model's.
  const [addPicked, setAddPicked] = useState<BrandModelValue>(emptyBrandModel);
  const [addBtu, setAddBtu] = useState("");
  // The catalogue after the picker added to it; until then, the server's.
  const [freshCatalogue, setFreshCatalogue] = useState<BrandItem[] | null>(null);

  // Edit AC form state. The unit list only carries display names, so what the
  // record actually holds — catalogue ids or typed-in text — is fetched fresh
  // when the modal opens, with installedAt. Saving waits for that load: the
  // form used to open every unit on the typed-in tab filled with the display
  // names, and saving a status change then unbound a catalogue unit from its
  // model. installedAt the same way — left blank it would clear a real
  // install date on save, since the update action treats "" as "clear it".
  // BTU sits outside the picker so both tabs keep the unit's own value; it
  // used to exist on the typed-in tab only, and a save from the catalogue tab
  // replaced the unit's BTU with the model's default.
  const [editPicked, setEditPicked] = useState<BrandModelValue>(emptyBrandModel);
  const [editBtu, setEditBtu] = useState("");
  const [editAcInstalledAt, setEditAcInstalledAt] = useState<string>("");
  const [editAcPhotoUrl, setEditAcPhotoUrl] = useState<string | null>(null);
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
  useEscapeToClose(() => setEditBuilding(null), editBuilding !== null);
  useEscapeToClose(() => setEditRoom(null), editRoom !== null);

  // Applied in the same render the search changes in (React's "adjust state
  // on change" form): back to page 1, and dropping a deliberate collapse so
  // it can't outlive the list it was aimed at — without that, closing a
  // building and then searching would suppress the search's own auto-open
  // and answer with a page that looks empty, which is the bug the auto-open
  // was added to fix. The focus on a just-created building goes too: a
  // search that hid it would otherwise let it snap the list back to its page
  // the moment the search was cleared.
  const [searchForList, setSearchForList] = useState(globalSearch);
  if (searchForList !== globalSearch) {
    setSearchForList(globalSearch);
    setBuildingsPage(1);
    setExpandedBuilding(null);
    setFocusBuilding(null);
  }

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

  async function handleEditBuilding(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editBuilding) return;
    const formData = new FormData(e.currentTarget);
    formData.append("id", editBuilding.id);
    startTransition(async () => {
      const res = await updateBuildingAction(formData);
      if (res.error) toast.error(res.error);
      else {
        setEditBuilding(null);
        toast.success("บันทึกการแก้ไขอาคารแล้ว");
      }
    });
  }

  async function handleEditRoom(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editRoom) return;
    const formData = new FormData(e.currentTarget);
    formData.append("id", editRoom.id);
    startTransition(async () => {
      const res = await updateRoomAction(formData);
      if (res.error) toast.error(res.error);
      else {
        setEditRoom(null);
        toast.success("บันทึกการแก้ไขห้องแล้ว");
      }
    });
  }

  function closeAddAc() {
    setShowAddAc(null);
    setAddPicked(emptyBrandModel);
    setAddBtu("");
  }

  async function reloadCatalogue() {
    const data = await getAcMasterDataAction();
    setFreshCatalogue(data.brands);
    return data.brands;
  }

  async function handleAddAc(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (showAddAc) formData.append("roomId", showAddAc.roomId);
    if (addPicked.brandType === "master" && !addPicked.modelId) {
      toast.error("กรุณาเลือกรุ่นแอร์");
      return;
    }
    if (addPicked.brandType === "other" && !addPicked.customBrand.trim()) {
      toast.error("กรุณาระบุยี่ห้อแอร์");
      return;
    }
    appendBrandModel(formData, addPicked);

    startTransition(async () => {
      const res = await createAirConditionerAction(formData);
      if (res.error) toast.error(res.error);
      else {
        closeAddAc();
        toast.success("ลงทะเบียนแอร์สำเร็จ");
      }
    });
  }

  function handleOpenEditAc(ac: ACUnit) {
    setShowEditAc(ac);
    setEditPicked(emptyBrandModel);
    setEditBtu(ac.btu === null ? "" : String(ac.btu));
    setEditAcInstalledAt("");
    setEditAcPhotoUrl(null);
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
        setEditAcPhotoUrl(result.unit.photoUrl);
        setEditBtu(result.unit.btu === null ? "" : String(result.unit.btu));
        setEditPicked(
          result.unit.acModelId
            ? { ...emptyBrandModel, brandId: result.unit.acBrandId, modelId: result.unit.acModelId }
            : {
                ...emptyBrandModel,
                brandType: "other",
                customBrand: result.unit.customBrand ?? "",
                customModel: result.unit.customModel ?? "",
              }
        );
      }
      setIsLoadingEditAc(false);
    });
  }

  async function handleUpdateAc(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!showEditAc) return;
    const formData = new FormData(e.currentTarget);
    formData.append("airConditionerId", showEditAc.id);
    if (editPicked.brandType === "master" && !editPicked.modelId) {
      toast.error("กรุณาเลือกรุ่นแอร์");
      return;
    }
    if (editPicked.brandType === "other" && !editPicked.customBrand.trim()) {
      toast.error("กรุณาระบุยี่ห้อแอร์");
      return;
    }
    appendBrandModel(formData, editPicked);

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

  const catalogue = freshCatalogue ?? brands;

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
                  <div className="flex min-w-0 items-center gap-1.5">
                    <h3 className="truncate font-bold text-foreground text-sm">{b.name}</h3>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditBuilding({
                          id: b.id,
                          name: b.name,
                          abbreviation: b.abbreviation,
                          unitCount: b.rooms.reduce((n, r) => n + r.acUnits.length, 0),
                        });
                      }}
                      aria-label={`แก้ไขอาคาร ${b.name}`}
                      className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-card hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {/* Both halves counted off the same (filtered) rooms. Taking
                      the unit half from the server's `unitsCount` instead made
                      one line contradict itself under a search — "1 ห้อง • 22
                      แอร์", a room count narrowed to the result next to a unit
                      count for the whole building. Identical when nothing is
                      filtered, which is why it went unnoticed. */}
                  <p className="truncate text-xs text-muted-foreground">
                    <span className="font-mono">{b.abbreviation}</span> •{" "}
                    {/* Floors are whatever distinct `floor` the rooms carry — there
                        is no floors table — so this counts off the same rooms as
                        the other two figures, and a room without a floor is one
                        floor of its own, as groupByFloor shows it below. */}
                    {new Set(b.rooms.map((r) => r.floor)).size} ชั้น • {b.rooms.length} ห้อง •{" "}
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
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate">ห้อง {r.name}</span>
                        <button
                          type="button"
                          onClick={() => setEditRoom({ id: r.id, name: r.name, floor: r.floor ?? null, unitCount: r.acUnits.length })}
                          aria-label={`แก้ไขห้อง ${r.name}`}
                          className="shrink-0 rounded-md p-1 font-normal text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </span>
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
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 items-start gap-2.5">
                              <UnitPhoto src={ac.photoUrl} acCode={ac.acCode} size="sm" />
                              <div className="min-w-0">
                                <div className="font-mono font-bold text-foreground text-sm break-all">{ac.acCode}</div>
                                <div className="text-[11px] text-muted-foreground mt-0.5">
                                  {ac.brand} {ac.model ? `• ${ac.model}` : ""}
                                  <CatalogueMark brandDeleted={ac.brandDeleted} modelDeleted={ac.modelDeleted} className="ml-1" />
                                </div>
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap ${acStatusTone(ac.status)}`}>
                              {acStatusLabel(ac.status)}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-border">
                            <button
                              onClick={() => handleOpenEditAc(ac)}
                              aria-label={`แก้ไขเครื่อง ${ac.acCode}`}
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
      {showAddBuilding && <AddBuildingModal isPending={isPending} onClose={() => setShowAddBuilding(false)} onSubmit={handleAddBuilding} />}

      {/* Add Room Modal */}
      {showAddRoom && <AddRoomModal target={showAddRoom} isPending={isPending} onClose={() => setShowAddRoom(null)} onSubmit={handleAddRoom} />}

      {editBuilding && <EditBuildingModal target={editBuilding} isPending={isPending} onClose={() => setEditBuilding(null)} onSubmit={handleEditBuilding} />}
      {editRoom && <EditRoomModal target={editRoom} isPending={isPending} onClose={() => setEditRoom(null)} onSubmit={handleEditRoom} />}

      {/* Add AC Modal */}
      {showAddAc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">ลงทะเบียนเครื่องปรับอากาศ</h3>
              <button onClick={closeAddAc} aria-label="ปิด" className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddAc} className="space-y-4 text-xs">
              
              <BrandModelPicker
                brands={catalogue}
                value={addPicked}
                onChange={setAddPicked}
                onCatalogueChanged={reloadCatalogue}
                btu={addBtu}
                onBtuSuggest={setAddBtu}
              />

              <div>
                <label className="mb-1.5 block font-bold text-foreground">ขนาด BTU (ไม่บังคับ)</label>
                <input
                  name="btu"
                  type="number"
                  min="1"
                  step="1"
                  value={addBtu}
                  onChange={(e) => setAddBtu(e.target.value)}
                  placeholder="เช่น 18000"
                  {...nativeValidity({ rangeUnderflow: "ขนาด BTU ต้องมากกว่า 0", stepMismatch: "ขนาด BTU ต้องเป็นจำนวนเต็ม", badInput: "ขนาด BTU ต้องเป็นตัวเลข" })}
                  className="w-full rounded-xl border border-border px-3.5 py-2.5 text-foreground focus:border-primary focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">รุ่นจากระบบ: ไม่กรอก = ใช้ BTU ของรุ่น · รุ่นที่เพิ่มใหม่จะเก็บค่านี้เป็นค่าเริ่มต้นของรุ่น</p>
              </div>

              <UnitPhotoField required disabled={isPending} />

              <div>
                <label className="mb-1.5 block font-bold text-foreground">
                  วันที่ติดตั้ง (ไม่บังคับ)
                </label>
                <input
                  name="installedAt"
                  type="date"
                  {...installDateLimits()}
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
              <button aria-label="ปิด" onClick={() => setShowEditAc(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateAc} className="space-y-4 text-xs">

              {isLoadingEditAc ? (
                <p className="rounded-xl border border-dashed border-border px-3.5 py-3 text-muted-foreground">
                  กำลังโหลดยี่ห้อและรุ่นของเครื่อง...
                </p>
              ) : (
                <BrandModelPicker
                  brands={catalogue}
                  value={editPicked}
                  onChange={setEditPicked}
                  onCatalogueChanged={reloadCatalogue}
                  btu={editBtu}
                  onBtuSuggest={setEditBtu}
                />
              )}

              <div>
                <label className="mb-1.5 block font-bold text-foreground">ขนาด BTU (ไม่บังคับ)</label>
                <input
                  name="btu"
                  type="number"
                  min="1"
                  step="1"
                  value={editBtu}
                  onChange={(e) => setEditBtu(e.target.value)}
                  placeholder="เช่น 18000"
                  {...nativeValidity({ rangeUnderflow: "ขนาด BTU ต้องมากกว่า 0", stepMismatch: "ขนาด BTU ต้องเป็นจำนวนเต็ม", badInput: "ขนาด BTU ต้องเป็นตัวเลข" })}
                  className="w-full rounded-xl border border-border px-3.5 py-2.5 text-foreground focus:border-primary focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">รุ่นจากระบบ: เว้นว่าง = ใช้ BTU ของรุ่น</p>
              </div>

              <div>
                <label className="mb-1.5 block font-bold text-foreground">สถานะเครื่อง</label>
                <NativeSelect name="status" required defaultValue={showEditAc.status} className="w-full h-auto py-3 px-3.5 rounded-xl border-border text-xs text-foreground">
                  <NativeSelectOption value="normal">{AC_STATUS_LABEL.normal}</NativeSelectOption>
                  <NativeSelectOption value="broken">{AC_STATUS_LABEL.broken}</NativeSelectOption>
                  <NativeSelectOption value="needs_cleaning">{AC_STATUS_LABEL.needs_cleaning}</NativeSelectOption>
                </NativeSelect>
              </div>

              <UnitPhotoField
                currentUrl={editAcPhotoUrl}
                disabled={isPending || isLoadingEditAc || editAcLoadFailed}
                hint={editAcPhotoUrl ? "เว้นว่าง = ใช้รูปเดิม" : "เครื่องนี้ยังไม่มีรูป — เพิ่มได้ที่นี่"}
              />

              <div>
                <label className="mb-1.5 block font-bold text-foreground">
                  วันที่ติดตั้ง (ไม่บังคับ)
                </label>
                <input
                  name="installedAt"
                  type="date"
                  {...installDateLimits()}
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
      {showPmSettings && <PmSettingsModal unit={showPmSettings} isPending={isPending} onClose={() => setShowPmSettings(null)} onSubmit={handleSavePmSettings} />}

      {/* QR Code Modal */}
      {showQrCode && <QrCodeModal unit={showQrCode} onClose={() => setShowQrCode(null)} />}

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

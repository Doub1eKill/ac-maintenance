"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Printer, X, CheckSquare, Hash } from "lucide-react";
import { toast } from "sonner";
import {
  BuildingGroupList,
  FloorGroupList,
  RoomGroupList,
  groupByBuilding,
  groupByFloor,
  groupByRoom,
} from "@/components/shared/building-groups";
import { CatalogueMark } from "@/components/shared/catalogue-mark";
import {
  StickerCard,
  openStickerSheet,
  roomSequenceOf,
  qrTargetUrl,
  STICKERS_PER_SHEET,
} from "@/components/shared/qr-sticker";
import { useEscapeToClose } from "@/hooks/use-escape-to-close";
import { formatUnitLocation } from "@/lib/location";

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

interface FlatACUnit extends ACUnit {
  buildingId: string;
  buildingName: string;
  roomId: string;
  roomName: string;
  floor: number | null;
  /** Which unit this is inside its room. Null if the code cannot be read. */
  roomSequence: number | null;
  /** How many units the room holds, for context under the sequence. */
  roomUnitsCount: number;
}

/**
 * Which unit this is inside its room, read off the code rather than counted
 * from the list.
 *
 * acCode is `[BLDG]-[ROOM]-[NN]` (see createAirConditionerAction) and NN is
 * assigned once, then printed on the sticker that goes on the machine. Using
 * the unit's position in the room's list instead would renumber a machine
 * whenever another one in the same room is removed — the sticker on the wall
 * would stay where it is and start disagreeing with the screen.
 *
 * Room names contain dashes of their own ("6-53142"), so the sequence is the
 * last segment, not the third.
 */
interface QrCodeManagerProps {
  buildings: BuildingItem[];
  globalSearch: string;
}

// One control for all three depths. "Select everything under this header"
// means the same thing whether the header is a building, a floor or a room,
// so it is one component rather than three copies free to drift apart.
//
// The indeterminate state is what makes a four-level tree selectable at all.
// Tick one room and the floor and building above it have to show that
// something inside them is chosen — otherwise a partly-selected floor looks
// exactly like an empty one, and the only way to find your own selection
// again is to open every floor one by one.
function SelectAllToggle({
  label,
  items,
  selected,
  onToggle,
}: {
  label: string;
  items: { id: string }[];
  selected: Set<string>;
  onToggle: () => void;
}) {
  const selectedCount = items.reduce((n, ac) => (selected.has(ac.id) ? n + 1 : n), 0);
  const allSelected = items.length > 0 && selectedCount === items.length;

  return (
    <label
      // Stops the click reaching the header, which would open or close the
      // group underneath — selecting a floor should not also expand it.
      className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="checkbox"
        className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-ring cursor-pointer"
        checked={allSelected}
        // `indeterminate` is a DOM property with no HTML attribute behind it,
        // so JSX cannot set it — it has to be written onto the node.
        ref={(el) => {
          if (el) el.indeterminate = selectedCount > 0 && !allSelected;
        }}
        onChange={onToggle}
      />
      {label}
    </label>
  );
}

export function QrCodeManager({ buildings, globalSearch }: QrCodeManagerProps) {
  const [showQrCode, setShowQrCode] = useState<FlatACUnit | null>(null);
  const [selectedAcs, setSelectedAcs] = useState<string[]>([]);

  // The preview modal shows a code and a print button and holds nothing the
  // user typed, so Escape can close it outright.
  useEscapeToClose(() => setShowQrCode(null), showQrCode !== null);

  // Flatten ACs
  const allAcs: FlatACUnit[] = buildings.flatMap((b) =>
    b.rooms.flatMap((r) =>
      r.acUnits.map((ac) => ({
        ...ac,
        buildingId: b.id,
        buildingName: b.name,
        roomId: r.id,
        roomName: r.name,
        floor: r.floor,
        roomSequence: roomSequenceOf(ac.acCode),
        roomUnitsCount: r.acUnits.length,
      }))
    )
  );

  // Filter ACs based on globalSearch
  const filteredAcs = allAcs.filter((ac) => {
    if (!globalSearch.trim()) return true;
    const s = globalSearch.toLowerCase();
    return (
      ac.acCode.toLowerCase().includes(s) ||
      ac.brand.toLowerCase().includes(s) ||
      (ac.model && ac.model.toLowerCase().includes(s)) ||
      ac.buildingName.toLowerCase().includes(s) ||
      ac.roomName.toLowerCase().includes(s)
    );
  });

  const groups = groupByBuilding(filteredAcs);
  // Built once per render: the three levels of select-all headers each count
  // their own selected units, so a plain array would be scanned again for
  // every unit on screen.
  const selectedSet = new Set(selectedAcs);

  // Takes anything with items, so the same tick works on a whole building and
  // on one room inside it.
  const toggleSelectAllInGroup = (group: { items: FlatACUnit[] }) => {
    const ids = group.items.map((ac) => ac.id);
    const allSelected = ids.every((id) => selectedAcs.includes(id));

    if (allSelected) {
      setSelectedAcs((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedAcs((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedAcs(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBatchPrint = () => {
    const html = document.getElementById("batch-print-area")?.innerHTML;
    // Only reachable if the hidden container failed to render, which is a bug
    // rather than anything the admin did — but silence would send them looking
    // at the printer for it.
    if (!html) {
      toast.error("เตรียมข้อมูลสำหรับพิมพ์ไม่สำเร็จ กรุณาโหลดหน้าใหม่แล้วลองอีกครั้ง");
      return;
    }
    openStickerSheet(html, `พิมพ์ QR Code (${selectedAcs.length} เครื่อง)`);
  };

  return (
    <div className="space-y-4">
      <div className="biz-card p-6 space-y-6 animate-in fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border pb-4 gap-4">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <QrCode className="h-5 w-5 text-foreground" />
            <span>จัดการ QR Code เครื่องปรับอากาศ ({filteredAcs.length} เครื่อง)</span>
          </h2>
        </div>

        <BuildingGroupList
          groups={groups}
          getSubtitle={(g) => `${g.items.length} เครื่อง`}
          emptyMessage="ไม่พบข้อมูลเครื่องปรับอากาศ"
          resetKey={globalSearch}
          renderExtra={(group) => (
            <SelectAllToggle
              label="เลือกทั้งอาคาร"
              items={group.items}
              selected={selectedSet}
              onToggle={() => toggleSelectAllInGroup(group)}
            />
          )}
          renderItems={(group) => (
            <FloorGroupList
              floors={groupByFloor(group.items)}
              getSubtitle={(floor) =>
                `${new Set(floor.items.map((i) => i.roomId)).size} ห้อง • ${floor.items.length} เครื่อง`
              }
              renderExtra={(floor) => (
                <SelectAllToggle
                  label="เลือกทั้งชั้น"
                  items={floor.items}
                  selected={selectedSet}
                  onToggle={() => toggleSelectAllInGroup(floor)}
                />
              )}
              renderItems={(floor) => (
                <RoomGroupList
                  rooms={groupByRoom(floor.items)}
                  getSubtitle={(room) => `${room.items.length} เครื่อง`}
                  renderExtra={(room) => (
                    <SelectAllToggle
                      label="เลือกทั้งห้อง"
                      items={room.items}
                      selected={selectedSet}
                      onToggle={() => toggleSelectAllInGroup(room)}
                    />
                  )}
                  renderItems={(room) => (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-muted text-muted-foreground font-bold border-b border-border">
                          <tr>
                            {/* Deliberately empty. This used to hold a second
                                select-all for the room — the same action, in
                                the same state, a few pixels below the labelled
                                "เลือกทั้งห้อง" on the header above it. The
                                header one wins: it says what it does, and it
                                works without expanding the room first. */}
                            <th className="px-4 py-3 font-semibold rounded-tl-xl w-10 text-center" />
                            <th className="px-4 py-3 font-semibold">รหัสเครื่อง (AC Code)</th>
                            <th className="px-4 py-3 font-semibold">ยี่ห้อ / รุ่น</th>
                            <th className="px-4 py-3 font-semibold text-center rounded-tr-xl">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {room.items.map((ac) => (
                            <tr
                              key={ac.id}
                              className={`transition-colors cursor-pointer ${selectedAcs.includes(ac.id) ? 'bg-primary/10' : 'hover:bg-muted'}`}
                              onClick={() => toggleSelect(ac.id)}
                            >
                              <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 rounded border-border text-primary focus:ring-ring cursor-pointer"
                                  checked={selectedAcs.includes(ac.id)}
                                  onChange={() => toggleSelect(ac.id)}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-mono font-bold text-foreground">{ac.acCode}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-foreground">
                                  {ac.brand}
                                  <CatalogueMark brandDeleted={ac.brandDeleted} modelDeleted={ac.modelDeleted} className="ml-1" />
                                </div>
                                <div className="text-xs text-muted-foreground">{ac.model || "-"}</div>
                              </td>
                              <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => setShowQrCode(ac)}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold text-foreground hover:bg-accent transition-colors"
                                >
                                  <Printer className="h-3.5 w-3.5" /> ดูตัวอย่าง
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
              )}
                />
          )}
            />
          )}
        />

        {/* Hidden Container for Batch Print Data.
            Kept in selection order rather than list order: the ticks are what
            the person just did, so a sheet that comes out in that order is the
            one they can check against what they picked. */}
        <div id="batch-print-area" className="hidden">
          {selectedAcs.map((id) => {
            const ac = allAcs.find((a) => a.id === id);
            if (!ac) return null;
            return <StickerCard key={ac.id} ac={ac} />;
          })}
        </div>

        {/* Single QR Code Modal Preview */}
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
                {/* force-light: a code meant to be scanned off the screen, so
                    it stays a plain white card with dark marks whatever the
                    dashboard's theme is. */}
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
                    {/* On screen for the same reason it is on the sticker: the
                        preview should say what comes out of the printer. */}
                    <div className="text-[10px] text-muted-foreground font-medium">
                      {showQrCode.btu ? `${showQrCode.btu.toLocaleString()} BTU` : "ไม่ระบุ BTU"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Screen only. The sticker carries the same sequence, but it
                  has no room for the building and floor, which are what make
                  "unit 3" mean something while standing at a desk. */}
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

              {/* The sticker this button prints, rendered hidden so it is
                  the same component the batch sheet uses. The visible card
                  above is the on-screen preview; this is the artifact. */}
              <div id="single-sticker-print-area" className="hidden">
                <StickerCard ac={showQrCode} />
              </div>

              <button
                onClick={() => {
                  const html = document.getElementById("single-sticker-print-area")?.innerHTML;
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
      </div>

      {selectedAcs.length > 0 && (
        // Same bar, same reason, same edge as the technician's: stickers are
        // picked across floors and rooms, so the count and the print button
        // were left behind the moment the list got long. Rendered last so
        // bottom-0 has something to hold it there.
        //
        // The opaque background lives on the wrapper — the bar itself is a
        // translucent tint, which the list would otherwise show through.
        <div className="sticky bottom-0 z-30 bg-background/95 py-2 backdrop-blur-sm">
          <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-xl text-primary">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-primary text-sm">เลือกแล้ว {selectedAcs.length} รายการ</div>
              <div className="text-xs text-primary">
                A4 แผ่นละ {STICKERS_PER_SHEET} ดวง · ใช้{" "}
                {Math.ceil(selectedAcs.length / STICKERS_PER_SHEET)} แผ่น
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedAcs([])}
              className="text-xs font-bold text-primary hover:text-primary px-3 py-2 rounded-lg hover:bg-primary/20 transition-colors"
            >
              ยกเลิกทั้งหมด
            </button>
            <button
              onClick={handleBatchPrint}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-primary/20 hover:bg-primary/90 transition-colors"
            >
              <Printer className="w-4 h-4" /> พิมพ์ QR Code ({selectedAcs.length})
            </button>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}

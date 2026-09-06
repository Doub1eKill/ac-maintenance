"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Printer, X, CheckSquare } from "lucide-react";
import {
  BuildingGroupList,
  FloorGroupList,
  RoomGroupList,
  groupByBuilding,
  groupByFloor,
  groupByRoom,
} from "@/components/shared/building-groups";
import { CatalogueMark } from "@/components/shared/catalogue-mark";
import { useEscapeToClose } from "@/hooks/use-escape-to-close";

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
  location: string;
  buildingId: string;
  buildingName: string;
  roomId: string;
  roomName: string;
  floor: number | null;
}

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
        location: `${b.name} - ห้อง ${r.name}`,
        buildingId: b.id,
        buildingName: b.name,
        roomId: r.id,
        roomName: r.name,
        floor: r.floor,
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
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const html = document.getElementById("batch-print-area")?.innerHTML;

    printWindow.document.write(`
      <html>
        <head>
          <title>พิมพ์ QR Code (${selectedAcs.length} เครื่อง)</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: sans-serif;
            }
            @page {
              size: A4;
              margin: 10mm;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
            }
            .sticker-container {
              border: 1px dashed #cbd5e1;
              border-radius: 12px;
              padding: 15px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              page-break-inside: avoid;
              background-color: white;
            }
            .ac-code {
              font-family: monospace;
              font-size: 18px;
              font-weight: bold;
              margin-top: 12px;
              letter-spacing: 1px;
              color: #0f172a;
            }
            .ac-brand {
              font-size: 11px;
              color: #64748b;
              margin-top: 4px;
            }
            .ac-cta {
              font-size: 11px;
              color: #0284c7;
              font-weight: bold;
              margin-top: 8px;
              padding: 4px 8px;
              background-color: #f0f9ff;
              border-radius: 6px;
            }
            svg {
              border-radius: 8px;
            }
          </style>
        </head>
        <body>
          <div class="grid">
            ${html}
          </div>
          <script>
            window.onload = () => { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-4">
      {selectedAcs.length > 0 && (
        <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-xl text-primary">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-primary text-sm">เลือกแล้ว {selectedAcs.length} รายการ</div>
              <div className="text-xs text-primary">พร้อมสำหรับพิมพ์ลงสติ๊กเกอร์ A4</div>
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
      )}

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

        {/* Hidden Container for Batch Print Data */}
        <div id="batch-print-area" className="hidden">
          {selectedAcs.map((id) => {
            const ac = allAcs.find(a => a.id === id);
            if (!ac) return null;
            return (
              <div key={ac.id} className="sticker-container">
                <QRCodeSVG
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/qr/${ac.qrCode}`}
                  size={120}
                  level="H"
                  includeMargin={true}
                />
                <div className="ac-code">{ac.acCode}</div>
                <div className="ac-brand">{ac.brand} {ac.model ? `(${ac.model})` : ""}</div>
                <div className="ac-cta">สแกนเพื่อแจ้งซ่อม / ดูประวัติ</div>
              </div>
            );
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

              <div className="flex justify-center" id="single-qr-print-area">
                {/* force-light: printed/scanned artifact, stays a plain white
                    card with dark text regardless of the dashboard's theme. */}
                <div className="force-light bg-card p-4 rounded-2xl border-2 border-border shadow-sm flex flex-col items-center gap-3">
                  <QRCodeSVG
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/qr/${showQrCode.qrCode}`}
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
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  const printWindow = window.open("", "_blank");
                  if (!printWindow) return;
                  const qrHtml = document.getElementById("single-qr-print-area")?.innerHTML;
                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>Print QR Code - ${showQrCode.acCode}</title>
                        <style>
                          body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: sans-serif; }
                          .print-container { text-align: center; padding: 20px; border: 2px dashed #ccc; border-radius: 12px; }
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
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow-md shadow-slate-900/20"
              >
                <Printer className="w-4 h-4" /> พิมพ์ (Print)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

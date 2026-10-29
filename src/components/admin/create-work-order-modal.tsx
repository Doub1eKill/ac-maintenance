"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { RoomCascadePicker } from "@/components/shared/room-cascade-picker";
import type { BuildingItem, PendingUser } from "@/components/admin/types";
import type { RoomOption } from "@/lib/tech/pages";

interface CreateWorkOrderModalProps {
  open: boolean;
  defaultAcId: string | null;
  buildings: BuildingItem[];
  activeTechnicians: PendingUser[];
  isPending: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

function findRoomForAc(buildings: BuildingItem[], acId: string | null) {
  if (!acId) return null;
  for (const building of buildings) {
    for (const room of building.rooms) {
      if (room.acUnits.some((ac) => ac.id === acId)) return room.id;
    }
  }
  return null;
}

// The picker takes the flat shape the technician pages load; the admin
// already holds the same rooms nested under their buildings, so they are
// flattened here rather than fetched a second time.
function toRoomOptions(buildings: BuildingItem[]): RoomOption[] {
  return buildings.flatMap((building) =>
    building.rooms.map((room) => ({
      id: room.id,
      label: `${building.name} · ${room.floor === null ? "ไม่ระบุชั้น" : `ชั้น ${room.floor}`} · ห้อง ${room.name}`,
      buildingName: building.name,
      buildingId: building.id,
      floor: room.floor,
      roomName: room.name,
    }))
  );
}

export function CreateWorkOrderModal({
  open,
  defaultAcId,
  buildings,
  activeTechnicians,
  isPending,
  onClose,
  onSubmit,
}: CreateWorkOrderModalProps) {
  // The provider mounts this only while open, so the selection is seeded in
  // the initialisers; if the unit it was opened for changes while open, the
  // selection is re-seeded during render (React's "adjust state on prop
  // change" form) rather than from an effect a frame later.
  const seed = () => ({
    roomId: findRoomForAc(buildings, defaultAcId),
    acId: defaultAcId ?? "",
  });
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(() => seed().roomId);
  const [selectedAcId, setSelectedAcId] = useState(() => seed().acId);
  const [seededFor, setSeededFor] = useState(defaultAcId);
  if (seededFor !== defaultAcId) {
    setSeededFor(defaultAcId);
    const next = seed();
    setSelectedRoomId(next.roomId);
    setSelectedAcId(next.acId);
  }
  void open;

  const rooms = useMemo(() => toRoomOptions(buildings), [buildings]);

  const acUnitsForRoom = useMemo(() => {
    if (!selectedRoomId) return [];
    for (const building of buildings) {
      const room = building.rooms.find((r) => r.id === selectedRoomId);
      if (room) return room.acUnits;
    }
    return [];
  }, [buildings, selectedRoomId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-base font-bold text-foreground">สร้างใบงานซ่อมบำรุง</h3>
          <button aria-label="ปิด" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs">
          <div>
            <label className="mb-1.5 block font-bold text-foreground">ห้องที่ติดตั้งเครื่อง</label>
            {/* Building, floor, room — the same narrowing picker the
                technician's register-unit form uses, so the two screens
                pick a room the same way. A step above the room changing
                hands back null, and the unit chosen for the old room goes
                with it. */}
            <RoomCascadePicker
              rooms={rooms}
              value={selectedRoomId}
              onChange={(roomId) => {
                setSelectedRoomId(roomId);
                setSelectedAcId("");
              }}
            />
          </div>

          <div>
            <label className="mb-1.5 block font-bold text-foreground">เลือกเครื่องปรับอากาศ</label>
            <NativeSelect
              name="airConditionerId"
              value={selectedAcId}
              disabled={!selectedRoomId}
              onChange={(e) => setSelectedAcId(e.target.value)}
              className="w-full h-auto py-3 px-3.5 rounded-xl border-border bg-muted text-xs text-foreground disabled:opacity-50"
            >
              <NativeSelectOption value="" disabled>
                {selectedRoomId
                  ? acUnitsForRoom.length === 0
                    ? "-- ห้องนี้ยังไม่มีเครื่องปรับอากาศ --"
                    : "-- เลือกเครื่องปรับอากาศ --"
                  : "-- เลือกห้องก่อน --"}
              </NativeSelectOption>
              {acUnitsForRoom.map((unit) => (
                <NativeSelectOption key={unit.id} value={unit.id}>
                  {unit.acCode} — {unit.brand}{unit.btu ? ` (${unit.btu} BTU)` : ""}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div>
            <label className="mb-1.5 block font-bold text-foreground">ประเภทงาน</label>
            <NativeSelect
              name="type"
              defaultValue="repair"
              className="w-full h-auto py-3 px-3.5 rounded-xl border-border bg-muted text-xs text-foreground"
            >
              <NativeSelectOption value="repair">งานซ่อม</NativeSelectOption>
              <NativeSelectOption value="cleaning">งานล้างแอร์</NativeSelectOption>
            </NativeSelect>
          </div>

          <div>
            <label className="mb-1.5 block font-bold text-foreground">ระดับความเร่งด่วน</label>
            <NativeSelect
              name="priority"
              defaultValue="low"
              className="w-full h-auto py-3 px-3.5 rounded-xl border-border bg-muted text-xs text-foreground"
            >
              <NativeSelectOption value="low">ปกติ</NativeSelectOption>
              <NativeSelectOption value="high">ด่วน (High)</NativeSelectOption>
              <NativeSelectOption value="critical">ด่วนที่สุด (Critical)</NativeSelectOption>
            </NativeSelect>
          </div>

          <div>
            <label className="mb-1.5 block font-bold text-foreground">มอบหมายช่างเทคนิค (ไม่บังคับ)</label>
            <NativeSelect name="assignToUserId" defaultValue="" className="w-full h-auto py-3 px-3.5 rounded-xl border-border bg-muted text-xs text-foreground">
              <NativeSelectOption value="">-- ไม่ระบุช่าง --</NativeSelectOption>
              {activeTechnicians.map((tech) => (
                <NativeSelectOption key={tech.id} value={tech.id}>
                  {tech.name} (ช่างซ่อมบำรุง)
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 rounded-xl border border-border py-2.5 font-bold text-foreground hover:bg-secondary"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="w-1/2 rounded-xl bg-primary py-2.5 font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? "กำลังสร้าง..." : "ยืนยันการสร้างใบงาน"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

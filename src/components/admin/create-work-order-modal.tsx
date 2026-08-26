"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import type { BuildingItem, PendingUser } from "@/components/admin/types";

interface CreateWorkOrderModalProps {
  open: boolean;
  defaultAcId: string | null;
  buildings: BuildingItem[];
  activeTechnicians: PendingUser[];
  isPending: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

function findLocationForAc(buildings: BuildingItem[], acId: string | null) {
  if (!acId) return null;
  for (const building of buildings) {
    for (const room of building.rooms) {
      if (room.acUnits.some((ac) => ac.id === acId)) {
        return { buildingId: building.id, roomId: room.id };
      }
    }
  }
  return null;
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
  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedAcId, setSelectedAcId] = useState("");

  useEffect(() => {
    if (!open) return;
    const location = findLocationForAc(buildings, defaultAcId);
    setSelectedBuildingId(location?.buildingId ?? "");
    setSelectedRoomId(location?.roomId ?? "");
    setSelectedAcId(defaultAcId ?? "");
  }, [open, defaultAcId, buildings]);

  const roomsForBuilding = useMemo(
    () => buildings.find((b) => b.id === selectedBuildingId)?.rooms ?? [],
    [buildings, selectedBuildingId]
  );

  const acUnitsForRoom = useMemo(
    () => roomsForBuilding.find((r) => r.id === selectedRoomId)?.acUnits ?? [],
    [roomsForBuilding, selectedRoomId]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-base font-bold text-foreground">สร้างใบงานซ่อมบำรุง</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs">
          <div>
            <label className="mb-1.5 block font-bold text-foreground">เลือกอาคาร</label>
            <NativeSelect
              value={selectedBuildingId}
              onChange={(e) => {
                setSelectedBuildingId(e.target.value);
                setSelectedRoomId("");
                setSelectedAcId("");
              }}
              className="w-full h-auto py-3 px-3.5 rounded-xl border-border bg-muted text-xs text-foreground"
            >
              <NativeSelectOption value="" disabled>-- เลือกอาคาร --</NativeSelectOption>
              {buildings.map((b) => (
                <NativeSelectOption key={b.id} value={b.id}>
                  {b.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div>
            <label className="mb-1.5 block font-bold text-foreground">เลือกห้อง</label>
            <NativeSelect
              value={selectedRoomId}
              disabled={!selectedBuildingId}
              onChange={(e) => {
                setSelectedRoomId(e.target.value);
                setSelectedAcId("");
              }}
              className="w-full h-auto py-3 px-3.5 rounded-xl border-border bg-muted text-xs text-foreground disabled:opacity-50"
            >
              <NativeSelectOption value="" disabled>
                {selectedBuildingId ? "-- เลือกห้อง --" : "-- เลือกอาคารก่อน --"}
              </NativeSelectOption>
              {roomsForBuilding.map((r) => (
                <NativeSelectOption key={r.id} value={r.id}>
                  ห้อง {r.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
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
                {selectedRoomId ? "-- เลือกเครื่องปรับอากาศ --" : "-- เลือกห้องก่อน --"}
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

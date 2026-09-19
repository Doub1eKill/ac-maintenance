"use client";

import { useMemo, useState } from "react";
import { Building2, CheckCircle2, DoorOpen, Layers, Search } from "lucide-react";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { matchesQuery } from "@/lib/search";
import type { RoomOption } from "@/lib/tech/pages";

interface RoomCascadePickerProps {
  rooms: RoomOption[];
  value: string | null;
  // null when a step above the room changes: the room chosen before no
  // longer applies, and the form must not submit it.
  onChange: (roomId: string | null) => void;
}

const floorLabel = (floor: number | null) => (floor === null ? "ไม่ระบุชั้น" : `ชั้น ${floor}`);
// A key a floor can be looked up by; null is a floor of its own.
const floorKey = (floor: number | null) => (floor === null ? "none" : String(floor));

/**
 * Picks a room by narrowing — building, then floor, then room — with a
 * search box above the steps for anyone who already knows the room number.
 *
 * One flat list of every room ("Administration Building 293183 · ชั้น 1 ·
 * ห้อง 1-19179" × 32) was too much to scroll on a phone, and a technician
 * standing in the room either knows its number or can read it off the door
 * — so the search takes a room number and fills all three steps in one tap,
 * while the steps themselves offer a handful of choices at a time. The
 * building is a native select (the phone's own picker, five entries); floors
 * and rooms are tap targets, since each set is small.
 */
export function RoomCascadePicker({ rooms, value, onChange }: RoomCascadePickerProps) {
  const selected = useMemo(() => rooms.find((r) => r.id === value) ?? null, [rooms, value]);

  // The steps' own state, so a building or floor can be chosen before a room
  // is. A room chosen from outside (the search, or a value handed in) is what
  // the steps show — derived here rather than synced in an effect.
  const [stepBuilding, setStepBuilding] = useState<string | null>(null);
  const [stepFloor, setStepFloor] = useState<string | null>(null);
  const [lastValue, setLastValue] = useState<string | null>(value);
  if (lastValue !== value) {
    setLastValue(value);
    if (selected) {
      setStepBuilding(selected.buildingId);
      setStepFloor(floorKey(selected.floor));
    }
  }
  const buildingId = selected?.buildingId ?? stepBuilding;
  const floor = selected ? floorKey(selected.floor) : stepFloor;

  const buildings = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of rooms) if (!seen.has(r.buildingId)) seen.set(r.buildingId, r.buildingName);
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [rooms]);

  const floors = useMemo(() => {
    if (!buildingId) return [];
    const seen = new Map<string, number | null>();
    for (const r of rooms) if (r.buildingId === buildingId && !seen.has(floorKey(r.floor))) seen.set(floorKey(r.floor), r.floor);
    return [...seen.entries()].map(([key, floor]) => ({ key, floor }));
  }, [rooms, buildingId]);

  const roomsOnFloor = useMemo(
    () => (buildingId && floor !== null ? rooms.filter((r) => r.buildingId === buildingId && floorKey(r.floor) === floor) : []),
    [rooms, buildingId, floor]
  );

  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    if (!query.trim()) return [];
    return rooms.filter((r) => matchesQuery(query, r.roomName, r.buildingName, r.label)).slice(0, 8);
  }, [rooms, query]);

  const pickFromSearch = (room: RoomOption) => {
    setQuery("");
    setStepBuilding(room.buildingId);
    setStepFloor(floorKey(room.floor));
    onChange(room.id);
  };

  const chip = (active: boolean) =>
    `inline-flex min-h-11 items-center justify-center rounded-xl border px-3.5 text-xs font-bold transition-colors ${
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border bg-card text-foreground hover:bg-secondary"
    }`;

  return (
    <div className="space-y-3">
      {/* The shortcut: a room number in, all three steps out. */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="พิมพ์เลขห้อง เช่น 1-19179"
          aria-label="ค้นหาห้อง"
          className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
        {query.trim() && (
          <ul
            role="listbox"
            aria-label="ห้องที่ตรงกับคำค้น"
            className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-card shadow-lg"
          >
            {matches.length === 0 ? (
              <li className="px-3 py-3 text-xs text-muted-foreground">ไม่พบห้องที่ค้นหา</li>
            ) : (
              matches.map((room) => (
                <li key={room.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={room.id === value}
                    onClick={() => pickFromSearch(room)}
                    className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left hover:bg-secondary"
                  >
                    <DoorOpen className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-foreground">ห้อง {room.roomName}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {room.buildingName} · {floorLabel(room.floor)}
                      </span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {/* Step 1: the building. */}
      <div>
        <label className="mb-1 flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
          <Building2 className="h-3 w-3" /> อาคาร
        </label>
        <NativeSelect
          value={buildingId ?? ""}
          onChange={(e) => {
            setStepBuilding(e.target.value || null);
            setStepFloor(null);
            // A different building: the room chosen before no longer applies.
            onChange(null);
          }}
          className="h-11 text-base"
          aria-label="เลือกอาคาร"
        >
          <NativeSelectOption value="">-- เลือกอาคาร --</NativeSelectOption>
          {buildings.map((b) => (
            <NativeSelectOption key={b.id} value={b.id}>{b.name}</NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      {/* Step 2: the floor, once a building is known. */}
      {buildingId && (
        <div>
          <label className="mb-1 flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
            <Layers className="h-3 w-3" /> ชั้น
          </label>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="เลือกชั้น">
            {floors.map((f) => (
              <button
                key={f.key}
                type="button"
                role="radio"
                aria-checked={floor === f.key}
                onClick={() => {
                  setStepFloor(f.key);
                  onChange(null);
                }}
                className={chip(floor === f.key)}
              >
                {floorLabel(f.floor)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: the room, once a floor is known. */}
      {buildingId && floor !== null && (
        <div>
          <label className="mb-1 flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
            <DoorOpen className="h-3 w-3" /> ห้อง
          </label>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="เลือกห้อง">
            {roomsOnFloor.map((r) => (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={r.id === value}
                onClick={() => onChange(r.id)}
                className={chip(r.id === value)}
              >
                {r.roomName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* What will be submitted, said in full. */}
      {selected && (
        <p className="flex items-start gap-1.5 rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-xs text-success-foreground">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <span className="font-bold">ห้อง {selected.roomName}</span> · {selected.buildingName} · {floorLabel(selected.floor)}
          </span>
        </p>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Building2, ChevronDown, ChevronUp, DoorClosed, Layers } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export interface Buildable {
  buildingId: string;
  buildingName: string;
}

export interface BuildingGroup<T> {
  buildingId: string;
  buildingName: string;
  items: T[];
}

// Groups by buildingId in first-appearance order, then sorts the groups by
// name. A building with zero matching items never gets an entry — "hide
// empty buildings" falls out of grouping from the item list itself instead
// of needing a separate filter step.
export function groupByBuilding<T extends Buildable>(items: T[]): BuildingGroup<T>[] {
  const groups = new Map<string, BuildingGroup<T>>();
  for (const item of items) {
    const existing = groups.get(item.buildingId);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(item.buildingId, { buildingId: item.buildingId, buildingName: item.buildingName, items: [item] });
    }
  }
  return Array.from(groups.values()).sort((a, b) => a.buildingName.localeCompare(b.buildingName, "th"));
}

export interface Floorable {
  floor?: number | null;
}

export interface FloorGroup<T> {
  /** null for rooms with no floor recorded — see groupByFloor. */
  floor: number | null;
  items: T[];
}

// Groups by floor, ordered by the number rather than by its text: sorted as
// strings, floor 10 would come before floor 2. Rooms with no floor recorded
// gather into a single group that sorts last — they are the ones somebody has
// to go and fix, and burying them mid-list would hide that.
export function groupByFloor<T extends Floorable>(items: T[]): FloorGroup<T>[] {
  const groups = new Map<number | null, FloorGroup<T>>();
  for (const item of items) {
    const key = item.floor ?? null;
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(key, { floor: key, items: [item] });
    }
  }
  return Array.from(groups.values()).sort((a, b) => {
    if (a.floor === null) return 1;
    if (b.floor === null) return -1;
    return a.floor - b.floor;
  });
}

export function floorLabel(floor: number | null): string {
  return floor === null ? "ไม่ระบุชั้น" : `ชั้น ${floor}`;
}

interface FloorGroupListProps<T> {
  floors: FloorGroup<T>[];
  getSubtitle: (floor: FloorGroup<T>) => string;
  renderExtra?: (floor: FloorGroup<T>) => ReactNode;
  renderItems: (floor: FloorGroup<T>) => ReactNode;
}

// The middle level: a building opens onto its floors, a floor onto its rooms.
//
// Weighted between the two it sits between — the building header is a filled
// card with a primary-coloured chip, the room header is the lightest, and this
// is in between — so three stacked bars read as three depths rather than as
// three of the same thing.
export function FloorGroupList<T>({ floors, getSubtitle, renderExtra, renderItems }: FloorGroupListProps<T>) {
  const [picked, setPicked] = useState<number | null | "none">(null);

  // Same rule as the rooms: a building with one floor opens onto it, and
  // "closed" has to be expressible separately from "not chosen yet" or that
  // sole floor would reopen itself the moment it was closed.
  const soleFloor = floors.length === 1 ? floors[0].floor : undefined;
  const effectiveFloor =
    picked === "none"
      ? undefined
      : picked !== null && floors.some((f) => f.floor === picked)
        ? picked
        : soleFloor;

  return (
    <div className="space-y-2.5">
      {floors.map((floor) => {
        const isExpanded = effectiveFloor !== undefined && effectiveFloor === floor.floor;
        return (
          <div
            key={floor.floor ?? "none"}
            className="rounded-xl border border-border bg-muted/60 overflow-hidden"
          >
            <div
              className="w-full flex items-center justify-between p-3.5 text-left hover:bg-secondary transition-colors cursor-pointer"
              onClick={() => setPicked(isExpanded ? "none" : floor.floor)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-foreground shrink-0">
                  <Layers className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h4 className="font-bold text-foreground text-[13px]">{floorLabel(floor.floor)}</h4>
                  <p className="text-[11px] text-muted-foreground">{getSubtitle(floor)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {renderExtra?.(floor)}
                <span className="text-muted-foreground">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </span>
              </div>
            </div>
            {isExpanded && <div className="border-t border-border bg-card/40 p-3">{renderItems(floor)}</div>}
          </div>
        );
      })}
    </div>
  );
}

export interface Roomable {
  roomId: string;
  roomName: string;
}

export interface RoomGroup<T> {
  roomId: string;
  roomName: string;
  items: T[];
}

// The same grouping one level in. Rooms are keyed by id rather than name for
// the reason buildings are: two rooms in different buildings can share a name,
// and a room's name is not unique on its own.
export function groupByRoom<T extends Roomable>(items: T[]): RoomGroup<T>[] {
  const groups = new Map<string, RoomGroup<T>>();
  for (const item of items) {
    const existing = groups.get(item.roomId);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(item.roomId, { roomId: item.roomId, roomName: item.roomName, items: [item] });
    }
  }
  return Array.from(groups.values()).sort((a, b) => a.roomName.localeCompare(b.roomName, "th"));
}

interface RoomGroupListProps<T> {
  rooms: RoomGroup<T>[];
  getSubtitle: (room: RoomGroup<T>) => string;
  renderExtra?: (room: RoomGroup<T>) => ReactNode;
  renderItems: (room: RoomGroup<T>) => ReactNode;
}

// The second level of the drill-down: a building opens onto its rooms, and a
// room opens onto its units. Rendered inside BuildingGroupList's renderItems.
//
// Deliberately lighter than the building header — smaller type, a flat border
// instead of a filled card — so the nesting is visible at a glance rather than
// leaving two identical bars stacked on each other. It keeps the same rules
// otherwise: everything closed to start with, one room open at a time, and a
// room with no matching items never appears because grouping never creates it.
//
// No pagination here. Buildings page because there can be many; the rooms
// inside one building are few, and a pager nested inside a pager would be its
// own puzzle.
export function RoomGroupList<T>({ rooms, getSubtitle, renderExtra, renderItems }: RoomGroupListProps<T>) {
  // null means "nothing picked yet", which is not the same as "closed" here:
  // a building holding one room opens onto it directly, so a search narrowed
  // to a single unit does not answer with one collapsed bar inside another.
  // Closing that sole room has to be expressible, hence the explicit sentinel
  // rather than going back to null and reopening itself.
  const [picked, setPicked] = useState<string | null | "none">(null);

  const soleRoomId = rooms.length === 1 ? rooms[0].roomId : null;
  const effectiveExpandedId =
    picked === "none"
      ? null
      : picked !== null && rooms.some((r) => r.roomId === picked)
        ? picked
        : soleRoomId;

  return (
    <div className="space-y-2">
      {rooms.map((room) => {
        const isExpanded = effectiveExpandedId === room.roomId;
        return (
          <div key={room.roomId} className="rounded-lg border border-border bg-card overflow-hidden">
            <div
              className="w-full flex items-center justify-between p-3 text-left hover:bg-secondary transition-colors cursor-pointer"
              onClick={() => setPicked(isExpanded ? "none" : room.roomId)}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-secondary text-foreground shrink-0">
                  <DoorClosed className="h-3 w-3" />
                </span>
                <div className="min-w-0">
                  <h5 className="font-bold text-foreground text-xs">ห้อง {room.roomName}</h5>
                  <p className="text-[11px] text-muted-foreground">{getSubtitle(room)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                {renderExtra?.(room)}
                <span className="text-muted-foreground">
                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </span>
              </div>
            </div>
            {isExpanded && <div className="border-t border-border p-3">{renderItems(room)}</div>}
          </div>
        );
      })}
    </div>
  );
}

interface BuildingGroupListProps<T> {
  groups: BuildingGroup<T>[];
  getSubtitle: (group: BuildingGroup<T>) => string;
  emptyMessage: ReactNode;
  renderExtra?: (group: BuildingGroup<T>) => ReactNode;
  renderItems: (group: BuildingGroup<T>) => ReactNode;
  // Changes whenever the caller's search/building filter changes, so the
  // building-list page resets to 1 the same way the old per-item pagination
  // did (see the per-panel `useEffect(() => setPage(1), [searchQuery, ...])`
  // this replaces).
  resetKey?: string | number;
  buildingsPerPage?: number;
}

// Groups items by building into collapsible sections (all collapsed on mount,
// single one open at a time, matching the admin asset-manager pattern this
// was modeled on) and paginates the *buildings*, not the items — a section
// that's collapsed costs almost no vertical space, so there's no need to also
// cap how many items render inside an expanded one.
export function BuildingGroupList<T>({
  groups,
  getSubtitle,
  emptyMessage,
  renderExtra,
  renderItems,
  resetKey,
  buildingsPerPage = 5,
}: BuildingGroupListProps<T>) {
  // Starts with every building collapsed: the header row already carries the
  // count and the status badges, so the list reads as an overview until the
  // user picks a building. Auto-opening the first one used to bury the other
  // buildings under ~20 rows of the alphabetically-first one.
  // Same sentinel as the two levels below: "closed" has to be distinguishable
  // from "nothing chosen yet", or the sole building would reopen itself.
  const [picked, setPicked] = useState<string | null | "none">(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  if (groups.length === 0) {
    return (
      <div className="py-12 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
        {emptyMessage}
      </div>
    );
  }

  const totalPages = Math.ceil(groups.length / buildingsPerPage);
  const paginatedGroups = groups.slice((page - 1) * buildingsPerPage, page * buildingsPerPage);
  // Falls back to "nothing open" rather than clinging to a building that
  // scrolled off after a filter change — see resetKey above for the same
  // idea applied to the page number.
  // A search that leaves one building open onto it rather than answering with
  // a single collapsed bar; the tree is four levels now and every click that
  // can be spared is worth sparing.
  const soleBuildingId = groups.length === 1 ? groups[0].buildingId : null;
  const effectiveExpandedId =
    picked === "none"
      ? null
      : picked !== null && groups.some((g) => g.buildingId === picked)
        ? picked
        : soleBuildingId;

  return (
    <div className="space-y-3">
      {paginatedGroups.map((group) => {
        const isExpanded = effectiveExpandedId === group.buildingId;
        return (
          <div key={group.buildingId} className="rounded-2xl border border-border bg-muted overflow-hidden">
            <div
              className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary transition-colors cursor-pointer"
              onClick={() => setPicked(isExpanded ? "none" : group.buildingId)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
                  <Building2 className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold text-foreground text-sm">{group.buildingName}</h3>
                  <p className="text-xs text-muted-foreground">{getSubtitle(group)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {renderExtra?.(group)}
                <span className="text-muted-foreground">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </span>
              </div>
            </div>
            {isExpanded && <div className="border-t border-border bg-card p-4">{renderItems(group)}</div>}
          </div>
        );
      })}

      {totalPages > 1 && (
        <div className="py-4 border-t border-border mt-1">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage((p) => Math.max(1, p - 1));
                  }}
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
                  onClick={(e) => {
                    e.preventDefault();
                    setPage((p) => Math.min(totalPages, p + 1));
                  }}
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

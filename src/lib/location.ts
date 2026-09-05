/**
 * The one place a unit's location is turned into a string for display.
 *
 * This used to be assembled inline at seven call sites in four different
 * spellings, so the same air conditioner read differently depending on which
 * endpoint served it:
 *
 *   อาคาร (ตัวย่อ) - ห้อง 1-2 (ชั้น 1)   technician job lists
 *   อาคาร (ตัวย่อ) - ห้อง 1-2            work order board
 *   อาคาร - ห้อง 1-2                     asset list, unit history, dashboard, QR scan
 *   อาคาร - 1-2                          maintenance calendar
 *
 * Gathering them here changed nothing about what any screen printed — that was
 * deliberate, a move rather than a redesign. What it bought is that the four
 * spellings now sit next to each other where the difference is visible instead
 * of being discoverable only by grepping for backticks, and two of them were
 * settled on 4 Sep 2026 once it was:
 *
 * - The calendar no longer drops the "ห้อง" label. Nothing about a calendar
 *   made that read better; it was the one view out of four spelling a room
 *   differently, and it looked like an oversight rather than a decision.
 * - Lists that group their rows by building ask for withBuilding: false. They
 *   print the building on the group header, so repeating it on every row cost
 *   three wrapped lines in a narrow column to say what the header above
 *   already said. The full string stays available for the views that show a
 *   unit on its own, and for searching, where typing a building name still has
 *   to match.
 */
export interface UnitLocationParts {
  name: string;
  floor?: number | null;
  building: { name: string; abbreviation?: string | null };
}

export interface UnitLocationOptions {
  /** Append the building abbreviation in brackets: "อาคาร (B123) - ..." */
  withAbbreviation?: boolean;
  /** Append the floor: "... - ห้อง 1-2 (ชั้น 3)". A room with no floor
   *  recorded prints no floor at all. */
  withFloor?: boolean;
  /** Print the "ห้อง" label before the room name. On by default. */
  withRoomLabel?: boolean;
  /** Print the building at all. On by default; off for lists that are already
   *  grouped by building, where repeating it on every row is noise — see the
   *  note above the function. */
  withBuilding?: boolean;
}

export function formatUnitLocation(
  room: UnitLocationParts,
  options: UnitLocationOptions = {}
): string {
  const {
    withAbbreviation = false,
    withFloor = false,
    withRoomLabel = true,
    withBuilding = true,
  } = options;

  const building =
    withAbbreviation && room.building.abbreviation
      ? `${room.building.name} (${room.building.abbreviation})`
      : room.building.name;

  const roomPart = withRoomLabel ? `ห้อง ${room.name}` : room.name;
  // `?? null` rather than `||`: this used to print "ชั้น 1" for a room whose
  // floor was never recorded — and for a ground floor entered as 0 — which was
  // survivable while the floor was decoration and is not now that the lists
  // navigate by it. No floor recorded, no floor printed.
  const floorPart = withFloor && room.floor != null ? ` (ชั้น ${room.floor})` : "";

  return withBuilding ? `${building} - ${roomPart}${floorPart}` : `${roomPart}${floorPart}`;
}

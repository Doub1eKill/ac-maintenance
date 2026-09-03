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
 * All four are kept exactly as they were — this is a move, not a redesign, and
 * changing what any screen prints belongs in its own change. What it buys is
 * that the four now sit next to each other where the difference is visible,
 * instead of being discoverable only by grepping for backticks.
 *
 * The differences between them look accidental rather than intended, in
 * particular the calendar dropping the "ห้อง" label that every other view
 * prints. Worth settling deliberately later; see HANDOFF.md.
 */
export interface UnitLocationParts {
  name: string;
  floor?: number | null;
  building: { name: string; abbreviation?: string | null };
}

export interface UnitLocationOptions {
  /** Append the building abbreviation in brackets: "อาคาร (B123) - ..." */
  withAbbreviation?: boolean;
  /** Append the floor: "... - ห้อง 1-2 (ชั้น 3)". Falls back to 1, as the
   *  technician lists have always done for a room with no floor recorded. */
  withFloor?: boolean;
  /** Print the "ห้อง" label before the room name. On by default: only the
   *  calendar leaves it out. */
  withRoomLabel?: boolean;
}

export function formatUnitLocation(
  room: UnitLocationParts,
  options: UnitLocationOptions = {}
): string {
  const { withAbbreviation = false, withFloor = false, withRoomLabel = true } = options;

  const building =
    withAbbreviation && room.building.abbreviation
      ? `${room.building.name} (${room.building.abbreviation})`
      : room.building.name;

  const roomPart = withRoomLabel ? `ห้อง ${room.name}` : room.name;
  const floorPart = withFloor ? ` (ชั้น ${room.floor || 1})` : "";

  return `${building} - ${roomPart}${floorPart}`;
}

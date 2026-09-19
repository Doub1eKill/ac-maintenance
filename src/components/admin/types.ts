export interface WorkOrderItem {
  id: string;
  acCode: string;
  brand: string;
  // Whether the brand/model behind that name has been retired from the
  // catalogue. See @/lib/catalogue-status.
  brandDeleted: boolean;
  modelDeleted: boolean;
  btu: number | null;
  // The unit's picture, for the detail dialog's unit line.
  photoUrl: string | null;
  location: string;
  // The same place without the building, for lists grouped under a building
  // header. See @/lib/location.
  roomLocation: string;
  // Where the unit sits, for the floor and room levels of the drill-down.
  roomId: string;
  roomName: string;
  floor: number | null;
  // Split out of `location`, which is assembled for display — the board groups
  // by building and must not parse a formatted string back apart.
  buildingId: string;
  buildingName: string;
  status: string;
  type: "repair" | "cleaning";
  priority: string | null;
  issueDescription: string | null;
  resolutionNotes: string | null;
  images: unknown;
  // The before/after pictures of the log that closed the order, if any.
  logPhotos: { before: string | null; after: string | null } | null;
  reportedByName: string | null;
  assignedToName: string | null;
  assignedAt: string | null;
  claimedByName: string | null;
  claimedAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
  airConditionerId: string;
}

export interface ACUnit {
  id: string;
  acCode: string;
  brand: string;
  model: string | null;
  // Whether the brand/model above has been retired from the catalogue.
  // See @/lib/catalogue-status — the name still resolves either way.
  brandDeleted: boolean;
  modelDeleted: boolean;
  btu: number | null;
  // The unit's picture, or null for one registered before pictures existed.
  photoUrl: string | null;
  status: string;
  qrCode: string;
  maintenanceSchedule: {
    frequencyValue: number;
    frequencyUnit: string;
    nextDueDate: string;
  } | null;
}

export interface RoomItem {
  id: string;
  name: string;
  floor: number | null;
  acUnits: ACUnit[];
}

export interface BuildingItem {
  id: string;
  name: string;
  abbreviation: string;
  unitsCount: number;
  rooms: RoomItem[];
}

export interface WorkOrderPageInfo {
  // Rows in the table, against rows the board actually received. They differ
  // only if WORK_ORDER_BOARD_LIMIT was reached, which the board says on screen
  // rather than showing a short table as though it were the whole thing.
  total: number;
  loaded: number;
  hasMore: boolean;
}

export interface PendingUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatarUrl: string | null;
  createdAt: string | null;
}

/**
 * A pending user with the contact details they gave at registration.
 *
 * Separate from PendingUser rather than an optional field on it, because only
 * the approvals queue loads phones — a directory of forty people that shows
 * none of their numbers should not pay to fetch them.
 */
export interface PendingUserWithContact extends PendingUser {
  phone: string | null;
}

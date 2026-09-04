export interface WorkOrderItem {
  id: string;
  acCode: string;
  brand: string;
  // Whether the brand/model behind that name has been retired from the
  // catalogue. See @/lib/catalogue-status.
  brandDeleted: boolean;
  modelDeleted: boolean;
  btu: number | null;
  location: string;
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
  createdAt: string | null;
}

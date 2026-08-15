export interface WorkOrderItem {
  id: string;
  acCode: string;
  brand: string;
  btu: number | null;
  location: string;
  status: string;
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

export interface PendingUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string | null;
}

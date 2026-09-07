import { matchesQuery } from "@/lib/search";

export interface TechJobItem {
  id: string;
  acCode: string;
  brand: string;
  // Whether the brand/model behind that name has been retired from the
  // catalogue — see @/lib/catalogue-status. Optional because the QR scan
  // result builds a job without them.
  brandDeleted?: boolean;
  modelDeleted?: boolean;
  btu: number | null;
  status: string;
  // Repair or cleaning, straight off the work order. Optional for the same
  // reason as the catalogue flags above: the QR scan result builds a job
  // without one.
  type?: "repair" | "cleaning";
  location: string;
  // The same place without the building, for lists grouped under a building
  // header. See @/lib/location.
  roomLocation: string;
  // The room the unit sits in, for the second level of the drill-down.
  roomId: string;
  roomName: string;
  floor?: number | null;
  buildingId: string;
  buildingName: string;
  priority?: string | null;
  createdAt?: string | null;
  claimedAt?: string | null;
  completedAt?: string | null;
  airConditionerId?: string;
}

export interface Building {
  id: string;
  name: string;
  abbr: string;
}

export function filterJobs<T extends { acCode: string; brand: string; location: string }>(
  jobs: T[],
  searchQuery: string,
  selectedBuilding: string
): T[] {
  return jobs.filter((job) => {
    // Same comparison the pickers in the forms use — see @/lib/search. Behaviour
    // is unchanged from the three inline toLowerCase().includes() this replaced;
    // it just stopped being a fourth private copy of the rule.
    const matchesSearch = matchesQuery(searchQuery, job.acCode, job.brand, job.location);

    const matchesBuilding = selectedBuilding === "all" || job.location.includes(selectedBuilding);

    return matchesSearch && matchesBuilding;
  });
}

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
  location: string;
  // The same place without the building, for lists grouped under a building
  // header. See @/lib/location.
  roomLocation: string;
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
    const matchesSearch =
      job.acCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBuilding = selectedBuilding === "all" || job.location.includes(selectedBuilding);

    return matchesSearch && matchesBuilding;
  });
}

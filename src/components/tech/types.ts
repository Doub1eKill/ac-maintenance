export interface TechJobItem {
  id: string;
  acCode: string;
  brand: string;
  btu: number | null;
  status: string;
  location: string;
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

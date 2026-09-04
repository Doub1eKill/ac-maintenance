"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Building2, ChevronDown, ChevronUp } from "lucide-react";
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
  const [expandedBuildingId, setExpandedBuildingId] = useState<string | null>(null);
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
  const isExpandedValid = groups.some((g) => g.buildingId === expandedBuildingId);
  const effectiveExpandedId = isExpandedValid ? expandedBuildingId : null;

  return (
    <div className="space-y-3">
      {paginatedGroups.map((group) => {
        const isExpanded = effectiveExpandedId === group.buildingId;
        return (
          <div key={group.buildingId} className="rounded-2xl border border-border bg-muted overflow-hidden">
            <div
              className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary transition-colors cursor-pointer"
              onClick={() => setExpandedBuildingId(isExpanded ? null : group.buildingId)}
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

"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { AssetManager } from "@/components/admin/asset-manager";
import { useDashboardSearchControl } from "@/components/layout/dashboard-search";
import type { BuildingItem } from "@/components/admin/types";

export function AssetsClient({
  buildings,
  brands,
}: {
  buildings: BuildingItem[];
  brands: React.ComponentProps<typeof AssetManager>["brands"];
}) {
  const { search, setSearch } = useDashboardSearchControl();
  const seeded = useRef(false);
  // The overview's "ไปดูรายละเอียด" arrives as /admin/assets?q=<ac code>. Seed
  // the header box from it once, so the term is visible and clearable rather
  // than filtering invisibly, and so landing here without ?q= is not overridden
  // on every render.
  const initial = useSearchParams().get("q");

  useEffect(() => {
    if (seeded.current || !initial) return;
    seeded.current = true;
    setSearch(initial);
  }, [initial, setSearch]);

  return (
    <AssetManager
      buildings={buildings}
      brands={brands}
      globalSearch={search}
      onClearSearch={() => setSearch("")}
    />
  );
}

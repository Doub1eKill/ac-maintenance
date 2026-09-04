"use client";

import { QrCodeManager } from "@/components/admin/qr-code-manager";
import { useDashboardSearch } from "@/components/layout/dashboard-search";
import type { BuildingItem } from "@/components/admin/types";

export function QrCodesClient({ buildings }: { buildings: BuildingItem[] }) {
  return <QrCodeManager buildings={buildings} globalSearch={useDashboardSearch()} />;
}

import { Skeleton } from "@/components/ui/skeleton";

interface DashboardLoadingProps {
  /** Metric tiles to outline. Admin shows six, the technician view three. */
  metricCount?: number;
}

/**
 * Placeholder shown while a dashboard's server data is still being fetched.
 *
 * These pages render DashboardLayout from inside page.tsx rather than from a
 * layout.tsx, so until the page resolves there is no shell to look at — the
 * route used to sit on a blank white screen for as long as the slowest query
 * took. This mirrors the real shell (sidebar rail, header bar, metric row,
 * content panel) closely enough that the layout doesn't visibly jump when the
 * data lands.
 *
 * Deliberately plain: the structure is what matters here, the visual treatment
 * is Esther03u's to align with the rest of the design system.
 */
export function DashboardLoading({ metricCount = 6 }: DashboardLoadingProps) {
  return (
    <div className="flex min-h-svh bg-background" aria-busy="true" aria-live="polite">
      <span className="sr-only">กำลังโหลดข้อมูล</span>

      {/* Sidebar rail */}
      <aside className="hidden w-64 shrink-0 flex-col gap-6 border-r border-border p-4 md:flex">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-xl" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-28 rounded-md" />
            <Skeleton className="h-2.5 w-20 rounded-md" />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-xl" />
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header bar — matches the h-16 header in DashboardLayout */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
          <Skeleton className="h-4 w-48 rounded-md" />
          <Skeleton className="h-8 w-40 rounded-xl" />
        </header>

        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
          {/* Metric tiles */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: metricCount }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>

          {/* Main panel (chart or table, depending on the page) */}
          <Skeleton className="h-72 w-full" />

          {/* Secondary list */}
          <div className="flex flex-col gap-3">
            <Skeleton className="h-5 w-56 rounded-md" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

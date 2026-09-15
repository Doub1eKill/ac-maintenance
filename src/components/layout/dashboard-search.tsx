"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * The search box in the dashboard header, shared between the shell that renders
 * it and the page that filters by it.
 *
 * The value is cleared whenever the route changes. Each page searches a
 * different field — the team page searches names, the asset manager searches
 * buildings and rooms, the QR page searches unit codes — so a term carried over
 * from the previous page usually matches nothing on the next one. That is not
 * hypothetical: it is what made the asset manager look empty while its heading
 * still announced five buildings.
 *
 * Kept in context rather than in the URL on purpose. Every panel filters
 * client-side, so putting the term in the query string would send a server
 * round trip per keystroke to do work the browser is already doing.
 */
const DashboardSearchContext = createContext<{
  search: string;
  setSearch: (value: string) => void;
}>({ search: "", setSearch: () => {} });

export function DashboardSearchProvider({ children }: { children: React.ReactNode }) {
  const [search, setSearch] = useState("");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Cleared on a real page change, but seeded instead when the destination came
  // from a header suggestion carrying ?q= — that is how "จัดการ QR Code for
  // building X" arrives already narrowed.
  //
  // Keyed off a remembered path rather than off the effect firing, because
  // stripping the param below changes searchParams and runs this again; an
  // unconditional clear would wipe the term the suggestion had just applied.
  // Applied during render (React's "adjust state on change" form) so the
  // list that renders with the new path already has the right term; only
  // the URL rewrite, a side effect, waits for the effect below.
  const term = searchParams.get("q");
  const [applied, setApplied] = useState<{ path: string; term: string | null }>({ path: pathname, term: null });
  if (term && (applied.term !== term || applied.path !== pathname)) {
    setApplied({ path: pathname, term });
    setSearch(term);
  } else if (!term && applied.path !== pathname) {
    setApplied({ path: pathname, term: null });
    setSearch("");
  }

  useEffect(() => {
    // Stripped so a refresh or a back navigation does not re-apply a filter
    // the user has since cleared. Once stripped, `term` is null and the path
    // is unchanged, so the branch above leaves the applied term alone.
    if (term) router.replace(pathname);
  }, [term, pathname, router]);

  return (
    <DashboardSearchContext.Provider value={{ search, setSearch }}>
      {children}
    </DashboardSearchContext.Provider>
  );
}

/** Read the current term. Returns "" outside a provider, which filters nothing. */
export function useDashboardSearch() {
  return useContext(DashboardSearchContext).search;
}

export function useDashboardSearchControl() {
  return useContext(DashboardSearchContext);
}

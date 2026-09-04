"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

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

  useEffect(() => {
    setSearch("");
  }, [pathname]);

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

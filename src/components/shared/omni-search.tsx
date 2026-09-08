"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  ClipboardList,
  Compass,
  DoorOpen,
  ListFilter,
  Loader2,
  Search,
  Snowflake,
  Tag,
  User,
} from "lucide-react";
import {
  highlightMatch,
  matchesQuery,
  type HighlightPart,
  type SearchEntry,
  type SearchEntryType,
} from "@/lib/search";

export type OmniSearchEntry = SearchEntry;

/**
 * How each kind of suggestion is titled and iconed, and the order the groups
 * appear in — units first because a technician holding a code is the common
 * case, pages last because they are the fallback for "where was that screen".
 */
const GROUPS: { type: SearchEntryType; label: string; icon: typeof Snowflake }[] = [
  { type: "unit", label: "เครื่องแอร์", icon: Snowflake },
  { type: "workOrder", label: "ใบงาน", icon: ClipboardList },
  { type: "building", label: "อาคาร", icon: Building2 },
  { type: "room", label: "ห้อง", icon: DoorOpen },
  { type: "model", label: "ยี่ห้อ/รุ่น", icon: Tag },
  { type: "user", label: "ผู้ใช้งาน", icon: User },
  { type: "page", label: "เมนู", icon: Compass },
];

interface OmniSearchProps {
  /** The filter term. Kept in the parent, because the list below still uses it. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /**
   * Fetches the suggestion index. Called once, on the first focus — not on
   * mount, so a technician who never touches the box never pays for it.
   */
  loadIndex: () => Promise<OmniSearchEntry[]>;
  onPick: (entry: OmniSearchEntry) => void;
}

// Below this the list is everything and the dropdown is only in the way.
const MIN_QUERY_LENGTH = 2;
// Enough to choose from without turning the panel into its own scrolling list.
const MAX_SUGGESTIONS = 10;
// Per group, so one kind with hundreds of matches cannot crowd out the others.
const MAX_PER_GROUP = 4;

function Highlighted({ parts }: { parts: HighlightPart[] }) {
  return (
    <>
      {parts.map((part, index) =>
        part.match ? (
          <span key={index} className="font-bold text-foreground">
            {part.text}
          </span>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </>
  );
}

/**
 * The header search box, with suggestions.
 *
 * It stays a filter first: the top row of the dropdown is always "filter this
 * page", which is what the box did before and what most typing still means.
 * The rows under it jump straight to one unit, wherever it is, which is the
 * part that used to require knowing which page to be on first.
 *
 * Floats over the page rather than pushing it down — unlike SearchableSelect,
 * this one lives in the header, which is not inside a scrolling container.
 */
export function OmniSearch({
  value,
  onChange,
  placeholder = "ค้นหา...",
  loadIndex,
  onPick,
}: OmniSearchProps) {
  const [entries, setEntries] = useState<OmniSearchEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  // Guards against a second fetch while the first is still in flight, which a
  // focus/blur/focus in quick succession would otherwise start.
  const requestedRef = useRef(false);

  // Grouped for display, but also flattened: the keyboard walks one list, and
  // the two have to agree on the order or arrowing down would jump about.
  const { grouped, flat } = useMemo(() => {
    if (!entries || value.trim().length < MIN_QUERY_LENGTH) {
      return { grouped: [] as { label: string; icon: typeof Snowflake; items: SearchEntry[] }[], flat: [] as SearchEntry[] };
    }

    const matches = entries.filter((entry) => matchesQuery(value, entry.label, entry.hint));

    const grouped: { label: string; icon: typeof Snowflake; items: SearchEntry[] }[] = [];
    const flat: SearchEntry[] = [];

    for (const group of GROUPS) {
      if (flat.length >= MAX_SUGGESTIONS) break;
      const items = matches
        .filter((entry) => entry.type === group.type)
        .slice(0, Math.min(MAX_PER_GROUP, MAX_SUGGESTIONS - flat.length));
      if (items.length === 0) continue;
      grouped.push({ label: group.label, icon: group.icon, items });
      flat.push(...items);
    }

    return { grouped, flat };
  }, [entries, value]);

  const showPanel = open && value.trim().length >= MIN_QUERY_LENGTH;
  // The filter row is always first and always selectable, so Enter on a term
  // that matches nothing still does the thing the box used to do.
  const rowCount = flat.length + 1;

  async function ensureIndex() {
    if (requestedRef.current) return;
    requestedRef.current = true;
    setLoading(true);
    try {
      setEntries(await loadIndex());
    } catch {
      // Left silent on purpose: the filter still works without the index, and a
      // toast about a list the user has not asked for yet is noise.
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!showPanel) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [showPanel]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      // Closes the suggestions and leaves the text alone — the filter it
      // represents is still applied to the page underneath.
      event.preventDefault();
      setOpen(false);
      return;
    }

    if (!showPanel) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((prev) => (prev + step + rowCount) % rowCount);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      // Row 0 is the filter, which needs no action beyond closing: the text is
      // already in `value` and the page is already filtered by it.
      if (activeIndex === 0) {
        setOpen(false);
        return;
      }
      const entry = flat[activeIndex - 1];
      if (entry) {
        onPick(entry);
        setOpen(false);
      }
    }
  }

  return (
    <div ref={containerRef} className="relative w-48 sm:w-64">
      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onFocus={() => {
          void ensureIndex();
          setOpen(true);
        }}
        // Focus alone is not enough. Escape and Enter close the panel without
        // moving focus out of the box, so the next click lands on an element
        // that is already focused and fires no focus event — leaving the only
        // way back to the suggestions "type another character".
        onClick={() => {
          void ensureIndex();
          setOpen(true);
        }}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActiveIndex(0);
        }}
        onKeyDown={handleKeyDown}
        className="w-full rounded-xl border border-border bg-muted/50 py-1.5 pl-8 pr-3 text-xs transition-shadow focus:outline-none focus:ring-2 focus:ring-ring"
      />

      {showPanel && (
        // Pinned to the viewport edges on phones, where a 192px-wide panel
        // would be unreadable, and anchored under the box from sm up.
        <div className="fixed inset-x-2 top-14 z-50 overflow-hidden rounded-xl border border-border bg-card shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-1.5 sm:w-96">
          <button
            type="button"
            onMouseEnter={() => setActiveIndex(0)}
            onClick={() => setOpen(false)}
            className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs transition-colors ${
              activeIndex === 0 ? "bg-secondary" : "hover:bg-secondary"
            }`}
          >
            <ListFilter className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 truncate text-muted-foreground">
              กรองรายการในหน้านี้ด้วย{" "}
              <span className="font-bold text-foreground">{value.trim()}</span>
            </span>
          </button>

          {loading && (
            <div className="flex items-center gap-2 border-t border-border px-3 py-3 text-[11px] text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              กำลังโหลดรายการ
            </div>
          )}

          {!loading &&
            grouped.map((group) => {
              const GroupIcon = group.icon;
              return (
                <div key={group.label} className="border-t border-border">
                  <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </p>
                  {group.items.map((entry) => {
                    // Position in the flat list, which is what the arrow keys
                    // move through.
                    const row = flat.indexOf(entry) + 1;
                    return (
                      <button
                        key={`${entry.type}-${entry.id}`}
                        type="button"
                        onMouseEnter={() => setActiveIndex(row)}
                        onClick={() => {
                          onPick(entry);
                          setOpen(false);
                        }}
                        className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs transition-colors ${
                          activeIndex === row ? "bg-secondary" : "hover:bg-secondary"
                        }`}
                      >
                        <GroupIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="min-w-0">
                          <span
                            className={`block truncate text-foreground ${entry.type === "unit" ? "font-mono" : ""}`}
                          >
                            <Highlighted parts={highlightMatch(entry.label, value)} />
                          </span>
                          {entry.hint && (
                            <span className="block truncate text-[10px] text-muted-foreground">
                              <Highlighted parts={highlightMatch(entry.hint, value)} />
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}

          {!loading && entries !== null && flat.length === 0 && (
            <p className="border-t border-border px-3 py-3 text-[11px] text-muted-foreground">
              ไม่พบรายการที่ตรงกับคำค้นนี้
            </p>
          )}
        </div>
      )}
    </div>
  );
}

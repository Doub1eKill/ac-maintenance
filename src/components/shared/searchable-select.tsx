"use client";

import { useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Plus, Search } from "lucide-react";
import { isSameCatalogueName, matchesQuery } from "@/lib/search";

export interface SearchableOption {
  value: string;
  label: string;
  /** Shown under the label — BTU, building, whatever tells two rows apart. */
  hint?: string;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Placeholder for the filter box, e.g. "พิมพ์รหัสหรือชื่อ...". */
  searchPlaceholder?: string;
  disabled?: boolean;
  /**
   * Offers "add <what was typed>" at the end of the list when nothing matches
   * exactly. This is the whole point of the component for technicians: finding
   * that a model is missing and adding it are the same gesture.
   */
  onCreate?: (name: string) => void;
  createLabel?: (name: string) => string;
  isCreating?: boolean;
  emptyLabel?: string;
}

/**
 * A dropdown that filters as you type, replacing NativeSelect where the list is
 * long enough to scroll.
 *
 * Expands inline instead of floating. The forms these appear in are hand-rolled
 * `fixed inset-0` modals that scroll their own content, and an absolutely
 * positioned panel gets clipped by that scroll container or hidden behind the
 * next field. Pushing the content down is unglamorous and always visible.
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "เลือก...",
  searchPlaceholder = "พิมพ์เพื่อค้นหา...",
  disabled = false,
  onCreate,
  createLabel = (name) => `เพิ่ม "${name}" เป็นรายการใหม่`,
  isCreating = false,
  emptyLabel = "ไม่พบรายการที่ค้นหา",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((option) => option.value === value) ?? null;

  const filtered = useMemo(
    () => options.filter((option) => matchesQuery(query, option.label, option.hint)),
    [options, query]
  );

  // Only offer to create something that is not already there. Without this the
  // button appears next to the very row it would duplicate, and the server
  // would reject it a moment later.
  const trimmedQuery = query.trim();
  const canCreate =
    !!onCreate &&
    trimmedQuery.length > 0 &&
    !options.some((option) => isSameCatalogueName(option.label, trimmedQuery));

  function close() {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }

  function choose(option: SearchableOption) {
    onChange(option.value);
    close();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    // Escape closes the list, not the modal around it. The listener is on the
    // input rather than the document so it cannot reach a parent dialog.
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (filtered.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((prev) => (prev + step + filtered.length) % filtered.length);
      return;
    }

    if (event.key === "Enter") {
      // Inside a <form>: without this, Enter submits the whole thing while the
      // user is only picking a row.
      event.preventDefault();
      if (filtered[activeIndex]) {
        choose(filtered[activeIndex]);
      } else if (canCreate) {
        onCreate!(trimmedQuery);
      }
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) window.setTimeout(() => searchRef.current?.focus(), 0);
        }}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-muted px-3.5 py-3 text-left text-xs text-foreground transition-colors hover:border-muted-foreground focus:border-primary focus:outline-none disabled:opacity-50"
      >
        <span className={selected ? "font-bold" : "text-muted-foreground"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onClick={() => choose(option)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-xs transition-colors ${
                  index === activeIndex ? "bg-secondary" : "hover:bg-secondary"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-bold text-foreground">{option.label}</span>
                  {option.hint && (
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {option.hint}
                    </span>
                  )}
                </span>
                {option.value === value && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                )}
              </button>
            ))}

            {filtered.length === 0 && !canCreate && (
              <p className="px-3 py-4 text-center text-[11px] text-muted-foreground">
                {emptyLabel}
              </p>
            )}

            {canCreate && (
              <button
                type="button"
                disabled={isCreating}
                onClick={() => onCreate!(trimmedQuery)}
                className="flex w-full items-center gap-2 border-t border-border px-3 py-3 text-left text-xs font-bold text-primary transition-colors hover:bg-secondary disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {isCreating ? "กำลังเพิ่ม..." : createLabel(trimmedQuery)}
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

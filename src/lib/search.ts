/**
 * The one definition of "does this row match what was typed".
 *
 * Lists and forms used to disagree about this: the technician lists filtered on
 * a lowercased substring while every form was a plain dropdown with no filter
 * at all, so a search that found a unit could not be repeated inside the form
 * that edits it. Both go through here now.
 *
 * Matching is done in JS rather than with Prisma's `contains`, which keeps it
 * independent of the database's collation — the same reason the rest of the
 * filtering in this app happens after the query rather than inside it.
 */
export function matchesQuery(
  query: string,
  ...fields: (string | null | undefined)[]
): boolean {
  const needle = query.trim().toLowerCase();
  // An empty box is not a filter — it shows everything, which is what a list
  // does before anyone types.
  if (!needle) return true;

  return fields.some(
    (field) => typeof field === "string" && field.toLowerCase().includes(needle)
  );
}

/**
 * Whether two catalogue names are the same thing typed differently.
 *
 * Mirrors normaliseCatalogueName in src/lib/admin/master-data.ts, which is what
 * the server rejects duplicates with. Kept here so a form can stop offering
 * "add this as a new model" for something that is already in the list under a
 * different capitalisation, instead of letting the server refuse it afterwards.
 */
export function isSameCatalogueName(a: string, b: string): boolean {
  const tidy = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
  return tidy(a) === tidy(b);
}

/** One run of text, flagged for whether it is part of what the user typed. */
export interface HighlightPart {
  text: string;
  match: boolean;
}

/**
 * Splits a label around every occurrence of the query, so a suggestion list can
 * embolden the part that was typed the way a browser's address bar does.
 *
 * Comparison is lowercased, matching matchesQuery, but the slices come off the
 * original string — so the label keeps its own capitalisation and only the
 * weight changes. Thai has no case, and the Latin model codes here are ASCII,
 * so lowercasing cannot shift the offsets.
 */
export function highlightMatch(text: string, query: string): HighlightPart[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [{ text, match: false }];

  const haystack = text.toLowerCase();
  const parts: HighlightPart[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const found = haystack.indexOf(needle, cursor);
    if (found === -1) {
      parts.push({ text: text.slice(cursor), match: false });
      break;
    }
    if (found > cursor) parts.push({ text: text.slice(cursor, found), match: false });
    parts.push({ text: text.slice(found, found + needle.length), match: true });
    cursor = found + needle.length;
  }

  return parts;
}

/**
 * What a header-search suggestion can point at.
 *
 * Defined here rather than beside the component because the server modules that
 * build the index import it too — one definition, so a new kind of suggestion
 * cannot be added on one side and forgotten on the other.
 */
export type SearchEntryType =
  | "unit"
  | "building"
  | "room"
  | "model"
  | "workOrder"
  | "user"
  | "page";

export interface SearchEntry {
  type: SearchEntryType;
  id: string;
  /** The suggestion's title, and the first thing matched against. */
  label: string;
  /** The line under it — matched too, so a building name finds its units. */
  hint: string;
  /**
   * Where picking it goes. Left unset for suggestions the shell handles itself:
   * a unit opens its history in place rather than navigating anywhere.
   */
  href?: string;
}

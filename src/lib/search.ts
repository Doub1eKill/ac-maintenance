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

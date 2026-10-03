/**
 * How two catalogue names are compared for "is this the same thing".
 *
 * The unique indexes match byte for byte, which was enough while one admin
 * typed every row. Technicians add models from the field now, and "Inverter
 * 12000", "inverter 12000" and "Inverter  12000" are the same product typed by
 * three people — all three get past a byte comparison and leave the catalogue
 * holding duplicates that no query can collapse afterwards.
 */
export function normaliseCatalogueName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Stored form: trimmed and de-doubled, but the author's own capitalisation. */
export function tidyCatalogueName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

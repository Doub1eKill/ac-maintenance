import { normaliseCatalogueName, tidyCatalogueName } from "@/lib/admin/catalogue-names";

/** A unit saved under the "กำหนดเอง" branch: typed-in text, no catalogue ids. */
export interface CustomUnit {
  id: string;
  acCode: string;
  brand: string;
  model: string | null;
  btu: number | null;
}

/** Every unit that answers to the same typed-in brand and model. */
export interface CustomUnitGroup {
  /** Stable across reloads: the normalised pair, so the UI can key on it. */
  key: string;
  brand: string;
  model: string;
  units: { id: string; acCode: string }[];
  /** The BTU most of these units carry — the natural default for the new model. */
  commonBtu: number | null;
}

/** Same comparison the catalogue uses, applied to a brand and model together. */
export function customUnitKey(brand: string, model: string | null): string {
  return `${normaliseCatalogueName(brand)}\u0000${normaliseCatalogueName(model ?? "")}`;
}

/**
 * Collapses free-text units into one row per brand and model.
 *
 * "Carrier 42TVAB" typed by one technician and "carrier  42tvab" by another
 * are the same product, and promoting one without the other would leave half
 * of them behind on free text. The first spelling seen becomes the label; the
 * admin can still correct it before it goes into the catalogue.
 */
export function groupCustomUnits(units: CustomUnit[]): CustomUnitGroup[] {
  const groups = new Map<string, CustomUnitGroup & { btuCounts: Map<number, number> }>();

  for (const unit of units) {
    const key = customUnitKey(unit.brand, unit.model);
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        brand: tidyCatalogueName(unit.brand),
        model: tidyCatalogueName(unit.model ?? ""),
        units: [],
        commonBtu: null,
        btuCounts: new Map(),
      };
      groups.set(key, group);
    }
    group.units.push({ id: unit.id, acCode: unit.acCode });
    if (unit.btu !== null) group.btuCounts.set(unit.btu, (group.btuCounts.get(unit.btu) ?? 0) + 1);
  }

  return [...groups.values()]
    .map(({ btuCounts, ...group }) => {
      let commonBtu: number | null = null;
      let best = 0;
      for (const [btu, count] of btuCounts) {
        if (count > best) {
          best = count;
          commonBtu = btu;
        }
      }
      return { ...group, commonBtu };
    })
    .sort((a, b) => b.units.length - a.units.length || a.brand.localeCompare(b.brand));
}

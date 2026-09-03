import type { Prisma } from "@/generated/prisma/client";

/**
 * Flags saying whether the unit's brand or model has been retired from the
 * catalogue (backlog #4 phase 2).
 *
 * Soft delete deliberately keeps a retired brand or model readable everywhere
 * it is already displayed — a unit does not stop working because its brand was
 * taken off the list, and its history has to stay intact. The cost of that is
 * that nothing on screen distinguishes a brand still in the catalogue from one
 * that was retired months ago, so there is no way to notice which units need
 * moving. These flags travel next to the resolved name so that every place
 * showing it can mark it, without having to know how soft delete works.
 *
 * Computed here rather than at each of the call sites so all of them answer
 * the same way, in the same shape, off the same rule — the eleven places that
 * resolve a brand name were already eleven copies of
 * `acBrand?.name || brand || "ไม่ระบุ"`, and this does not add an twelfth
 * variation to that.
 */
export interface CatalogueRefs {
  acBrand?: { deletedAt: Date | null } | null;
  acModel?: { deletedAt: Date | null } | null;
}

/**
 * A unit registered with a typed-in brand rather than a catalogue one has no
 * `acBrand`/`acModel` row at all, so both flags come back false: free text
 * cannot be retired, and there is nothing to send anyone looking for.
 */
export function catalogueFlags(ac: CatalogueRefs): {
  brandDeleted: boolean;
  modelDeleted: boolean;
} {
  return {
    brandDeleted: ac.acBrand?.deletedAt != null,
    modelDeleted: ac.acModel?.deletedAt != null,
  };
}

/**
 * The select fragment the queries need for the flags above. Spelled out once
 * so a call site cannot half-add it — asking for `name` but forgetting
 * `deletedAt` yields a flag that is quietly always false, which looks exactly
 * like "nothing is retired" and would go unnoticed.
 */
export const catalogueNameSelect = {
  select: { name: true, deletedAt: true },
} satisfies Prisma.AcBrandDefaultArgs;

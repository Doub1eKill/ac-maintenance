import { describe, expect, it } from "vitest";
import { formatUnitLocation } from "@/lib/location";
import { catalogueFlags } from "@/lib/catalogue-status";

const room = (floor: number | null) => ({
  name: "1-19179",
  floor,
  building: { name: "Administration", abbreviation: "B1" },
});

describe("formatUnitLocation", () => {
  it("prints building and room by default", () => {
    expect(formatUnitLocation(room(3))).toBe("Administration - ห้อง 1-19179");
  });

  it("adds the abbreviation and the floor when asked", () => {
    expect(formatUnitLocation(room(3), { withAbbreviation: true, withFloor: true })).toBe(
      "Administration (B1) - ห้อง 1-19179 (ชั้น 3)"
    );
  });

  it("prints a ground floor of 0, and no floor at all when none is recorded", () => {
    expect(formatUnitLocation(room(0), { withFloor: true })).toBe("Administration - ห้อง 1-19179 (ชั้น 0)");
    expect(formatUnitLocation(room(null), { withFloor: true })).toBe("Administration - ห้อง 1-19179");
  });

  it("leaves out the building or the room label when asked", () => {
    expect(formatUnitLocation(room(3), { withBuilding: false })).toBe("ห้อง 1-19179");
    expect(formatUnitLocation(room(3), { withRoomLabel: false })).toBe("Administration - 1-19179");
  });
});

describe("catalogueFlags", () => {
  it("marks a brand or model that has been deleted", () => {
    expect(catalogueFlags({ acBrand: { deletedAt: new Date() }, acModel: { deletedAt: null } })).toEqual({
      brandDeleted: true,
      modelDeleted: false,
    });
    expect(catalogueFlags({})).toEqual({ brandDeleted: false, modelDeleted: false });
  });
});

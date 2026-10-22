import { describe, expect, it } from "vitest";
import { customUnitKey, groupCustomUnits } from "@/lib/admin/custom-unit-groups";

describe("custom unit groups", () => {
  it("puts differently cased or spaced spellings of one model in one group", () => {
    const groups = groupCustomUnits([
      { id: "1", acCode: "A-1", brand: "Carrier", model: "42TVAB", btu: 12000 },
      { id: "2", acCode: "A-2", brand: " carrier ", model: "42tvab", btu: 12000 },
      { id: "3", acCode: "A-3", brand: "Carrier", model: "42TVAB  ", btu: 18000 },
      { id: "4", acCode: "A-4", brand: "Daikin", model: null, btu: null },
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ brand: "Carrier", model: "42TVAB", commonBtu: 12000 });
    expect(groups[0].units.map((u) => u.id)).toEqual(["1", "2", "3"]);
    expect(groups[1]).toMatchObject({ brand: "Daikin", model: "", commonBtu: null });
  });

  it("treats a missing model and an empty one as the same thing", () => {
    expect(customUnitKey("Daikin", null)).toBe(customUnitKey("daikin", "  "));
    expect(customUnitKey("Daikin", "X")).not.toBe(customUnitKey("Daikin", null));
  });
});

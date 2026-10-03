import { describe, expect, it } from "vitest";
import { normaliseCatalogueName, tidyCatalogueName } from "@/lib/admin/catalogue-names";

describe("catalogue names", () => {
  it("compares names the way people mean them: case and spacing do not count", () => {
    const typed = ["Inverter 12000", "inverter 12000", "  Inverter   12000 "];
    expect(new Set(typed.map(normaliseCatalogueName))).toEqual(new Set(["inverter 12000"]));
    expect(normaliseCatalogueName("Daikin")).not.toBe(normaliseCatalogueName("Daikin X"));
  });

  it("stores the author's capitalisation, trimmed and with single spaces", () => {
    expect(tidyCatalogueName("  Panasonic   QA ")).toBe("Panasonic QA");
  });
});

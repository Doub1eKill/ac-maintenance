import { afterEach, describe, expect, it, vi } from "vitest";

// The module opens a database client at import; these are its pure helpers.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  addMaintenanceInterval,
  businessDateFrom,
  businessDateToday,
  compareJobOrder,
  inAppTimeZone,
  installDateProblem,
} from "@/lib/maintenance";

const day = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);

afterEach(() => {
  vi.useRealTimers();
});

describe("businessDateToday", () => {
  it("is the calendar day in Bangkok, not in UTC", () => {
    vi.useFakeTimers();
    // 00:30 on 4 Oct in Bangkok is still 3 Oct in UTC.
    vi.setSystemTime(new Date("2026-10-03T17:30:00Z"));
    expect(businessDateToday()).toEqual(day("2026-10-04"));
  });
});

describe("businessDateFrom", () => {
  it("anchors a real day at UTC midnight", () => {
    expect(businessDateFrom("2026-02-28")).toEqual(day("2026-02-28"));
    expect(businessDateFrom(" 2024-02-29 ")).toEqual(day("2024-02-29"));
  });

  it("refuses days the calendar does not have, rather than rolling them on", () => {
    expect(businessDateFrom("2026-02-31")).toBeNull();
    expect(businessDateFrom("2025-02-29")).toBeNull();
    expect(businessDateFrom("2026-13-01")).toBeNull();
  });

  it("refuses other shapes", () => {
    expect(businessDateFrom("2026/10/03")).toBeNull();
    expect(businessDateFrom("03-10-2026")).toBeNull();
    expect(businessDateFrom("")).toBeNull();
  });
});

describe("addMaintenanceInterval", () => {
  it("adds days, months and years on the calendar", () => {
    expect(addMaintenanceInterval(day("2026-10-03"), 30, "days")).toEqual(day("2026-11-02"));
    expect(addMaintenanceInterval(day("2026-10-03"), 3, "months")).toEqual(day("2027-01-03"));
    expect(addMaintenanceInterval(day("2026-10-03"), 1, "years")).toEqual(day("2027-10-03"));
  });

  it("clamps to the end of a shorter month instead of spilling into the next", () => {
    expect(addMaintenanceInterval(day("2026-01-31"), 1, "months")).toEqual(day("2026-02-28"));
    expect(addMaintenanceInterval(day("2024-02-29"), 1, "years")).toEqual(day("2025-02-28"));
  });

  it("does not change the date it was given", () => {
    const base = day("2026-01-31");
    addMaintenanceInterval(base, 1, "months");
    expect(base).toEqual(day("2026-01-31"));
  });
});

describe("inAppTimeZone", () => {
  it("carries Bangkok wall-clock time in its local fields, wherever this runs", () => {
    // The production bug: 09:40 UTC was printed as 09:40 instead of 16:40.
    const local = inAppTimeZone(new Date("2025-08-25T09:40:00Z"));
    expect([local.getFullYear(), local.getMonth() + 1, local.getDate()]).toEqual([2025, 8, 25]);
    expect([local.getHours(), local.getMinutes()]).toEqual([16, 40]);
  });
});

describe("compareJobOrder", () => {
  const job = (buildingName: string, jobType: "repair" | "cleaning", sortDate: string | null) => ({
    buildingName,
    jobType,
    sortDate,
  });

  it("keeps a building together, repairs first, then oldest first", () => {
    const rows = [
      job("Library", "cleaning", "2026-09-01"),
      job("Admin", "cleaning", "2026-08-01"),
      job("Admin", "repair", "2026-09-15"),
      job("Admin", "repair", "2026-09-01"),
    ];
    expect(rows.sort(compareJobOrder)).toEqual([
      job("Admin", "repair", "2026-09-01"),
      job("Admin", "repair", "2026-09-15"),
      job("Admin", "cleaning", "2026-08-01"),
      job("Library", "cleaning", "2026-09-01"),
    ]);
  });

  it("sorts a job that never happened as the oldest", () => {
    expect(compareJobOrder(job("A", "cleaning", null), job("A", "cleaning", "2026-01-01"))).toBeLessThan(0);
  });
});

describe("installDateProblem", () => {
  const today = new Date("2026-10-24T00:00:00.000Z");

  it("accepts an empty field, today, and a past date", () => {
    expect(installDateProblem("", today)).toBeNull();
    expect(installDateProblem("2026-10-24", today)).toBeNull();
    expect(installDateProblem("2001-02-20", today)).toBeNull();
  });

  it("reads a year past 2400 as Buddhist-era and names the CE year (the 2544-02-20 units)", () => {
    expect(installDateProblem("2544-02-20", today)).toContain("2001");
    expect(installDateProblem("2544-02-20", today)).toContain("พ.ศ.");
  });

  it("refuses a day that has not come yet (the 2047-09-14 unit), including tomorrow", () => {
    expect(installDateProblem("2047-09-14", today)).toBe("วันที่ติดตั้งต้องไม่เกินวันนี้");
    expect(installDateProblem("2026-10-25", today)).toBe("วันที่ติดตั้งต้องไม่เกินวันนี้");
  });

  it("refuses something that is not a calendar day", () => {
    expect(installDateProblem("2026-02-31", today)).toBe("วันที่ติดตั้งไม่ถูกต้อง");
  });
});

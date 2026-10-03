import { describe, expect, it } from "vitest";
import { isInstitutionalDomain, isWellFormed, normaliseEmail, suggestDomain } from "@/lib/email-check";

describe("normaliseEmail / isWellFormed", () => {
  it("trims and lowercases", () => {
    expect(normaliseEmail("  Somchai@PKRU.ac.th ")).toBe("somchai@pkru.ac.th");
  });

  it("wants one @, something either side, and a domain with a dot", () => {
    expect(isWellFormed("a@b.co")).toBe(true);
    expect(isWellFormed("a@b.c")).toBe(false);
    expect(isWellFormed("a b@c.com")).toBe(false);
    expect(isWellFormed("a@@b.com")).toBe(false);
    expect(isWellFormed("no-at.com")).toBe(false);
  });
});

describe("isInstitutionalDomain", () => {
  it("accepts education domains", () => {
    expect(isInstitutionalDomain("pkru.ac.th")).toBe(true);
    expect(isInstitutionalDomain("mit.edu")).toBe(true);
    expect(isInstitutionalDomain("school.edu.th")).toBe(true);
  });

  it("refuses public webmail and everything else", () => {
    expect(isInstitutionalDomain("GMAIL.COM")).toBe(false);
    expect(isInstitutionalDomain("example.com")).toBe(false);
  });
});

describe("suggestDomain", () => {
  it("offers the known domain a slip was meant to be", () => {
    expect(suggestDomain("gmial.com")).toBe("gmail.com");
    expect(suggestDomain("hotmial.com")).toBe("hotmail.com");
    expect(suggestDomain("pkru.ac.tth")).toBe("pkru.ac.th");
  });

  it("offers nothing for a known domain or one far from any", () => {
    expect(suggestDomain("gmail.com")).toBeNull();
    expect(suggestDomain("totally-different.org")).toBeNull();
  });
});

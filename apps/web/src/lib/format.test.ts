import { describe, expect, it } from "vitest";
import { formatAreaKm2 } from "./formatArea";
import { splitAstronomicalYear } from "./formatYear";
import { pickLocalized } from "./pickLocalized";

describe("formatAreaKm2", () => {
  it("uses each language's thousands separator", () => {
    expect(formatAreaKm2(24000000, "en", false)).toBe("24,000,000 km²");
    expect(formatAreaKm2(24000000, "pt", false)).toBe("24.000.000 km²");
  });

  it("marks approximate areas", () => {
    expect(formatAreaKm2(5000000, "en", true)).toBe("~5,000,000 km²");
  });
});

describe("splitAstronomicalYear", () => {
  it("treats negative years as BCE", () => {
    expect(splitAstronomicalYear(-27)).toEqual({ absoluteYear: 27, isBce: true });
    expect(splitAstronomicalYear(476)).toEqual({ absoluteYear: 476, isBce: false });
  });
});

describe("pickLocalized", () => {
  it("falls back to English for any locale other than pt", () => {
    expect(pickLocalized("Rome", "Roma", "pt")).toBe("Roma");
    expect(pickLocalized("Rome", "Roma", "en")).toBe("Rome");
  });
});

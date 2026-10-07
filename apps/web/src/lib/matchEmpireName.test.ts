import { describe, expect, it } from "vitest";
import { matchEmpireByQuery } from "./matchEmpireName";

describe("matchEmpireByQuery", () => {
  it("matches a substring and returns the range to highlight", () => {
    expect(matchEmpireByQuery("Mongol Empire", "gol")).toEqual([[3, 6]]);
  });

  it("ignores case and accents", () => {
    expect(matchEmpireByQuery("Império Otomano", "imperio")).toEqual([[0, 7]]);
  });

  it("falls back to initials", () => {
    expect(matchEmpireByQuery("Holy Roman Empire", "hre")).toEqual([
      [0, 1],
      [5, 6],
      [11, 12],
    ]);
  });

  it("returns null when nothing matches or the query is blank", () => {
    expect(matchEmpireByQuery("Inca Empire", "xyz")).toBeNull();
    expect(matchEmpireByQuery("Inca Empire", "   ")).toBeNull();
  });
});

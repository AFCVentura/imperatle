import { describe, expect, it } from "vitest";
import { matchEmpire, matchEmpireByQuery } from "./matchEmpireName";

describe("matchEmpire", () => {
  it("prefers the empire's own name", () => {
    expect(matchEmpire("Império Mogol", ["Mughal Empire", "Mogul"], "mog")).toEqual({ ranges: [[8, 11]] });
  });

  it("falls back to other names, and says which one matched", () => {
    expect(matchEmpire("Império Mogol", ["Mughal Empire", "Mugal"], "mugal")).toEqual({
      ranges: [],
      alias: { text: "Mugal", ranges: [[0, 5]] },
    });
    expect(matchEmpire("Dinastia Ming", ["Ming Dynasty", "China"], "china")).toEqual({
      ranges: [],
      alias: { text: "China", ranges: [[0, 5]] },
    });
  });

  it("matches other names by substring only, never by initials", () => {
    expect(matchEmpire("Dinastia Ming", ["Ming Dynasty"], "md")).toBeNull();
  });
});

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

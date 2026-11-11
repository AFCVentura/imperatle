import { describe, expect, it } from "vitest";
import { matchEmpire, matchEmpireByQuery, otherEmpireNames } from "./matchEmpireName";

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

  it("finds the Spanish name, shown in Spanish", () => {
    expect(matchEmpire("Imperio otomano", ["Ottoman Empire", "Império Otomano"], "otomano")).toEqual({ ranges: [[8, 15]] });
  });

  it("finds the Spanish name typed without accents", () => {
    expect(matchEmpire("Imperio aqueménida", ["Achaemenid Empire", "Império Aquemênida"], "aquemenida")).toEqual({ ranges: [[8, 18]] });
  });

  it("ignores a leading article in any of the three languages", () => {
    expect(matchEmpire("Imperio otomano", ["Ottoman Empire"], "el imperio otomano")).toEqual({ ranges: [[0, 15]] });
    expect(matchEmpire("Imperio otomano", ["Ottoman Empire"], "the ottoman")).toEqual({
      ranges: [],
      alias: { text: "Ottoman Empire", ranges: [[0, 7]] },
    });
    expect(matchEmpire("Império Otomano", ["Ottoman Empire"], "o império otomano")).toEqual({ ranges: [[0, 15]] });
    expect(matchEmpire("Horda de Oro", ["Golden Horde"], "la horda")).toEqual({ ranges: [[0, 5]] });
  });

  it("still finds the English and Portuguese names from Spanish", () => {
    const others = otherEmpireNames("Imperio mogol", ["Mughal Empire", "Império Mogol", "Imperio mogol"], ["Mugal"]);
    expect(others).toEqual(["Mughal Empire", "Império Mogol", "Mugal"]);
    expect(matchEmpire("Imperio mogol", others, "mughal")).toEqual({ ranges: [], alias: { text: "Mughal Empire", ranges: [[0, 6]] } });
    expect(matchEmpire("Imperio mogol", others, "mugal")).toEqual({ ranges: [], alias: { text: "Mugal", ranges: [[0, 5]] } });
  });

  it("skips a missing Spanish name", () => {
    expect(otherEmpireNames("Roman Empire", ["Roman Empire", "Império Romano", undefined], [])).toEqual(["Império Romano"]);
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

  it("matches initials with or without the name's leading article", () => {
    expect(matchEmpireByQuery("The Golden Horde", "tgh")).toEqual([[0, 1], [4, 5], [11, 12]]);
    expect(matchEmpireByQuery("The Golden Horde", "gh")).toEqual([[4, 5], [11, 12]]);
  });

  it("still searches an article typed alone", () => {
    expect(matchEmpireByQuery("Imperio de los Habsburgo", "los")).toEqual([[11, 14]]);
  });

  it("returns null when nothing matches or the query is blank", () => {
    expect(matchEmpireByQuery("Inca Empire", "xyz")).toBeNull();
    expect(matchEmpireByQuery("Inca Empire", "   ")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { COUNTRIES_AFTER, CONTINENTS_AFTER } from "../map/stage";
import { CLUES, clueFor } from "./clues";

describe("clue order", () => {
  // The map clues are the map stages: if a stage moves, the list must too.
  it("matches the map stages", () => {
    expect(clueFor(CONTINENTS_AFTER)).toEqual({ kind: "map", stage: "continents" });
    expect(clueFor(COUNTRIES_AFTER)).toEqual({ kind: "map", stage: "countries" });
  });

  // Same order as the API's GameRules: era first, curiosities from the 3rd miss.
  it("matches the API", () => {
    expect(clueFor(1)).toEqual({ kind: "era" });
    expect([3, 4, 5].map(clueFor)).toEqual([0, 1, 2].map((index) => ({ kind: "curiosity", index })));
    expect(CLUES).toHaveLength(6);
    expect(clueFor(7)).toBeNull();
  });
});

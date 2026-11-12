import { describe, expect, it } from "vitest";
import { COUNTRIES_AFTER, CONTINENTS_AFTER } from "../map/stage";
import { CLUES, clueFor, clueStep, cluesUnlockedBy, wrongGuessUnlocking } from "./clues";

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

// Same table as the API's PracticeTests.Clues_out_after_each_wrong_guess.
describe("clueStep", () => {
  const steps = (attempts: number, adaptive: boolean) =>
    Array.from({ length: attempts - 1 }, (_, i) => clueStep(i + 1, attempts, adaptive));

  it("spreads the six clues over the attempts when adaptive", () => {
    expect(steps(3, true)).toEqual([3, 6]);
    expect(steps(4, true)).toEqual([2, 4, 6]);
    expect(steps(5, true)).toEqual([2, 3, 5, 6]);
    expect(steps(7, true)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(steps(10, true)).toEqual([1, 1, 2, 3, 3, 4, 5, 5, 6]);
  });

  it("keeps one clue per miss when off", () => {
    expect(steps(3, false)).toEqual([1, 2]);
    expect(steps(10, false)).toEqual([1, 2, 3, 4, 5, 6, 6, 6, 6]);
    expect(clueStep(0, 3, true)).toBe(0);
  });

  it("lists every clue a miss unlocks, and when a clue comes", () => {
    expect(cluesUnlockedBy(1, 3, true)).toEqual(CLUES.slice(0, 3));
    expect(cluesUnlockedBy(2, 10, true)).toEqual([]);
    expect(wrongGuessUnlocking(6, 3, true)).toBe(2);
    expect(wrongGuessUnlocking(6, 3, false)).toBeNull();
    expect(wrongGuessUnlocking(2, 10, true)).toBe(3);
  });
});

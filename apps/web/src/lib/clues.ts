import type { EmpireHint } from "./types";

// One clue per wrong guess, in this order (the API's GameRules; the map ones
// are the map stages of map/stage.ts, checked by clues.test.ts): the era,
// the map with the continents, the three curiosities, the map with the
// countries.
export type Clue = { kind: "era" } | { kind: "map"; stage: "continents" | "countries" } | { kind: "curiosity"; index: number };

export const CLUES: Clue[] = [
  { kind: "era" },
  { kind: "map", stage: "continents" },
  { kind: "curiosity", index: 0 },
  { kind: "curiosity", index: 1 },
  { kind: "curiosity", index: 2 },
  { kind: "map", stage: "countries" },
];

// The clue unlocked by wrong guess number n (1-based), if any.
export const clueFor = (n: number): Clue | null => CLUES[n - 1] ?? null;

// What has been revealed: the era (index into BROAD_ERAS) and the curiosities
// so far. The answer, once the round is over, has them all.
export interface RevealedClues {
  broadEra: number | null;
  hints: EmpireHint[] | null;
}

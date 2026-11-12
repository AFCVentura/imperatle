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

// One clue per wrong guess fits exactly: the daily game's 7 attempts.
export const DAILY_ATTEMPTS = CLUES.length + 1;

// The clue unlocked by wrong guess number n (1-based), if any.
export const clueFor = (n: number): Clue | null => CLUES[n - 1] ?? null;

// How many clues are out after this many wrong guesses (the API's
// PracticeRules.ClueStep). Off: one per wrong guess, the daily game's pace.
// Adaptive (practice option, on by default): the six clues spread over the
// wrong guesses the round allows, the last one with the last wrong guess,
// rounded half up. With 7 attempts both are the same.
export function clueStep(wrongGuesses: number, attemptsAllowed: number, adaptive: boolean): number {
  if (wrongGuesses <= 0) return 0;
  if (!adaptive || attemptsAllowed <= 1) return Math.min(wrongGuesses, CLUES.length);
  const wrongAllowed = attemptsAllowed - 1;
  return Math.min(Math.floor((2 * wrongGuesses * CLUES.length + wrongAllowed) / (2 * wrongAllowed)), CLUES.length);
}

// The clues wrong guess number n (1-based) unlocks: none, one or several.
export function cluesUnlockedBy(n: number, attemptsAllowed: number, adaptive: boolean): Clue[] {
  return CLUES.slice(clueStep(n - 1, attemptsAllowed, adaptive), clueStep(n, attemptsAllowed, adaptive));
}

// The wrong guess that brings clue number k (1-based) out, or null when the
// round's attempts end before it (it then only shows on the answer's sheet).
export function wrongGuessUnlocking(k: number, attemptsAllowed: number, adaptive: boolean): number | null {
  for (let w = 1; w < attemptsAllowed; w++) {
    if (clueStep(w, attemptsAllowed, adaptive) >= k) return w;
  }
  return null;
}

// What has been revealed: the era (index into BROAD_ERAS) and the curiosities
// so far. The answer, once the round is over, has them all.
export interface RevealedClues {
  broadEra: number | null;
  hints: EmpireHint[] | null;
}

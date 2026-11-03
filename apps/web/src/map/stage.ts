import type { MapStage } from "./geo";

// Wrong guesses after which the map gains the continents, then the countries.
// The end of the round shows everything.
export const CONTINENTS_AFTER = 2;
export const COUNTRIES_AFTER = 6;

export function mapStageFor(wrongGuesses: number, gameOver: boolean): MapStage {
  if (gameOver || wrongGuesses >= COUNTRIES_AFTER) return 3;
  if (wrongGuesses >= CONTINENTS_AFTER) return 2;
  return 1;
}

// Practice mode can switch the progression off: the whole map from the
// start ("Full"), or only the outline until the round ends ("Outline").
export type MapMode = "Progressive" | "Full" | "Outline";

export function mapStageForMode(mode: MapMode, wrongGuesses: number, gameOver: boolean): MapStage {
  if (mode === "Full") return 3;
  if (mode === "Outline") return gameOver ? 3 : 1;
  return mapStageFor(wrongGuesses, gameOver);
}

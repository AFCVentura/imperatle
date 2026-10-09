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

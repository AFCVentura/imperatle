import type { GameProgress } from "./gameStorage";
import { BROAD_ERAS, CONTINENTS, DEFAULT_PRACTICE_OPTIONS, PRACTICE_ATTEMPTS, PRACTICE_DIFFICULTIES, PRACTICE_MAP_MODES, type PracticeOptions } from "./types";

// Per-browser conveniences for practice mode: the last options picked, and
// the round in progress (so a reload resumes it). The server keeps the round
// itself; this is only the display copy, like gameStorage for the daily game.
const OPTIONS_KEY = "imperatle:practice:options";
const ROUND_KEY = "imperatle:practice:round";

export interface SavedPracticeRound {
  id: string;
  progress: GameProgress | null;
}

// Anything stored that doesn't fit the current options (an old version,
// hand edits) falls back to the defaults field by field.
export function sanitizePracticeOptions(value: unknown): PracticeOptions {
  const v = (value && typeof value === "object" ? value : {}) as Partial<Record<keyof PracticeOptions, unknown>>;
  const pick = <T>(candidate: unknown, allowed: readonly T[], fallback: T): T =>
    allowed.includes(candidate as T) ? (candidate as T) : fallback;
  const index = (candidate: unknown, length: number) =>
    typeof candidate === "number" && Number.isInteger(candidate) && candidate >= 0 && candidate < length ? candidate : null;

  return {
    difficulty: pick(v.difficulty, PRACTICE_DIFFICULTIES, DEFAULT_PRACTICE_OPTIONS.difficulty),
    attempts: pick(v.attempts, PRACTICE_ATTEMPTS as readonly number[], DEFAULT_PRACTICE_OPTIONS.attempts),
    hints: typeof v.hints === "boolean" ? v.hints : DEFAULT_PRACTICE_OPTIONS.hints,
    map: pick(v.map, PRACTICE_MAP_MODES, DEFAULT_PRACTICE_OPTIONS.map),
    era: index(v.era, BROAD_ERAS.length),
    continent: index(v.continent, CONTINENTS.length),
  };
}

function read(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable: practice still works, it just won't remember.
  }
}

export const loadPracticeOptions = (): PracticeOptions => sanitizePracticeOptions(read(OPTIONS_KEY));
export const savePracticeOptions = (options: PracticeOptions) => write(OPTIONS_KEY, options);

export function loadPracticeRound(): SavedPracticeRound | null {
  const value = read(ROUND_KEY) as SavedPracticeRound | null;
  return value && typeof value.id === "string" ? value : null;
}

export const savePracticeRound = (round: SavedPracticeRound | null) => write(ROUND_KEY, round);

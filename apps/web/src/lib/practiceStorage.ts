import type { GameProgress } from "./gameStorage";
import {
  BROAD_ERAS,
  CONTINENTS,
  DEFAULT_PRACTICE_OPTIONS,
  PRACTICE_DIFFICULTIES,
  PRACTICE_MAP_MODES,
  PRACTICE_MAX_ATTEMPTS,
  PRACTICE_MIN_ATTEMPTS,
  type PracticeOptions,
} from "./types";

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
// hand edits) falls back to the defaults field by field. Before 1.5 era and
// continent were a single number (or null); that choice is kept as a list.
export function sanitizePracticeOptions(value: unknown): PracticeOptions {
  const v = (value && typeof value === "object" ? value : {}) as Partial<Record<keyof PracticeOptions | "era" | "continent", unknown>>;
  const pick = <T>(candidate: unknown, allowed: readonly T[], fallback: T): T =>
    allowed.includes(candidate as T) ? (candidate as T) : fallback;
  const isIndex = (candidate: unknown, length: number): candidate is number =>
    typeof candidate === "number" && Number.isInteger(candidate) && candidate >= 0 && candidate < length;
  const indexes = (list: unknown, single: unknown, length: number) => {
    const raw = Array.isArray(list) ? list : [single];
    return [...new Set(raw.filter((i) => isIndex(i, length)))].sort((a, b) => a - b);
  };
  const attempts = v.attempts;

  return {
    difficulty: pick(v.difficulty, PRACTICE_DIFFICULTIES, DEFAULT_PRACTICE_OPTIONS.difficulty),
    attempts:
      typeof attempts === "number" && Number.isInteger(attempts) && attempts >= PRACTICE_MIN_ATTEMPTS && attempts <= PRACTICE_MAX_ATTEMPTS
        ? attempts
        : DEFAULT_PRACTICE_OPTIONS.attempts,
    hints: typeof v.hints === "boolean" ? v.hints : DEFAULT_PRACTICE_OPTIONS.hints,
    map: pick(v.map, PRACTICE_MAP_MODES, DEFAULT_PRACTICE_OPTIONS.map),
    eras: indexes(v.eras, v.era, BROAD_ERAS.length),
    continents: indexes(v.continents, v.continent, CONTINENTS.length),
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

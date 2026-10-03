import type { ChallengeReveal, ComparisonResult, EmpireAnswer } from "./types";

export interface GuessHistoryEntry {
  empireId: number;
  nameEn: string;
  namePt: string;
  correct: boolean;
  // Null for a correct guess (no comparison shown -- it's an exact match).
  areaComparison: ComparisonResult | null;
  durationComparison: ComparisonResult | null;
}

export interface GameProgress {
  date: string;
  guesses: GuessHistoryEntry[];
  reveal: ChallengeReveal | null;
  gameOver: boolean;
  answer: EmpireAnswer | null;
}

const STORAGE_KEY_PREFIX = "imperatle:progress:";

// No-account persistence: progress lives in localStorage, keyed by the
// challenge date so a new day never restores yesterday's state.
export function loadGameProgress(date: string): GameProgress | null {
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${date}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameProgress;
    return parsed.date === date ? parsed : null;
  } catch {
    return null;
  }
}

export function saveGameProgress(progress: GameProgress): void {
  try {
    window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${progress.date}`, JSON.stringify(progress));
  } catch {
    // localStorage unavailable (private mode, disabled) -- game still works, just without persistence.
  }
}

// Dev-only debug tool: wipes every day's saved progress, not just today's,
// since it's only ever called from the reset button next to the brand.
export function clearAllGameProgress(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(STORAGE_KEY_PREFIX)) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // localStorage unavailable -- nothing to clear.
  }
}

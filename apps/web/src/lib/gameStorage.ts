import type { ChallengeReveal, EmpireAnswer } from "./types";

export interface GuessHistoryEntry {
  empireId: number;
  nameEn: string;
  namePt: string;
  correct: boolean;
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

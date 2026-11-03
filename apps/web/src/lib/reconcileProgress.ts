import type { GameProgress, GuessHistoryEntry } from "./gameStorage";
import type { ChallengeReveal, EmpireAnswer } from "./types";

// What the server knows about a round (archive day or practice round): it
// counts the attempts, but keeps no guess names.
export interface ServerRound {
  attemptsUsed: number;
  completed: boolean;
  correct: boolean;
  reveal: ChallengeReveal | null;
  answer: EmpireAnswer | null;
}

// The browser's saved copy is only for display; the server's count wins.
// When they disagree (another device, cleared storage), the board is rebuilt
// from the server with placeholder guesses, so the attempt count, the
// unlocked clues and the result are still right.
export function reconcileProgress(
  key: string,
  local: GameProgress | null,
  server: ServerRound,
  unknownGuessLabel: string,
): GameProgress | null {
  if (local && local.guesses.length === server.attemptsUsed && local.gameOver === server.completed) {
    return server.completed && !local.answer ? { ...local, answer: server.answer } : local;
  }

  if (server.attemptsUsed === 0) return null;

  const guesses: GuessHistoryEntry[] = Array.from({ length: server.attemptsUsed }, (_, i) => ({
    empireId: 0,
    nameEn: unknownGuessLabel,
    namePt: unknownGuessLabel,
    correct: server.correct && i === server.attemptsUsed - 1,
    areaComparison: null,
    durationComparison: null,
  }));
  return { date: key, guesses, reveal: server.reveal, gameOver: server.completed, answer: server.answer };
}

import { comparisonFields, type GameProgress, type GuessHistoryEntry } from "./gameStorage";
import type { ChallengeReveal, EmpireAnswer, PlayedGuess } from "./types";

// What the server knows about a round (daily game, archive day or practice
// round): it counts the attempts, and for the daily game and the archive it
// also keeps the guesses themselves.
export interface ServerRound {
  attemptsUsed: number;
  completed: boolean;
  correct: boolean;
  reveal: ChallengeReveal | null;
  answer: EmpireAnswer | null;
  guesses?: PlayedGuess[];
}

const isPlaceholder = (g: GuessHistoryEntry) => g.empireId === 0;
// Saved before 1.5: the guess has no era or distance yet.
const isOutdated = (g: GuessHistoryEntry) => !g.correct && g.eraComparison === undefined;

function fromServer(guesses: PlayedGuess[]): GuessHistoryEntry[] {
  return guesses.map((g) => ({
    empireId: g.empireId,
    nameEn: g.nameEn,
    namePt: g.namePt,
    correct: g.correct,
    ...comparisonFields(g.comparison),
  }));
}

// The browser's saved copy is only for display; the server's count wins.
// When they disagree (another device, cleared storage), the board is rebuilt
// from the server: with the real guesses when it stored them, otherwise with
// placeholder rows (games from before guesses were stored), so the attempt
// count, the unlocked clues and the result are still right. Returns `local`
// itself when nothing changed.
export function reconcileProgress(
  key: string,
  local: GameProgress | null,
  server: ServerRound,
  unknownGuessLabel: string,
): GameProgress | null {
  const serverGuesses = server.guesses?.length === server.attemptsUsed ? fromServer(server.guesses) : null;

  if (local && local.guesses.length === server.attemptsUsed && local.gameOver === server.completed) {
    // Same round; only fill in what the browser's copy lacks (placeholder
    // rows, or guesses saved before they had an era and a distance).
    const guesses =
      serverGuesses && local.guesses.some((g) => isPlaceholder(g) || isOutdated(g)) ? serverGuesses : local.guesses;
    const answer = server.completed && !local.answer ? server.answer : local.answer;
    return guesses === local.guesses && answer === local.answer ? local : { ...local, guesses, answer };
  }

  if (server.attemptsUsed === 0) return null;

  const guesses: GuessHistoryEntry[] =
    serverGuesses ??
    Array.from({ length: server.attemptsUsed }, (_, i) => ({
      empireId: 0,
      nameEn: unknownGuessLabel,
      namePt: unknownGuessLabel,
      correct: server.correct && i === server.attemptsUsed - 1,
      areaComparison: null,
      eraComparison: null,
      proximity: null,
    }));
  return { date: key, guesses, reveal: server.reveal, gameOver: server.completed, answer: server.answer };
}

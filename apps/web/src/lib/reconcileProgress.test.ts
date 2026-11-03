import { describe, expect, it } from "vitest";
import type { GameProgress } from "./gameStorage";
import { reconcileProgress, type ServerRound } from "./reconcileProgress";
import { EMPTY_REVEAL, type EmpireAnswer } from "./types";

const guess = (correct: boolean) => ({
  empireId: 1,
  nameEn: "Roman Empire",
  namePt: "Império Romano",
  correct,
  areaComparison: null,
  durationComparison: null,
});

const local: GameProgress = { date: "2026-11-01", guesses: [guess(false), guess(false)], reveal: EMPTY_REVEAL, gameOver: false, answer: null };
const server = (round: Partial<ServerRound>): ServerRound => ({
  attemptsUsed: 0,
  completed: false,
  correct: false,
  reveal: null,
  answer: null,
  ...round,
});

describe("reconcileProgress", () => {
  it("keeps the browser's copy when it matches the server", () => {
    expect(reconcileProgress("2026-11-01", local, server({ attemptsUsed: 2 }), "?")).toBe(local);
  });

  it("starts fresh when the server has no attempts", () => {
    expect(reconcileProgress("2026-11-01", local, server({}), "?")).toBeNull();
    expect(reconcileProgress("2026-11-01", null, server({}), "?")).toBeNull();
  });

  it("rebuilds from the server when the counts disagree", () => {
    const answer = { id: 9 } as EmpireAnswer;
    const rebuilt = reconcileProgress("2026-11-01", null, server({ attemptsUsed: 3, completed: true, correct: true, answer }), "?");
    expect(rebuilt?.guesses.map((g) => g.correct)).toEqual([false, false, true]);
    expect(rebuilt?.guesses[0].nameEn).toBe("?");
    expect(rebuilt?.gameOver).toBe(true);
    expect(rebuilt?.answer).toBe(answer);
  });

  it("fills in a missing answer from the server", () => {
    const answer = { id: 9 } as EmpireAnswer;
    const finished = { ...local, gameOver: true };
    expect(reconcileProgress("2026-11-01", finished, server({ attemptsUsed: 2, completed: true, answer }), "?")?.answer).toBe(answer);
  });
});

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

  const played = (empireId: number, correct: boolean) => ({
    empireId,
    nameEn: `Empire ${empireId}`,
    namePt: `Império ${empireId}`,
    correct,
    comparison: correct ? null : { area: 2, era: 0, shared: 0, distanceKm: 1200, bearingDegrees: 90 },
  });

  it("rebuilds with the real guesses when the server stored them", () => {
    const rebuilt = reconcileProgress("2026-11-01", null, server({ attemptsUsed: 2, guesses: [played(4, false), played(5, false)] }), "?");
    expect(rebuilt?.guesses.map((g) => g.empireId)).toEqual([4, 5]);
    expect(rebuilt?.guesses[0]).toMatchObject({ nameEn: "Empire 4", areaComparison: "Bigger", eraComparison: "Smaller" });
    expect(rebuilt?.guesses[0].proximity).toMatchObject({ shared: 0, distanceKm: 1200, bearingDegrees: 90, answerSpread: false });
  });

  it("replaces placeholder rows once the server has the guesses", () => {
    const placeholders: GameProgress = { ...local, guesses: local.guesses.map((g) => ({ ...g, empireId: 0 })) };
    const fixed = reconcileProgress("2026-11-01", placeholders, server({ attemptsUsed: 2, guesses: [played(4, false), played(5, false)] }), "?");
    expect(fixed?.guesses.map((g) => g.empireId)).toEqual([4, 5]);
  });

  // Saved before 1.5 (duration instead of era, no distance): rebuilt from
  // the server so the new cells aren't empty.
  it("refreshes guesses saved before they had an era", () => {
    const old: GameProgress = { ...local, guesses: local.guesses.map((g) => ({ ...g, eraComparison: undefined })) };
    const fixed = reconcileProgress("2026-11-01", old, server({ attemptsUsed: 2, guesses: [played(4, false), played(5, false)] }), "?");
    expect(fixed?.guesses[0].eraComparison).toBe("Smaller");
  });

  it("falls back to placeholders when the stored guesses don't cover every attempt", () => {
    const rebuilt = reconcileProgress("2026-11-01", null, server({ attemptsUsed: 3, guesses: [played(4, false)] }), "?");
    expect(rebuilt?.guesses.map((g) => g.nameEn)).toEqual(["?", "?", "?"]);
  });
});

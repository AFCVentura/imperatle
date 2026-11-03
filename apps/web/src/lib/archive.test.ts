import { describe, expect, it } from "vitest";
import { groupArchiveByMonth, isIsoDate } from "./archive";
import type { ArchiveDay, ArchiveStatus } from "./types";

const day = (date: string, status: ArchiveStatus): ArchiveDay => ({ date, challengeNumber: 1, status, attemptsUsed: 0 });

const days = [day("2026-11-02", "Won"), day("2026-11-01", "InProgress"), day("2026-10-31", "Lost"), day("2026-10-30", "NotPlayed")];

describe("groupArchiveByMonth", () => {
  it("groups newest first by month", () => {
    expect(groupArchiveByMonth(days, "all").map((m) => [m.key, m.days.length])).toEqual([
      ["2026-11", 2],
      ["2026-10", 2],
    ]);
  });

  it("counts only finished days as played", () => {
    expect(groupArchiveByMonth(days, "played").flatMap((m) => m.days.map((d) => d.date))).toEqual(["2026-11-02", "2026-10-31"]);
    expect(groupArchiveByMonth(days, "notPlayed").flatMap((m) => m.days.map((d) => d.date))).toEqual(["2026-11-01", "2026-10-30"]);
  });
});

describe("isIsoDate", () => {
  it("accepts real dates only", () => {
    expect(isIsoDate("2026-11-02")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-11-2")).toBe(false);
    expect(isIsoDate("../etc")).toBe(false);
  });
});

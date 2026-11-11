import { describe, expect, it } from "vitest";
import { sanitizePracticeOptions } from "./practiceStorage";
import { DEFAULT_PRACTICE_OPTIONS } from "./types";

describe("sanitizePracticeOptions", () => {
  it("keeps valid options", () => {
    const options = { difficulty: "Hard", attempts: 4, hints: false, map: "Outline", eras: [0, 2], continents: [5] } as const;
    expect(sanitizePracticeOptions(options)).toEqual(options);
  });

  it("falls back to the defaults field by field", () => {
    expect(sanitizePracticeOptions(null)).toEqual(DEFAULT_PRACTICE_OPTIONS);
    expect(
      sanitizePracticeOptions({ difficulty: "Insane", attempts: 99, hints: "yes", map: "3D", eras: [7, "x"], continents: [-1] }),
    ).toEqual(DEFAULT_PRACTICE_OPTIONS);
    expect(sanitizePracticeOptions({ attempts: 10 }).attempts).toBe(10);
    expect(sanitizePracticeOptions({ attempts: 2 }).attempts).toBe(DEFAULT_PRACTICE_OPTIONS.attempts);
    expect(sanitizePracticeOptions({ attempts: 6.5 }).attempts).toBe(DEFAULT_PRACTICE_OPTIONS.attempts);
  });

  it("sorts and dedupes the picks", () => {
    expect(sanitizePracticeOptions({ eras: [3, 0, 3], continents: [2, 1] })).toMatchObject({ eras: [0, 3], continents: [1, 2] });
  });

  // Saved before 1.5: a single era/continent (or null for any).
  it("turns the old single choice into a list", () => {
    expect(sanitizePracticeOptions({ era: 1, continent: 4 })).toMatchObject({ eras: [1], continents: [4] });
    expect(sanitizePracticeOptions({ era: null, continent: null })).toMatchObject({ eras: [], continents: [] });
  });
});

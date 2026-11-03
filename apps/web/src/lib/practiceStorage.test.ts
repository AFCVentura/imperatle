import { describe, expect, it } from "vitest";
import { sanitizePracticeOptions } from "./practiceStorage";
import { DEFAULT_PRACTICE_OPTIONS } from "./types";

describe("sanitizePracticeOptions", () => {
  it("keeps valid options", () => {
    const options = { difficulty: "Hard", attempts: 3, hints: false, map: "Outline", era: 0, continent: 5 } as const;
    expect(sanitizePracticeOptions(options)).toEqual(options);
  });

  it("falls back to the defaults field by field", () => {
    expect(sanitizePracticeOptions(null)).toEqual(DEFAULT_PRACTICE_OPTIONS);
    expect(sanitizePracticeOptions({ difficulty: "Insane", attempts: 99, hints: "yes", map: "3D", era: 7, continent: -1 })).toEqual(
      DEFAULT_PRACTICE_OPTIONS,
    );
    expect(sanitizePracticeOptions({ attempts: 10 }).attempts).toBe(10);
  });
});

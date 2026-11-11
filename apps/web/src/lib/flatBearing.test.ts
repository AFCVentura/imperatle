import { describe, expect, it } from "vitest";
import { flatBearing } from "./flatBearing";

describe("flatBearing", () => {
  it("points the way the flat map shows", () => {
    expect(flatBearing([0, 0], [10, 0])).toBeCloseTo(90, 0);
    expect(flatBearing([0, 0], [0, 10])).toBeCloseTo(0, 0);
    expect(flatBearing([0, 0], [-10, 0])).toBeCloseTo(270, 0);
    expect(flatBearing([0, 10], [0, -10])).toBeCloseTo(180, 0);
  });

  // Peru to northern India: the shortest route starts out heading
  // north-east, but on the flat map India is to the east, slightly up.
  it("differs from the globe's shortest route over long distances", () => {
    const flat = flatBearing([-72, -13], [78, 24]);
    expect(flat).toBeGreaterThan(65);
    expect(flat).toBeLessThan(90);
  });

  // The short way round across the date line: Japan to Hawaii is east.
  it("goes the short way across the date line", () => {
    expect(flatBearing([138, 36], [-157, 21])).toBeGreaterThan(90);
    expect(flatBearing([138, 36], [-157, 21])).toBeLessThan(120);
  });
});

import { describe, expect, it } from "vitest";
import { mapStageFor, mapStageForMode } from "./stage";

describe("mapStageFor", () => {
  it("starts with the outline only", () => {
    expect(mapStageFor(0, false)).toBe(1);
    expect(mapStageFor(1, false)).toBe(1);
  });

  it("adds the continents after the 2nd wrong guess and the countries after the 6th", () => {
    expect(mapStageFor(2, false)).toBe(2);
    expect(mapStageFor(5, false)).toBe(2);
    expect(mapStageFor(6, false)).toBe(3);
  });

  it("shows everything once the round is over, even after a quick win", () => {
    expect(mapStageFor(0, true)).toBe(3);
  });
});

describe("mapStageForMode", () => {
  it("follows the daily progression by default", () => {
    expect(mapStageForMode("Progressive", 2, false)).toBe(mapStageFor(2, false));
  });

  it("shows everything from the start in Full mode", () => {
    expect(mapStageForMode("Full", 0, false)).toBe(3);
  });

  it("keeps the outline until the end in Outline mode", () => {
    expect(mapStageForMode("Outline", 9, false)).toBe(1);
    expect(mapStageForMode("Outline", 9, true)).toBe(3);
  });
});

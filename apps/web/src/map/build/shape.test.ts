import { describe, expect, it } from "vitest";
import { geoContains } from "d3-geo";
import type { MultiPolygon, Position } from "geojson";
import { buildShape, type Rings } from "./shape";

// A square of land with the sea east of longitude 10, at the equator, where a
// tenth of a degree is about 11 km.
const box = (w: number, s: number, e: number, n: number): Rings => [[[w, s], [e, s], [e, n], [w, n], [w, s]]];
const land = [box(0, 0, 10, 10)];
const has = (shape: MultiPolygon, point: Position) => geoContains({ type: "Feature", properties: {}, geometry: shape }, point as [number, number]);

describe("buildShape coast fill", () => {
  const shortOfCoast = [box(5, 4, 9.9, 6)];

  it("fills the gap between a polity and the coast", () => {
    const shape = buildShape([shortOfCoast], land, [], { neighbours: [], km: 20 });
    expect(has(shape, [9.95, 5])).toBe(true);
    expect(has(buildShape([shortOfCoast], land), [9.95, 5])).toBe(false);
  });

  it("doesn't spread far along the coast or inland", () => {
    const shape = buildShape([shortOfCoast], land, [], { neighbours: [], km: 20 });
    expect(has(shape, [9.95, 7])).toBe(false);
    expect(has(shape, [4.9, 5])).toBe(false);
  });

  it("leaves to a neighbour the coast closer to it", () => {
    const neighbour = box(5, 6.05, 9.9, 8);
    const shape = buildShape([shortOfCoast], land, [], { neighbours: [neighbour], km: 20 });
    expect(has(shape, [9.95, 5])).toBe(true);
    expect(has(shape, [9.95, 6.04])).toBe(false);
  });

  it("adds nothing behind a polity that already reaches the sea", () => {
    const post = [box(9.8, 5, 10.2, 5.2)];
    const shape = buildShape([post], land, [], { neighbours: [], km: 20 });
    expect(has(shape, [9.75, 5.1])).toBe(false);
    expect(has(shape, [9.9, 5.1])).toBe(true);
  });

  it("keeps out the areas drawn to remove", () => {
    const shape = buildShape([shortOfCoast], land, [[box(9.85, 4.5, 10.5, 5.5)]], { neighbours: [], km: 20 });
    expect(has(shape, [9.95, 5])).toBe(false);
    expect(has(shape, [9.95, 4.2])).toBe(true);
  });
});

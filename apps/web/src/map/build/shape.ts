import type { Geometry, MultiPolygon, Position } from "geojson";
import { geoArea } from "d3-geo";
import polygonClipping, { type Geom, type Polygon as ClipPolygon } from "polygon-clipping";

// Builds an empire's map shape, shared by scripts/maps/build-shapes.mjs, the
// empire generator and (later) the public generator's server. Relative imports
// only, so Node can run it straight from the scripts.

export type Rings = Position[][]; // one polygon: outer ring, then holes

const EARTH_RADIUS_KM = 6371.0088;

export function polygonsOf(g: Geometry | null | undefined): Rings[] {
  if (g?.type === "Polygon") return [g.coordinates];
  if (g?.type === "MultiPolygon") return g.coordinates;
  return [];
}

type Box = [number, number, number, number];

export function boxOf(rings: Rings): Box {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of rings[0]) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  return [x0, y0, x1, y1];
}

const mergeBoxes = (a: Box, b: Box): Box => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
const overlaps = (a: Box, b: Box) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];

// Rounded to ~100 m, consecutive repeats dropped, degenerate rings removed
// (the whole polygon if its outer ring is the one that collapsed).
const round = (n: number) => Math.round(n * 1000) / 1000;
function tidy(rings: Rings): Rings {
  const tidied = rings.map((ring) =>
    ring.map(([x, y]) => [round(x), round(y)]).filter((p, i, r) => i === 0 || p[0] !== r[i - 1][0] || p[1] !== r[i - 1][1]),
  );
  return tidied[0].length < 4 ? [] : tidied.filter((ring) => ring.length >= 4);
}

// d3-geo draws on the sphere: an exterior ring must wind clockwise, or the
// polygon covers the rest of the globe. Flip any that came out inside out.
function forD3(rings: Rings): Rings {
  return geoArea({ type: "Polygon", coordinates: rings }) > 2 * Math.PI ? rings.map((r) => [...r].reverse()) : rings;
}

const asClip = (polygons: Rings[]) => polygons as unknown as ClipPolygon[];

// polygon-clipping can fail on near-coincident edges with long decimals
// ("Unable to complete output ring"), e.g. an empire merged with a whole
// modern country before being clipped by the land. Snapping to 7 decimals
// (about 1 cm) avoids it without any visible change.
const snapValue = (n: number) => Math.round(n * 1e7) / 1e7;
const snap = (polygons: Rings[]): Rings[] => polygons.map((rings) => rings.map((ring) => ring.map(([x, y]) => [snapValue(x), snapValue(y)])));

// The parts (each a list of polygons) merged, before any clipping: what the
// dataset draws, sea included.
export function mergeParts(parts: Rings[][]): Rings[] {
  const nonEmpty = parts.filter((p) => p.length > 0);
  if (nonEmpty.length === 0) return [];
  const [first, ...rest] = nonEmpty.map(asClip);
  return snap(polygonClipping.union(first as Geom, ...(rest as Geom[])) as unknown as Rings[]);
}

// The merged parts clipped by the land (the game's coastline), tidied and
// wound for d3: the shape the game draws.
export function buildShape(parts: Rings[][], land: Rings[]): MultiPolygon {
  const merged = mergeParts(parts);
  if (merged.length === 0) return { type: "MultiPolygon", coordinates: [] };
  const box = merged.map(boxOf).reduce(mergeBoxes);
  const nearbyLand = land.filter((p) => overlaps(boxOf(p), box));
  const clipped = polygonClipping.intersection(asClip(merged) as Geom, asClip(nearbyLand) as Geom) as unknown as Rings[];
  return { type: "MultiPolygon", coordinates: clipped.map(tidy).filter((r) => r.length > 0).map(forD3) };
}

// Same rings as the shape, wound for d3 but not clipped (to compare with the
// dataset's own coastline).
export function rawShape(parts: Rings[][]): MultiPolygon {
  return { type: "MultiPolygon", coordinates: mergeParts(parts).map(tidy).filter((r) => r.length > 0).map(forD3) };
}

export function areaKm2(shape: MultiPolygon): number {
  return Math.round(geoArea(shape) * EARTH_RADIUS_KM ** 2);
}

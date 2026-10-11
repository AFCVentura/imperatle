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

// The maths here is planar, on longitude/latitude, so the globe is cut at
// some meridian: by default the antimeridian, where the datasets already cut
// it. An empire across it (the Russian Empire's Chukotka and Alaska) would
// come out in two pieces with a seam on the 180th meridian, so for those the
// cut moves to the widest gap between the parts (e.g. the Atlantic) and
// whatever lies west of it goes round by 360°: Chukotka at -175° becomes 185°,
// next to the rest at 179°. The shape then keeps those longitudes past 180°,
// which d3 draws as the same place on the globe.

const clipToBox = (polygons: Rings[], [w, s, e, n]: Box): Rings[] =>
  polygonClipping.intersection(asClip(polygons) as Geom, [[[[w, s], [e, s], [e, n], [w, n], [w, s]]]] as unknown as Geom) as unknown as Rings[];
const shift = (polygons: Rings[], dx: number): Rings[] => polygons.map((rings) => rings.map((ring) => ring.map(([x, y]) => [x + dx, y])));

// Longitudes back within -180..180, cut at the antimeridian (for comparing
// with land that is in that range, and for rings drawn across it).
export function toStandardLongitudes(polygons: Rings[]): Rings[] {
  return polygons.flatMap((p) => {
    const [w, , e] = boxOf(p);
    if (w >= -180 && e <= 180) return [p];
    return [-360, 0, 360].flatMap((dx) => clipToBox(shift([p], dx), [-180, -90, 180, 90]));
  });
}

// The meridian to cut at, or null for the antimeridian (any part that
// doesn't reach it, i.e. almost every empire, takes this path unchanged).
function cutFor(parts: Rings[][]): number | null {
  const boxes = parts.flat().map(boxOf);
  if (!boxes.some(([w, , e]) => w <= -180 || e >= 180)) return null;
  const spans = boxes.map(([w, , e]) => [w, e]).sort((a, b) => a[0] - b[0]);
  let best = { gap: 0, at: 180 };
  let end = spans[0][1];
  for (const [w, e] of spans.slice(1)) {
    if (w - end > best.gap) best = { gap: w - end, at: (w + end) / 2 };
    end = Math.max(end, e);
  }
  // The gap across the antimeridian itself, when it's still the widest.
  return spans[0][0] + 360 - end >= best.gap ? null : best.at;
}

// Polygons moved to longitudes cut..cut+360.
function cutAt(polygons: Rings[], cut: number): Rings[] {
  return polygons.flatMap((p) => {
    const [w, , e] = boxOf(p);
    if (w >= cut) return [p];
    if (e <= cut) return shift([p], 360);
    return [...clipToBox([p], [cut, -90, 180, 90]), ...shift(clipToBox([p], [-180, -90, cut, 90]), 360)];
  });
}

// The land, moved for a cut; the last one is kept (the generator rebuilds the
// same empire many times in a row).
let landCut: { land: Rings[]; cut: number; moved: Rings[] } | null = null;
function landAt(land: Rings[], cut: number | null): Rings[] {
  if (cut === null) return land;
  if (landCut?.land !== land || landCut.cut !== cut) landCut = { land, cut, moved: cutAt(land, cut) };
  return landCut.moved;
}

// A ring drawn by hand in the generator, as polygons: polygon-clipping
// untangles a stroke that crosses itself (a figure 8 becomes two loops). The
// ring's longitudes run on past ±180° when it was drawn across the
// antimeridian; the polygons come back within -180..180.
export function drawnPolygons(ring: Position[]): Rings[] {
  if (ring.length < 3) return [];
  const closed = ring[0][0] === ring.at(-1)![0] && ring[0][1] === ring.at(-1)![1] ? ring : [...ring, ring[0]];
  return toStandardLongitudes(polygonClipping.union([closed] as unknown as Geom) as unknown as Rings[]);
}

// The parts (each a list of polygons) merged, minus the removed areas, before
// any clipping: what the dataset draws, sea included.
function mergeCut(parts: Rings[][], removed: Rings[][], cut: number | null): Rings[] {
  return cut === null ? mergeParts(parts, removed) : mergeParts(parts.map((p) => cutAt(p, cut)), removed.map((p) => cutAt(p, cut)));
}

export function mergeParts(parts: Rings[][], removed: Rings[][] = []): Rings[] {
  const nonEmpty = parts.filter((p) => p.length > 0);
  if (nonEmpty.length === 0) return [];
  const [first, ...rest] = nonEmpty.map(asClip);
  const merged = polygonClipping.union(first as Geom, ...(rest as Geom[]));
  const cuts = removed.filter((p) => p.length > 0).map(asClip);
  const result = cuts.length > 0 ? polygonClipping.difference(snap(merged as unknown as Rings[]) as unknown as Geom, ...(cuts as Geom[])) : merged;
  return snap(result as unknown as Rings[]);
}

// The merged parts clipped by the land (the game's coastline), tidied and
// wound for d3: the shape the game draws.
export function buildShape(parts: Rings[][], land: Rings[], removed: Rings[][] = []): MultiPolygon {
  const cut = cutFor(parts);
  const merged = mergeCut(parts, removed, cut);
  if (merged.length === 0) return { type: "MultiPolygon", coordinates: [] };
  const box = merged.map(boxOf).reduce(mergeBoxes);
  const nearbyLand = landAt(land, cut).filter((p) => overlaps(boxOf(p), box));
  const clipped = polygonClipping.intersection(asClip(merged) as Geom, asClip(nearbyLand) as Geom) as unknown as Rings[];
  return { type: "MultiPolygon", coordinates: clipped.map(tidy).filter((r) => r.length > 0).map(forD3) };
}

// Same rings as the shape, wound for d3 but not clipped (to compare with the
// dataset's own coastline).
export function rawShape(parts: Rings[][], removed: Rings[][] = []): MultiPolygon {
  return { type: "MultiPolygon", coordinates: mergeCut(parts, removed, cutFor(parts)).map(tidy).filter((r) => r.length > 0).map(forD3) };
}

export function areaKm2(shape: MultiPolygon): number {
  return Math.round(geoArea(shape) * EARTH_RADIUS_KM ** 2);
}

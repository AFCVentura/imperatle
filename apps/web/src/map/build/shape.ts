import type { Geometry, MultiPolygon, Position } from "geojson";
import { geoArea } from "d3-geo";
import polygonClipping, { type Geom, type Polygon as ClipPolygon } from "polygon-clipping";
import buffer from "@turf/buffer";

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

// Cliopatria draws coastlines coarser than the game's land, so a polity often
// stops a few km short of the sea and the clipped shape loses its coast. The
// coast fill gives the empire the land that is near both the empire and the
// sea and that no other polity of the time holds (neighbours: the other
// Cliopatria polities at the same years). Land a neighbour is closer to stays
// out, so trading posts and small kingdoms on the coast keep their place.
export type CoastFill = { neighbours: Rings[]; km: number };

// How far a polity may fall short of the coast and still get it: Cliopatria's
// coastlines miss the game's by up to about this much.
export const COAST_FILL_KM = 20;

// Polygons grown (km > 0) or shrunk (km < 0) by about km, each on its own
// local projection; a polygon that shrinks away is dropped. Slivers left by
// the clipping go first: buffering a degenerate polygon gives back only part
// of it.
function buffered(polygons: Rings[], km: number): Rings[] {
  if (Math.abs(km) < 0.01) return polygons;
  return polygons.filter((rings) => areaOnPlaneKm2(rings) > 0.01).flatMap((rings) => {
    const result = buffer({ type: "Polygon", coordinates: rings }, km, { units: "kilometers", steps: 4 });
    return result ? polygonsOf(result.geometry) : [];
  });
}

// polygon-clipping still fails now and then on the buffers' many near-parallel
// edges; snapping coarser (down to about 10 m) and trying again gets past it.
function robust(op: (...g: Geom[]) => unknown, ...inputs: Rings[][]): Rings[] {
  for (const decimals of [7, 5, 4]) {
    const f = 10 ** decimals;
    const snapped = inputs.map((p) => p.map((rings) => rings.map((ring) => ring.map(([x, y]) => [Math.round(x * f) / f, Math.round(y * f) / f]))));
    try {
      return snap(op(...(snapped.map(asClip) as Geom[])) as Rings[]);
    } catch (e) {
      if (decimals === 4) throw e;
    }
  }
  return [];
}

const union = (polygons: Rings[]): Rings[] => (polygons.length === 0 ? [] : robust(polygonClipping.union, polygons));
const within = (a: Rings[], b: Rings[]): Rings[] => (a.length === 0 || b.length === 0 ? [] : robust(polygonClipping.intersection, a, b));
function minus(a: Rings[], ...b: Rings[][]): Rings[] {
  const cuts = b.filter((p) => p.length > 0);
  return a.length === 0 || cuts.length === 0 ? a : robust(polygonClipping.difference, a, ...cuts);
}

// The land to add along the coasts of merged (the empire's parts minus the
// removed areas, sea included).
//
// A point is filled when it lies on a short way from the empire to the sea:
// its distance to the empire plus its distance to the sea, going round the
// empire, is at most km. The gap between a polity and the coast passes; land
// behind a polity that already reaches the sea doesn't. Both distances are
// taken in steps of km / COAST_STEPS.
function coastFill(merged: Rings[], nearbyLand: Rings[], removed: Rings[], { neighbours, km }: CoastFill): Rings[] {
  // A small polygon (a trading post) reaches at most a quarter of its width,
  // so it doesn't spread far along the coast.
  const limits = merged.map((p) => Math.min(km, Math.sqrt(areaOnPlaneKm2(p)) / 4));
  const grow = (distance: number) => union(merged.flatMap((p, i) => buffered([p], Math.min(distance, limits[i]))));
  const reach = grow(km);
  const box = reach.map(boxOf).reduce(mergeBoxes);
  const near = neighbours.filter((p) => overlaps(boxOf(p), box));
  const step = km / COAST_STEPS;
  // The sea near the reach (only the sea within km of it counts), then the
  // land it reaches step by step without crossing the empire: seaReach[k] is
  // the land within k steps of the sea. The sea is the zone minus the whole
  // land, not minus the land cut by the zone: their edges would run together
  // and leave slivers.
  const zone = union(buffered(reach, km));
  const land = within(nearbyLand, zone);
  let front = minus(zone, nearbyLand, merged);
  const seaReach: Rings[][] = [[]];
  for (let k = 1; k <= COAST_STEPS; k++) {
    front = within(minus(union(buffered(front, step)), merged), zone);
    seaReach.push(within(land, front));
  }
  const pieces = Array.from({ length: COAST_STEPS }, (_, i) => {
    const fromEmpire = (i + 1) * step;
    // What a neighbour reaches as soon as the empire does stays with it, so
    // a coast shared with a nearby kingdom is split between the two.
    return within(minus(grow(fromEmpire), union(buffered(near, fromEmpire))), seaReach[COAST_STEPS - i]);
  });
  return minus(union(pieces.flat()), merged, removed);
}

const COAST_STEPS = 4;

// Area of a polygon from its longitudes/latitudes, close enough for sizes of
// a few km.
function areaOnPlaneKm2(rings: Rings): number {
  const lat = (boxOf(rings)[1] + boxOf(rings)[3]) / 2;
  const kmPerDegree = 111.195;
  return rings.reduce((sum, ring, i) => {
    let a = 0;
    for (let j = 0, k = ring.length - 1; j < ring.length; k = j++) a += (ring[k][0] + ring[j][0]) * (ring[k][1] - ring[j][1]);
    return sum + (i === 0 ? 1 : -1) * Math.abs(a / 2);
  }, 0) * kmPerDegree ** 2 * Math.cos((lat * Math.PI) / 180);
}

// The merged parts clipped by the land (the game's coastline), tidied and
// wound for d3: the shape the game draws. With a coast fill, the land between
// the parts and the sea comes too.
export function buildShape(parts: Rings[][], land: Rings[], removed: Rings[][] = [], coast?: CoastFill): MultiPolygon {
  const cut = cutFor(parts);
  const merged = mergeCut(parts, removed, cut);
  if (merged.length === 0) return { type: "MultiPolygon", coordinates: [] };
  const box = merged.map(boxOf).reduce(mergeBoxes);
  const slack = coast ? 1 : 0; // degrees around the empire the fill may reach
  const nearbyLand = landAt(land, cut).filter((p) => overlaps(boxOf(p), [box[0] - slack, box[1] - slack, box[2] + slack, box[3] + slack]));
  let clipped = polygonClipping.intersection(asClip(merged) as Geom, asClip(nearbyLand) as Geom) as unknown as Rings[];
  if (coast && coast.km > 0) {
    const neighbours = cut === null ? coast.neighbours : cutAt(coast.neighbours, cut);
    const cuts = removed.flatMap((p) => (cut === null ? p : cutAt(p, cut)));
    const fill = coastFill(merged, nearbyLand, cuts, { neighbours, km: coast.km });
    if (fill.length > 0) clipped = union([...snap(clipped), ...fill]);
  }
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

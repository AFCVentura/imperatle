// Builds apps/api/Content/shapes/<slug>.json for every empire whose content
// file has a "map" (or only the slugs given): the Cliopatria polities listed
// in map.parts, merged, clipped by the land of public/geo/world.json (so the
// coast is exactly the one the game draws) and written as a bare MultiPolygon,
// coordinates only, so the file can't give the answer away.
//
// Usage: node scripts/maps/build-shapes.mjs <cliopatria.geojson> [slug ...]
// Run build-world.mjs first. Source: Cliopatria (Bennett et al., Seshat Global
// History Databank), CC BY 4.0, https://github.com/Seshat-Global-History-Databank/cliopatria
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { geoArea } from "d3-geo";
import polygonClipping from "polygon-clipping";
import { merge } from "topojson-client";

const [clioFile, ...only] = process.argv.slice(2);
if (!clioFile) throw new Error("usage: build-shapes.mjs <cliopatria.geojson> [slug ...]");

const EMPIRES = "../api/Content/empires";
const SHAPES = "../api/Content/shapes";
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const polygonsOf = (g) => (g?.type === "Polygon" ? [g.coordinates] : g?.type === "MultiPolygon" ? g.coordinates : []);

const empires = readdirSync(EMPIRES)
  .filter((f) => f.endsWith(".json"))
  .map((f) => read(`${EMPIRES}/${f}`))
  .filter((e) => e.map && (only.length === 0 || only.includes(e.slug)));
if (empires.length === 0) throw new Error("no empire with a map to build");

const world = read("public/geo/world.json");
const land = polygonsOf(merge(world, world.objects.countries.geometries));
const polities = read(clioFile).features;

const box = (rings) => rings[0].reduce(
  ([x0, y0, x1, y1], [x, y]) => [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)],
  [Infinity, Infinity, -Infinity, -Infinity],
);
const overlaps = (a, b) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];

// Rounded to ~100 m, consecutive repeats dropped, degenerate rings removed
// (the whole polygon if its outer ring is the one that collapsed).
const round = (n) => Math.round(n * 1000) / 1000;
function tidy(rings) {
  const tidied = rings.map((ring) =>
    ring.map(([x, y]) => [round(x), round(y)]).filter((p, i, r) => i === 0 || p[0] !== r[i - 1][0] || p[1] !== r[i - 1][1]),
  );
  return tidied[0].length < 4 ? [] : tidied.filter((ring) => ring.length >= 4);
}

// d3-geo draws on the sphere: an exterior ring must wind clockwise, or the
// polygon covers the rest of the globe. Flip any that came out inside out.
const forD3 = (rings) => (geoArea({ type: "Polygon", coordinates: rings }) > 2 * Math.PI ? rings.map((r) => [...r].reverse()) : rings);

mkdirSync(SHAPES, { recursive: true });
for (const empire of empires) {
  const parts = empire.map.parts.map(({ polity, year }) => {
    const hits = polities.filter((f) => f.properties.Name === polity && f.properties.FromYear <= year && year <= f.properties.ToYear);
    if (hits.length === 0) throw new Error(`${empire.slug}: no "${polity}" in Cliopatria for ${year}`);
    return hits.flatMap((f) => polygonsOf(f.geometry));
  });
  const shape = polygonClipping.union(...parts);
  const shapeBox = shape.map(box).reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]);
  const clipped = polygonClipping.intersection(shape, land.filter((p) => overlaps(box(p), shapeBox)));
  const coordinates = clipped.map(tidy).filter((rings) => rings.length > 0).map(forD3);

  const json = JSON.stringify({ type: "MultiPolygon", coordinates });
  writeFileSync(`${SHAPES}/${empire.slug}.json`, json + "\n");
  console.log(`${empire.slug}: ${coordinates.length} polygons, ${(json.length / 1024).toFixed(0)} KB`);
}

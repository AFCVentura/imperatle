// Builds apps/api/Content/shapes/<slug>.json for every empire whose content
// file has a "map" (or only the slugs given): the Cliopatria polities and
// today's territories listed in map.parts, merged, clipped by the land of public/geo/world.json (so the
// coast is exactly the one the game draws) and written as a bare MultiPolygon,
// coordinates only, so the file can't give the answer away.
//
// Usage: node scripts/maps/build-shapes.mjs <cliopatria.geojson> [slug ...]
// Run build-world.mjs first. Source: Cliopatria (Bennett et al., Seshat Global
// History Databank), CC BY 4.0, https://github.com/Seshat-Global-History-Databank/cliopatria
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { feature, merge } from "topojson-client";
import { buildShape, polygonsOf } from "../../src/map/build/shape.ts";

const [clioFile, ...only] = process.argv.slice(2);
if (!clioFile) throw new Error("usage: build-shapes.mjs <cliopatria.geojson> [slug ...]");

const EMPIRES = "../api/Content/empires";
const SHAPES = "../api/Content/shapes";
const read = (p) => JSON.parse(readFileSync(p, "utf8"));

const empires = readdirSync(EMPIRES)
  .filter((f) => f.endsWith(".json"))
  .map((f) => read(`${EMPIRES}/${f}`))
  .filter((e) => e.map && (only.length === 0 || only.includes(e.slug)));
if (empires.length === 0) throw new Error("no empire with a map to build");

const world = read("public/geo/world.json");
const land = polygonsOf(merge(world, world.objects.countries.geometries));
const countries = new Map(feature(world, world.objects.countries).features.map((f) => [f.id, f.geometry]));
const polities = read(clioFile).features;

mkdirSync(SHAPES, { recursive: true });
for (const empire of empires) {
  const parts = empire.map.parts.map(({ polity, year, country }) => {
    if (country) {
      if (!countries.has(country)) throw new Error(`${empire.slug}: no territory ${country} in the world map`);
      return polygonsOf(countries.get(country));
    }
    const hits = polities.filter((f) => f.properties.Name === polity && f.properties.FromYear <= year && year <= f.properties.ToYear);
    if (hits.length === 0) throw new Error(`${empire.slug}: no "${polity}" in Cliopatria for ${year}`);
    return hits.flatMap((f) => polygonsOf(f.geometry));
  });
  const { coordinates } = buildShape(parts, land);

  const json = JSON.stringify({ type: "MultiPolygon", coordinates });
  writeFileSync(`${SHAPES}/${empire.slug}.json`, json + "\n");
  console.log(`${empire.slug}: ${coordinates.length} polygons, ${(json.length / 1024).toFixed(0)} KB`);
}

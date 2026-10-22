// Builds apps/api/Content/shapes/<slug>.json for every empire whose content
// file has a "map" (or only the slugs given): the Cliopatria polities and
// today's territories listed in map.parts, merged with the areas drawn to add,
// minus those drawn to remove, clipped by the land of public/geo/world.json (so the
// coast is exactly the one the game draws), with the coast filled where the
// polities fall short of it, and written as a bare MultiPolygon, coordinates
// only, so the file can't give the answer away. The same code as the empire
// generator, on the same local Cliopatria index.
//
// Usage, from apps/web: node scripts/maps/build-shapes.mjs [--area] [slug ...]
// --area also writes each shape's area into the empire's area.km2, where it
// was the old shape's area (one from a source, rounded or cited, stays).
// Run build-world.mjs and index-cliopatria.mjs first. Source: Cliopatria
// (Bennett et al., Seshat Global History Databank), CC BY 4.0,
// https://github.com/Seshat-Global-History-Databank/cliopatria
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { findPolityByName, neighbourPolygons, partPolygons, worldLand } from "../../src/map/build/localData.ts";
import { areaKm2, buildShape, COAST_FILL_KM, mergeParts } from "../../src/map/build/shape.ts";

const args = process.argv.slice(2);
const writeArea = args.includes("--area");
const only = args.filter((a) => a !== "--area");

const EMPIRES = "../api/Content/empires";
const SHAPES = "../api/Content/shapes";

const empires = readdirSync(EMPIRES)
  .filter((f) => f.endsWith(".json"))
  .map((f) => ({ file: `${EMPIRES}/${f}`, text: readFileSync(`${EMPIRES}/${f}`, "utf8") }))
  .map((e) => ({ ...e, empire: JSON.parse(e.text) }))
  .filter(({ empire }) => empire.map && (only.length === 0 || only.includes(empire.slug)));
if (empires.length === 0) throw new Error("no empire with a map to build");

const { land } = worldLand();
mkdirSync(SHAPES, { recursive: true });
for (const { file, text, empire } of empires) {
  const refs = empire.map.parts.map(({ polity, year, ...rest }) => {
    if (!polity) return rest;
    const found = findPolityByName(polity);
    if (!found) throw new Error(`${empire.slug}: no "${polity}" in the Cliopatria index`);
    return { id: found.id, year };
  });
  const { polygons, removed } = partPolygons(refs);
  const neighbours = neighbourPolygons(refs, mergeParts(polygons));
  const shape = buildShape(polygons, land, removed, { neighbours, km: COAST_FILL_KM });

  const shapeFile = `${SHAPES}/${empire.slug}.json`;
  const oldArea = existsSync(shapeFile) ? areaKm2(JSON.parse(readFileSync(shapeFile, "utf8"))) : null;
  const json = JSON.stringify(shape);
  writeFileSync(shapeFile, json + "\n");
  const area = areaKm2(shape);
  const areaWritten = writeArea && (oldArea === null || empire.area.km2 === oldArea);
  if (areaWritten) writeFileSync(file, text.replace(/("area": \{\s*"km2": )\d+/, `$1${area}`));
  console.log(`${empire.slug}: ${shape.coordinates.length} polygons, ${(json.length / 1024).toFixed(0)} KB, ${area} km²${areaWritten ? " (area.km2 updated)" : ""}`);
}

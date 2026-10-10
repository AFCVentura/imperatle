// Splits the Cliopatria GeoJSON (~170 MB) into a small searchable index plus
// one file per polity, so the empire generator reads only what it needs
// instead of holding the whole dataset in memory. Output in dev-data/cliopatria
// (not versioned). The future public generator will hold the same data in
// Postgres/PostGIS behind the same endpoints.
//
// Usage: node scripts/maps/index-cliopatria.mjs <cliopatria.geojson>
// Source: Cliopatria (Bennett et al., Seshat Global History Databank), CC BY 4.0,
// https://github.com/Seshat-Global-History-Databank/cliopatria
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const [src] = process.argv.slice(2);
if (!src) throw new Error("usage: index-cliopatria.mjs <cliopatria.geojson>");

const OUT = "dev-data/cliopatria";
const features = JSON.parse(readFileSync(src, "utf8")).features.filter((f) => f.properties.Type === "POLITY" && f.geometry);

const byName = new Map();
for (const f of features) {
  const name = f.properties.Name;
  if (!byName.has(name)) byName.set(name, []);
  byName.get(name).push(f);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/polities`, { recursive: true });

const index = [...byName.keys()].sort((a, b) => a.localeCompare(b)).map((name, i) => {
  const id = `p${String(i).padStart(4, "0")}`;
  const records = byName.get(name).sort((a, b) => a.properties.FromYear - b.properties.FromYear);
  const ranges = records.map((f) => ({ from: f.properties.FromYear, to: f.properties.ToYear, areaKm2: Math.round(f.properties.Area) }));
  const peak = ranges.reduce((best, r) => (r.areaKm2 > best.areaKm2 ? r : best));
  const first = records[0].properties;
  writeFileSync(
    `${OUT}/polities/${id}.json`,
    JSON.stringify(records.map((f, j) => ({ ...ranges[j], geometry: f.geometry }))),
  );
  return {
    id,
    name,
    wikipedia: first.Wikipedia || null,
    wikidata: first.Wikidata || null,
    from: ranges[0].from,
    to: ranges[ranges.length - 1].to,
    peakAreaKm2: peak.areaKm2,
    peakYear: peak.from,
    ranges: ranges.map(({ from, to, areaKm2 }) => [from, to, areaKm2]),
  };
});

writeFileSync(`${OUT}/index.json`, JSON.stringify(index));
console.log(`${OUT}: ${index.length} polities from ${features.length} records`);

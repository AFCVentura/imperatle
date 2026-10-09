// Builds public/geo/world.json and world-light.json: Natural Earth countries
// as TopoJSON, with the names the map shows on click. Land and borders are derived from it in the
// browser (topojson merge/mesh), so coast and borders share the same lines.
//
// Usage: node scripts/maps/build-world.mjs <ne_50m_admin_0_countries.geojson>
// Source: https://github.com/nvkelso/natural-earth-vector (public domain).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { quantize } from "topojson-client";
import { topology } from "topojson-server";
import { presimplify, quantile, simplify } from "topojson-simplify";

const [src] = process.argv.slice(2);
if (!src) throw new Error("usage: build-world.mjs <ne_50m_admin_0_countries.geojson>");

// Natural Earth's NAME_PT is European Portuguese; the game speaks Brazilian.
const PT_BR = {
  "Arménia": "Armênia",
  "Benim": "Benin",
  "Chéquia": "Tchéquia",
  "Coletividade de São Bartolomeu": "São Bartolomeu",
  "Djibouti": "Djibuti",
  "Eslovénia": "Eslovênia",
  "Estónia": "Estônia",
  "Glaciar de Siachen": "Geleira de Siachen",
  "Ilhas Caimão": "Ilhas Cayman",
  "Ilhas Feroe": "Ilhas Faroé",
  "Iémen": "Iêmen",
  "Irão": "Irã",
  "Letónia": "Letônia",
  "Macedónia do Norte": "Macedônia do Norte",
  "Madagáscar": "Madagascar",
  "Maurícia": "Maurício",
  "Mónaco": "Mônaco",
  "Myanmar": "Mianmar",
  "Nova Caledónia": "Nova Caledônia",
  "Polónia": "Polônia",
  "Quénia": "Quênia",
  "República da Irlanda": "Irlanda",
  "Roménia": "Romênia",
  "Sara Ocidental": "Saara Ocidental",
  "Vietname": "Vietnã",
};

const ne = JSON.parse(readFileSync(src, "utf8"));
const countries = {
  type: "FeatureCollection",
  features: ne.features.map((f) => ({
    type: "Feature",
    id: f.properties.ADM0_A3,
    properties: {
      en: f.properties.NAME_EN,
      pt: PT_BR[f.properties.NAME_PT] ?? f.properties.NAME_PT,
      continent: f.properties.CONTINENT,
    },
    geometry: f.geometry,
  })),
};

// Two versions: the full one (30% of Natural Earth's points, crisp at the
// game's zoom levels) and a light one (6%) the globe draws while spinning.
// The light one drops the smallest islands; keeping them made spinning
// noticeably less smooth, and they come back as soon as the globe stops.
// presimplify stores a weight as a third number on every point; it's dropped
// before quantizing, or the file would grow instead of shrinking.
function simplified(keep) {
  const topo = presimplify(topology({ countries }));
  const out = simplify(topo, quantile(topo, keep));
  out.arcs = out.arcs.map((arc) => arc.map(([x, y]) => [x, y]));
  return out;
}

mkdirSync("public/geo", { recursive: true });
for (const [file, topo] of [["world.json", simplified(0.3)], ["world-light.json", simplified(0.06)]]) {
  const json = JSON.stringify(quantize(topo, 1e5));
  writeFileSync(`public/geo/${file}`, json);
  console.log(`public/geo/${file}: ${countries.features.length} countries, ${(json.length / 1024).toFixed(0)} KB`);
}

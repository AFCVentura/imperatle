import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { MultiPolygon } from "geojson";
import { notFound } from "next/navigation";
import { DevMaps } from "./DevMaps";

// Review page for the empire maps: every empire with a shape in the API's
// content (apps/api/Content/shapes), named here since this page never ships.
export default function DevMapsPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const content = path.join(process.cwd(), "..", "api", "Content");
  const empires = readdirSync(path.join(content, "empires"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(path.join(content, "empires", f), "utf8")) as { slug: string; name: { pt: string }; peak: { year: number } })
    .filter((e) => existsSync(path.join(content, "shapes", `${e.slug}.json`)))
    .map((e) => ({
      id: e.slug,
      label: `${e.name.pt} (${e.peak.year})`,
      shape: JSON.parse(readFileSync(path.join(content, "shapes", `${e.slug}.json`), "utf8")) as MultiPolygon,
    }));
  return <DevMaps empires={empires} />;
}

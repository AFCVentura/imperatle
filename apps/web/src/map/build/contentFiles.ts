import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { MultiPolygon } from "geojson";
import { toContentJson, type EmpireDraft, type Text } from "./empireDraft.ts";

// The API's content files (apps/api/Content), as the empire generator reads
// and writes them. Server side, development only; the public generator will
// keep drafts in the database instead.

const CONTENT = path.join(process.cwd(), "..", "api", "Content");
const empireFile = (slug: string) => path.join(CONTENT, "empires", `${slug}.json`);
const shapeFile = (slug: string) => path.join(CONTENT, "shapes", `${slug}.json`);

export const isSlug = (s: string) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s);

export function listEmpires(): { slug: string; name: Text }[] {
  return readdirSync(path.join(CONTENT, "empires"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(path.join(CONTENT, "empires", f), "utf8")) as { slug: string; name: Text })
    .map(({ slug, name }) => ({ slug, name }))
    .sort((a, b) => a.name.pt.localeCompare(b.name.pt, "pt"));
}

export const empireExists = (slug: string) => existsSync(empireFile(slug));

// An empire file as a draft: optional texts become empty ones, so the form
// always has every field.
export function readEmpire(slug: string): EmpireDraft | null {
  if (!isSlug(slug) || !empireExists(slug)) return null;
  const json = JSON.parse(readFileSync(empireFile(slug), "utf8")) as EmpireDraft & { $schema?: string };
  delete json.$schema;
  const blank = (): Text => ({ en: "", pt: "" });
  return {
    ...json,
    durationNotes: json.durationNotes ?? blank(),
    religionNotes: json.religionNotes ?? blank(),
    wikipedia: json.wikipedia ?? blank(),
    aliases: json.aliases ?? [],
    summary: json.summary ?? blank(),
    curiosities: json.curiosities.map((c) => ({ ...c, details: c.details ?? blank() })),
    map: json.map ?? { parts: [] },
  };
}

export function writeEmpire(draft: EmpireDraft, shape: MultiPolygon): string[] {
  writeFileSync(empireFile(draft.slug), toContentJson(draft));
  writeFileSync(shapeFile(draft.slug), JSON.stringify({ type: "MultiPolygon", coordinates: shape.coordinates }) + "\n");
  return [`apps/api/Content/empires/${draft.slug}.json`, `apps/api/Content/shapes/${draft.slug}.json`];
}

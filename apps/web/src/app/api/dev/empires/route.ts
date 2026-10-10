import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { MultiPolygon } from "geojson";
import { NextResponse } from "next/server";
import { jsonError, notInProduction } from "@/lib/devOnly";
import { toContentJson, validateDraft, type EmpireDraft, type Text } from "@/map/build/empireDraft";

// The empire generator's "save": writes the draft as the API's content files,
// Content/empires/<slug>.json and Content/shapes/<slug>.json, ready to commit.
// The public generator will store drafts in the database for review instead.

const CONTENT = path.join(process.cwd(), "..", "api", "Content");

function existingEmpires(): { slug: string; name: Text }[] {
  return readdirSync(path.join(CONTENT, "empires"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(path.join(CONTENT, "empires", f), "utf8")) as { slug: string; name: Text });
}

// GET /api/dev/empires: the empires already in the content (slug and names),
// so the form can flag a clash before saving.
export function GET() {
  const blocked = notInProduction();
  if (blocked) return blocked;
  return NextResponse.json(existingEmpires().map(({ slug, name }) => ({ slug, name })));
}

// POST /api/dev/empires { draft, shape }
export async function POST(request: Request) {
  const blocked = notInProduction();
  if (blocked) return blocked;

  const body = (await request.json().catch(() => null)) as { draft?: EmpireDraft; shape?: MultiPolygon } | null;
  const draft = body?.draft;
  const shape = body?.shape;
  if (!draft || shape?.type !== "MultiPolygon" || shape.coordinates.length === 0) return jsonError("draft and a non-empty shape are required");

  const errors = validateDraft(draft, existingEmpires());
  if (errors.length > 0) return NextResponse.json({ errors }, { status: 400 });

  // Editing an existing empire comes later (phase 2); never overwrite one.
  const empireFile = path.join(CONTENT, "empires", `${draft.slug}.json`);
  if (existsSync(empireFile)) return jsonError(`Content/empires/${draft.slug}.json already exists`, 409);

  writeFileSync(empireFile, toContentJson(draft));
  writeFileSync(path.join(CONTENT, "shapes", `${draft.slug}.json`), JSON.stringify({ type: "MultiPolygon", coordinates: shape.coordinates }) + "\n");
  return NextResponse.json({ saved: [`apps/api/Content/empires/${draft.slug}.json`, `apps/api/Content/shapes/${draft.slug}.json`] });
}

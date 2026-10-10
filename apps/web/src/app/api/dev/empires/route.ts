import type { MultiPolygon } from "geojson";
import { NextResponse } from "next/server";
import { jsonError, notInProduction } from "@/lib/devOnly";
import { empireExists, listEmpires, writeEmpire } from "@/map/build/contentFiles";
import { validateDraft, type EmpireDraft } from "@/map/build/empireDraft";

// The empire generator's "save" for a new empire: writes the draft as the
// API's content files, Content/empires/<slug>.json and Content/shapes/<slug>.json,
// ready to commit. The public generator will store drafts in the database for
// review instead.

// GET /api/dev/empires: the empires already in the content (slug and names),
// to open one for editing and to flag a clash before saving.
export function GET() {
  const blocked = notInProduction();
  if (blocked) return blocked;
  return NextResponse.json(listEmpires());
}

// POST /api/dev/empires { draft, shape }
export async function POST(request: Request) {
  const blocked = notInProduction();
  if (blocked) return blocked;

  const body = (await request.json().catch(() => null)) as { draft?: EmpireDraft; shape?: MultiPolygon } | null;
  const draft = body?.draft;
  const shape = body?.shape;
  if (!draft || shape?.type !== "MultiPolygon" || shape.coordinates.length === 0) return jsonError("draft and a non-empty shape are required");

  const errors = validateDraft(draft, listEmpires());
  if (errors.length > 0) return NextResponse.json({ errors }, { status: 400 });

  // A new empire never overwrites one; editing goes through PUT /api/dev/empires/{slug}.
  if (empireExists(draft.slug)) return jsonError(`Content/empires/${draft.slug}.json already exists`, 409);

  return NextResponse.json({ saved: writeEmpire(draft, shape) });
}

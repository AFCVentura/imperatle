import type { MultiPolygon } from "geojson";
import { NextResponse } from "next/server";
import { jsonError, notInProduction } from "@/lib/devOnly";
import { empireExists, listEmpires, readEmpire, writeEmpire } from "@/map/build/contentFiles";
import { isCountryPart, validateDraft, type EmpireDraft } from "@/map/build/empireDraft";
import { findPolityByName, type Polity } from "@/map/build/localData";

// One existing empire, opened in the generator for editing.

export type ResolvedPart =
  | { kind: "polity"; polity: Polity; rangeIndex: number }
  | { kind: "country"; country: string }
  | { kind: "missing"; label: string };

// GET /api/dev/empires/{slug}: the empire's file as a draft, plus its map
// parts resolved against the local Cliopatria index (so the form can show
// each polity's periods again).
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const blocked = notInProduction();
  if (blocked) return blocked;

  const draft = readEmpire((await params).slug);
  if (!draft) return jsonError("empire not found", 404);

  const parts: ResolvedPart[] = draft.map.parts.map((p) => {
    if (isCountryPart(p)) return { kind: "country", country: p.country };
    const polity = findPolityByName(p.polity);
    const rangeIndex = polity?.ranges.findIndex((r) => r.from <= p.year && p.year <= r.to) ?? -1;
    return polity && rangeIndex >= 0
      ? { kind: "polity", polity, rangeIndex }
      : { kind: "missing", label: `${p.polity} (${p.year})` };
  });
  return NextResponse.json({ draft, parts });
}

// PUT /api/dev/empires/{slug} { draft, shape }: overwrites that empire's files.
// The slug can't change here: the database matches content to rows by it.
export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const blocked = notInProduction();
  if (blocked) return blocked;

  const slug = (await params).slug;
  if (!empireExists(slug)) return jsonError("empire not found", 404);

  const body = (await request.json().catch(() => null)) as { draft?: EmpireDraft; shape?: MultiPolygon } | null;
  const draft = body?.draft;
  const shape = body?.shape;
  if (!draft || shape?.type !== "MultiPolygon" || shape.coordinates.length === 0) return jsonError("draft and a non-empty shape are required");
  if (draft.slug !== slug) return jsonError("the slug of an existing empire can't change");

  const errors = validateDraft(draft, listEmpires().filter((e) => e.slug !== slug));
  if (errors.length > 0) return NextResponse.json({ errors }, { status: 400 });

  return NextResponse.json({ saved: writeEmpire(draft, shape) });
}

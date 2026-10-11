"use client";

import type { MultiPolygon } from "geojson";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { EmpireMap } from "@/map/EmpireMap";
import type { DrawMode } from "@/map/FlatMap";
import { loadWorld, type MapStage } from "@/map/geo";
import { CONTINENTS, type Continent, type ContinentShare } from "@/map/build/continents";
import {
  AREA_PRECISIONS,
  CURIOSITY_COUNT,
  MAP_ACCURACIES,
  YEAR_PRECISIONS,
  toContentJson,
  isValidBox,
  validateDraft,
  type EmpireDraft,
  type Text,
} from "@/map/build/empireDraft";
import type { Polity, PolitySummary } from "@/map/build/localData";
import type { ResolvedPart } from "@/app/api/dev/empires/[slug]/route";

// The empire generator's screen. Everything it needs comes from the
// /api/geo/* endpoints, whose contract the public version's API will keep.

// A Cliopatria polity at one of its periods, or today's territory (for land
// the dataset misses, e.g. French Polynesia in a colonial empire).
type PolityPart = { kind: "polity"; polity: Polity; rangeIndex: number };
type Box = [number, number, number, number];
// An area traced by hand on the 2D map, added to the empire or cut out of it.
type DrawnPart = { kind: "draw"; mode: DrawMode; ring: [number, number][] };
type Part = PolityPart | { kind: "country"; country: string; box?: Box } | DrawnPart;
const firstPolity = (parts: Part[]) => parts.find((p): p is PolityPart => p.kind === "polity");
type ShapeResult = { shape: MultiPolygon; raw: MultiPolygon; areaKm2: number; datasetAreaKm2: number; continents: ContinentShare[] };

const CONTINENT_PT: Record<Continent, string> = {
  Africa: "África",
  Asia: "Ásia",
  Europe: "Europa",
  NorthAmerica: "América do Norte",
  SouthAmerica: "América do Sul",
  Oceania: "Oceania",
};

const emptyText = (): Text => ({ en: "", pt: "" });

const emptyDraft = (): EmpireDraft => ({
  slug: "",
  name: emptyText(),
  peak: { year: 1, precision: "Approximate" },
  start: { year: 1, precision: "Approximate" },
  end: { year: 1, precision: "Approximate" },
  durationNotes: emptyText(),
  area: { km2: 0, precision: "Approximate" },
  mapAccuracy: "Approximate",
  continents: [],
  primaryContinent: "Asia",
  capital: emptyText(),
  language: emptyText(),
  religion: emptyText(),
  religionNotes: emptyText(),
  curiosities: Array.from({ length: CURIOSITY_COUNT }, emptyText),
  wikipedia: emptyText(),
  map: { parts: [] },
});

// Fields the generator can fill from the data; each follows the parts until
// the user edits it.
type AutoField = "slug" | "nameEn" | "peak" | "start" | "end" | "area" | "continents" | "wikipedia";
const ALL_AUTO: AutoField[] = ["slug", "nameEn", "peak", "start", "end", "area", "continents", "wikipedia"];

const slugify = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const formatYear = (y: number) => (y < 0 ? `${-y} a.C.` : `${y}`);
const formatKm2 = (n: number) => `${(n / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} mi km²`;

const noSubscription = () => () => {};

export function Generator() {
  const hydrated = useSyncExternalStore(noSubscription, () => true, () => false);
  const [parts, setParts] = useState<Part[]>([]);
  const [result, setResult] = useState<ShapeResult | null>(null);
  const [shapeError, setShapeError] = useState<string | null>(null);
  const [draft, setDraft] = useState<EmpireDraft>(emptyDraft);
  const [touched, setTouched] = useState<Set<AutoField>>(new Set());
  const [existing, setExisting] = useState<{ slug: string; name: Text }[]>([]);
  const [stage, setStage] = useState<MapStage>(2);
  const [showRaw, setShowRaw] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Once saved, the draft is done: the form locks and only offers to start
  // the next empire (validating it again would flag it against its own file).
  const [saved, setSaved] = useState<string[] | null>(null);
  // Slug of the existing empire open for editing (null = a new one).
  const [editing, setEditing] = useState<string | null>(null);
  const [missingParts, setMissingParts] = useState<string[]>([]);
  const [countryNames, setCountryNames] = useState<Map<string, string>>(new Map());
  const [drawMode, setDrawMode] = useState<DrawMode | null>(null);
  // The shape before any drawing: the map stays framed on it while areas are
  // drawn, instead of jumping every time the empire changes a little.
  const [frame, setFrame] = useState<{ key: string; shape: MultiPolygon } | null>(null);

  useEffect(() => {
    fetch("/api/dev/empires").then((r) => r.json()).then(setExisting, () => {});
    loadWorld().then((w) => setCountryNames(new Map(w.countries.map((c) => [String(c.id), c.properties.pt]))), () => {});
  }, []);

  // Rebuilds the shape whenever the parts change.
  const partKey = (p: Part) =>
    p.kind === "polity" ? `${p.polity.id}@${p.polity.ranges[p.rangeIndex].from}` : p.kind === "country" ? `${p.country}${p.box ? `[${p.box}]` : ""}` : `${p.mode}(${p.ring.join(";")})`;
  const partsKey = parts.map(partKey).join(",");
  const frameKey = parts.filter((p) => p.kind !== "draw").map(partKey).join(",");
  useEffect(() => {
    if (parts.length === 0) return;
    let current = true;
    fetch("/api/geo/shape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parts: parts.map((p) =>
          p.kind === "polity"
            ? { id: p.polity.id, year: p.polity.ranges[p.rangeIndex].from }
            : p.kind === "country"
              ? // A box only counts once its four numbers make a valid region.
                { country: p.country, ...(p.box && isValidBox(p.box) ? { box: p.box } : {}) }
              : { draw: p.mode, ring: p.ring },
        ),
      }),
    })
      .then(async (r) => {
        const body = await r.json();
        if (!current) return;
        if (!r.ok) {
          setShapeError(body.error ?? `erro ${r.status}`);
          return;
        }
        setShapeError(null);
        setResult(body as ShapeResult);
        setFrame((f) => (f?.key === frameKey ? f : { key: frameKey, shape: (body as ShapeResult).shape }));
      })
      .catch((e) => current && setShapeError(String(e)));
    return () => {
      current = false;
    };
    // partsKey stands for parts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partsKey]);

  // Wikipedia links from the first polity's Wikidata id.
  const wikidata = firstPolity(parts)?.polity.wikidata ?? null;
  const [wikiLinks, setWikiLinks] = useState<{ id: string; links: Text } | null>(null);
  useEffect(() => {
    if (!wikidata) return;
    let current = true;
    fetch(`/api/geo/wikipedia?wikidata=${wikidata}`)
      .then((r) => r.json())
      .then((l: { en: string | null; pt: string | null }) => current && setWikiLinks({ id: wikidata, links: { en: l.en ?? "", pt: l.pt ?? "" } }), () => {});
    return () => {
      current = false;
    };
  }, [wikidata]);

  // What the data suggests for the automatic fields.
  const auto = useMemo(() => {
    const first = firstPolity(parts);
    if (!first) return null;
    const polities = parts.filter((p): p is PolityPart => p.kind === "polity");
    const range = first.polity.ranges[first.rangeIndex];
    const name = first.polity.name.replace(/^\((.*)\)$/, "$1");
    const continents = (result?.continents ?? []).filter((c) => c.share >= 0.01).map((c) => c.continent);
    return {
      nameEn: name,
      slug: slugify(name),
      peak: range.from,
      start: Math.min(...polities.map((p) => p.polity.from)),
      end: Math.max(...polities.map((p) => p.polity.to)),
      area: result?.areaKm2 ?? 0,
      continents,
      primary: continents[0],
      wikipedia: wikiLinks?.id === first.polity.wikidata ? wikiLinks.links : null,
    };
  }, [parts, result, wikiLinks]);

  // The draft as shown: automatic fields the user hasn't edited follow the data.
  const shown: EmpireDraft = useMemo(() => {
    if (!auto) return draft;
    const keep = (f: AutoField) => touched.has(f);
    return {
      ...draft,
      // An existing empire keeps its slug: the database matches it by slug.
      slug: keep("slug") || editing ? draft.slug : auto.slug,
      name: keep("nameEn") ? draft.name : { ...draft.name, en: auto.nameEn },
      peak: keep("peak") ? draft.peak : { ...draft.peak, year: auto.peak },
      start: keep("start") ? draft.start : { ...draft.start, year: auto.start },
      end: keep("end") ? draft.end : { ...(draft.end ?? emptyDraft().end!), year: auto.end },
      area: keep("area") ? draft.area : { ...draft.area, km2: auto.area },
      continents: keep("continents") ? draft.continents : auto.continents,
      primaryContinent: keep("continents") ? draft.primaryContinent : (auto.primary ?? draft.primaryContinent),
      wikipedia: keep("wikipedia") || !auto.wikipedia ? draft.wikipedia : auto.wikipedia,
      map: {
        parts: parts.map((p) => {
          if (p.kind === "country") return p.box ? { country: p.country, box: p.box } : { country: p.country };
          if (p.kind === "draw") return { draw: p.mode, ring: p.ring };
          const r = p.polity.ranges[p.rangeIndex];
          const peak = keep("peak") ? draft.peak.year : auto.peak;
          // The peak year when the record covers it, so the file reads naturally.
          return { polity: p.polity.name, year: r.from <= peak && peak <= r.to ? peak : r.from };
        }),
      },
    };
  }, [draft, auto, touched, parts, editing]);

  // Edits start from what's on screen, and pin the automatic fields they touch.
  const edit = (change: (d: EmpireDraft) => EmpireDraft, ...fields: AutoField[]) => {
    setDraft(change(shown));
    if (fields.length > 0) setTouched((t) => new Set([...t, ...fields]));
    setSaveError(null);
  };

  // When editing, the empire's own file isn't a clash.
  const errors = useMemo(() => validateDraft(shown, existing.filter((e) => e.slug !== editing)), [shown, existing, editing]);

  const save = async () => {
    if (!result) return;
    const res = await fetch(editing ? `/api/dev/empires/${editing}` : "/api/dev/empires", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft: shown, shape: result.shape }),
    });
    const body = await res.json();
    if (res.ok) {
      setSaved(body.saved);
      setExisting((e) => [...e.filter((x) => x.slug !== shown.slug), { slug: shown.slug, name: shown.name }]);
    } else {
      setSaveError(body.errors?.join("; ") ?? body.error ?? `erro ${res.status}`);
    }
  };

  const startOver = () => {
    setParts([]);
    setResult(null);
    setShapeError(null);
    setDraft(emptyDraft());
    setTouched(new Set());
    setShowRaw(false);
    setSaveError(null);
    setSaved(null);
    setEditing(null);
    setMissingParts([]);
    setDrawMode(null);
    setFrame(null);
  };

  // Opens an existing empire with every field as saved; its automatic fields
  // stay as they are until "recalculate" is pressed.
  const openExisting = async (slug: string) => {
    const res = await fetch(`/api/dev/empires/${slug}`);
    if (!res.ok) return;
    const body = (await res.json()) as { draft: EmpireDraft; parts: ResolvedPart[] };
    startOver();
    setEditing(slug);
    setDraft(body.draft);
    setTouched(new Set(ALL_AUTO));
    setParts(
      body.parts.flatMap((p): Part[] =>
        p.kind === "polity"
          ? [{ kind: "polity", polity: p.polity, rangeIndex: p.rangeIndex }]
          : p.kind === "country"
            ? [{ kind: "country", country: p.country, box: p.box }]
            : p.kind === "draw"
              ? [{ kind: "draw", mode: p.mode, ring: p.ring }]
              : [],
      ),
    );
    setMissingParts(body.parts.flatMap((p) => (p.kind === "missing" ? [p.label] : [])));
  };

  const drawnRings = useMemo(() => parts.flatMap((p) => (p.kind === "draw" ? [{ mode: p.mode, ring: p.ring }] : [])), [parts]);

  // After adding or removing parts: area and continents from the new shape.
  const recalculate = () => setTouched((t) => new Set([...t].filter((f) => f !== "area" && f !== "continents")));

  return (
    <main className="mx-auto grid max-w-7xl gap-6 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="flex flex-col gap-2 lg:sticky lg:top-4 lg:self-start">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-semibold">Gerador de impérios</h1>
          <select
            value={editing ?? ""}
            onChange={(e) => (e.target.value ? openExisting(e.target.value) : startOver())}
            className="ml-auto rounded-md border border-line bg-surface px-2 py-1 text-sm"
          >
            <option value="">Novo império</option>
            {existing.map((e) => (
              <option key={e.slug} value={e.slug}>
                Editar: {e.name.pt}
              </option>
            ))}
          </select>
        </div>
        {editing && (
          <p className="rounded-md border border-line bg-surface px-2 py-1 text-xs">
            Editando <strong>{editing}</strong> (salvar sobrescreve). Mexeu nas partes? &quot;Recalcular área e continentes&quot;.
          </p>
        )}
        {missingParts.length > 0 && (
          <p className="text-xs text-danger">Não achei no índice do Cliopatria (essas partes ficaram de fora): {missingParts.join(", ")}</p>
        )}
        {parts.length === 0 && (
          <p className="text-xs text-muted">
            Busque a entidade no Cliopatria, escolha o período e junte outras partes se precisar. Campos com ⚙ se preenchem
            sozinhos até você editar.
          </p>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          <PolitySearch onPick={(polity) => setParts((ps) => [...ps, { kind: "polity", polity, rangeIndex: peakRangeIndex(polity) }])} />
          <CountrySearch names={countryNames} onPick={(country) => setParts((ps) => (ps.some((p) => p.kind === "country" && p.country === country) ? ps : [...ps, { kind: "country", country }]))} />
        </div>

        {parts.length > 0 && (
          <ul className="flex flex-col gap-1">
            {parts.map((p, i) => (
              <li key={`${p.kind === "polity" ? p.polity.id : p.kind === "country" ? p.country : p.mode}-${i}`} className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1 text-sm">
                {p.kind === "draw" ? (
                  <span>
                    <span className="font-semibold" style={{ color: p.mode === "add" ? "rgb(22 140 60)" : "rgb(200 30 30)" }}>
                      {p.mode === "add" ? "Área adicionada à mão" : "Área removida à mão"}
                    </span>{" "}
                    <span className="text-muted">({p.ring.length} pontos, tracejada)</span>
                  </span>
                ) : p.kind === "country" ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <span>
                      <span className="font-semibold">{countryNames.get(p.country) ?? p.country}</span>{" "}
                      <span className="text-muted">(território atual, {p.country})</span>
                    </span>
                    <BoxInput
                      value={p.box}
                      onChange={(box) => setParts((ps) => ps.map((q, j) => (j === i && q.kind === "country" ? { ...q, box } : q)))}
                    />
                  </span>
                ) : (
                  <>
                    <span className="font-semibold">{p.polity.name}</span>
                    <select
                      value={p.rangeIndex}
                      onChange={(e) => setParts((ps) => ps.map((q, j) => (j === i && q.kind === "polity" ? { ...q, rangeIndex: Number(e.target.value) } : q)))}
                      className="rounded border border-line bg-background px-1 py-0.5"
                    >
                      {p.polity.ranges.map((r, j) => (
                        <option key={j} value={j}>
                          {formatYear(r.from)}–{formatYear(r.to)} · {formatKm2(r.areaKm2)}
                          {r.areaKm2 === p.polity.peakAreaKm2 ? " ★ maior área" : ""}
                        </option>
                      ))}
                    </select>
                  </>
                )}
                <button type="button" onClick={() => setParts((ps) => ps.filter((_, j) => j !== i))} className="ml-auto text-muted hover:text-foreground">
                  remover
                </button>
              </li>
            ))}
          </ul>
        )}

        {shapeError && <p className="text-xs text-danger">{shapeError}</p>}

        {hydrated && result && parts.length > 0 && (
          <>
            <DrawTools
              mode={drawMode}
              onMode={setDrawMode}
              canUndo={parts.some((p) => p.kind === "draw")}
              onUndo={() => setParts((ps) => ps.filter((_, j) => j !== ps.findLastIndex((p) => p.kind === "draw")))}
            />
            <EmpireMap
              empire={showRaw ? result.raw : result.shape}
              frameShape={frame?.shape}
              draw={drawMode ? { mode: drawMode, onDone: (ring) => setParts((ps) => [...ps, { kind: "draw", mode: drawMode, ring }]) } : null}
              overlays={drawnRings}
              stage={stage}
              locale="pt"
              labels={{
                zoomIn: "Aproximar",
                zoomOut: "Afastar",
                focus: "Voltar pro império",
                fullscreen: "Tela cheia",
                exitFullscreen: "Sair da tela cheia",
                loading: "Carregando mapa…",
                globe: "Ver como globo",
                flat: "Ver como mapa plano",
              }}
            />
            <div className="flex flex-wrap items-center gap-x-3 text-sm">
              {([1, 2, 3] as MapStage[]).map((s) => (
                <button key={s} type="button" onClick={() => setStage(s)} className={s === stage ? "font-semibold underline underline-offset-4" : "text-muted"}>
                  {["Contorno", "Continentes", "Países"][s - 1]}
                </button>
              ))}
              <label className="ml-auto flex items-center gap-1 text-muted">
                <input type="checkbox" checked={showRaw} onChange={(e) => setShowRaw(e.target.checked)} />
                ver sem recorte pelo litoral
              </label>
            </div>
            <p className="text-xs text-muted">
              Área no mapa: {formatKm2(result.areaKm2)} (no Cliopatria: {formatKm2(result.datasetAreaKm2)}) ·{" "}
              {result.continents.map((c) => `${CONTINENT_PT[c.continent]} ${Math.round(c.share * 100)}%`).join(", ")}
            </p>
          </>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <fieldset disabled={!!saved} className="disabled:opacity-60">
          {editing && (
            <button type="button" onClick={recalculate} className="mb-3 rounded-full border border-line px-4 py-1 text-sm hover:bg-surface">
              Recalcular área e continentes
            </button>
          )}
          <EmpireForm draft={shown} touched={touched} hasAuto={!!auto} edit={edit} continentShares={result?.continents ?? []} slugLocked={!!editing} />
        </fieldset>

        {saved ? (
          <div className="flex flex-col gap-2 rounded-lg border border-success bg-surface p-3 text-sm">
            <p className="font-semibold text-success">✓ Império {editing ? "atualizado" : "salvo"}.</p>
            <ul className="list-disc pl-5 text-muted">
              {saved.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <p className="text-muted">Reinicie a API pra ele entrar no jogo e confira o mapa em /dev/maps. Depois é só commitar.</p>
            <button type="button" onClick={startOver} className="self-start rounded-full bg-accent px-5 py-2 font-semibold text-accent-foreground">
              Começar outro império
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3 text-sm">
            {errors.length > 0 ? (
              <>
                <p className="font-semibold">Falta resolver ({errors.length}):</p>
                <ul className="list-disc pl-5 text-muted">
                  {errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="font-semibold">Tudo certo pra salvar.</p>
          )}
          <button
            type="button"
            onClick={save}
            disabled={errors.length > 0 || !result}
            className="self-start rounded-full bg-accent px-5 py-2 font-semibold text-accent-foreground disabled:opacity-40"
          >
            {editing ? "Salvar alterações" : "Salvar império"}
          </button>
          {saveError && <p className="text-danger">{saveError}</p>}
        </div>
        )}

        <details className="text-xs">
          <summary className="cursor-pointer text-muted">Ver o JSON que vai ser salvo</summary>
          <pre className="mt-2 max-h-96 overflow-auto rounded-lg bg-surface p-3">{toContentJson(shown)}</pre>
        </details>
      </section>
    </main>
  );
}

function peakRangeIndex(p: Polity) {
  return Math.max(0, p.ranges.findIndex((r) => r.areaKm2 === p.peakAreaKm2));
}

function PolitySearch({ onPick }: { onPick: (p: Polity) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ query: string; list: PolitySummary[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const timer = window.setTimeout(async () => {
      const res = await fetch(`/api/geo/polities?q=${encodeURIComponent(query)}`);
      const body = await res.json();
      if (!res.ok) setError(body.error ?? `erro ${res.status}`);
      else {
        setError(null);
        setResults({ query, list: body });
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const pick = async (id: string) => {
    const res = await fetch(`/api/geo/polities/${id}`);
    if (res.ok) {
      onPick((await res.json()) as Polity);
      setQuery("");
      setResults(null);
    }
  };

  const list = results && results.query === query && query.trim().length >= 2 ? results.list : [];

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Entidade do Cliopatria (inglês: mongol, ottoman)"
        className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-sm"
      />
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
      {list.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-lg border border-line bg-background text-sm shadow-lg">
          {list.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => pick(p.id)} className="flex w-full justify-between gap-3 px-3 py-1.5 text-left hover:bg-surface">
                <span>{p.name}</span>
                <span className="shrink-0 text-muted">
                  {formatYear(p.from)}–{formatYear(p.to)} · máx. {formatKm2(p.peakAreaKm2)} em {formatYear(p.peakYear)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Tracing areas on the 2D map: hold the button and outline the area; on
// release it closes, smooths and is added to the empire or cut out of it.
// The coast clips additions, so they can run over the sea.
function DrawTools({ mode, onMode, canUndo, onUndo }: { mode: DrawMode | null; onMode: (m: DrawMode | null) => void; canUndo: boolean; onUndo: () => void }) {
  const options: { value: DrawMode | null; label: string }[] = [
    { value: null, label: "Navegar" },
    { value: "add", label: "✏ Adicionar área" },
    { value: "remove", label: "✏ Remover área" },
  ];
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {options.map((o) => (
          <button
            key={o.label}
            type="button"
            onClick={() => onMode(o.value)}
            className={`rounded-full border px-3 py-0.5 ${mode === o.value ? "border-foreground bg-foreground text-background" : "border-line hover:bg-surface"}`}
          >
            {o.label}
          </button>
        ))}
        <button type="button" onClick={onUndo} disabled={!canUndo} className="ml-auto text-muted underline disabled:no-underline disabled:opacity-40">
          desfazer último desenho
        </button>
      </div>
      {mode && (
        <p className="text-xs text-muted">
          Segure e contorne; ao soltar, fecha sozinho. Roda = zoom; arrastar só em Navegar.{" "}
          {mode === "add" ? "Pode passar pelo mar: o litoral recorta." : "Tudo dentro do contorno sai."}
        </p>
      )}
    </div>
  );
}

// Optional region of a territory: only the land inside [west, south, east,
// north], in degrees (negative = west / south). Empty = the whole territory.
function BoxInput({ value, onChange }: { value?: Box; onChange: (b?: Box) => void }) {
  const [open, setOpen] = useState(!!value);
  const labels = ["oeste", "sul", "leste", "norte"];
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-muted underline">
        recortar uma região
      </button>
    );
  }
  const box = value ?? ([0, 0, 0, 0] as Box);
  return (
    <span className="flex flex-wrap items-center gap-1 text-xs text-muted">
      recorte (graus):
      {labels.map((label, k) => (
        <input
          key={label}
          type="number"
          step="0.5"
          title={label}
          placeholder={label}
          value={value ? box[k] : ""}
          onChange={(e) => {
            const next = [...box] as Box;
            next[k] = Number(e.target.value);
            onChange(next);
          }}
          className="w-16 rounded border border-line bg-background px-1 py-0.5"
        />
      ))}
      {value && !isValidBox(value) && <span className="text-danger">oeste &lt; leste, sul &lt; norte</span>}
      <button
        type="button"
        onClick={() => {
          onChange(undefined);
          setOpen(false);
        }}
        className="underline"
      >
        território inteiro
      </button>
    </span>
  );
}

// Today's territories (the game's world map), for land Cliopatria misses.
function CountrySearch({ names, onPick }: { names: Map<string, string>; onPick: (code: string) => void }) {
  const [query, setQuery] = useState("");
  const normalize = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const q = normalize(query.trim());
  const list = q.length < 2 ? [] : [...names].filter(([code, name]) => normalize(name).includes(q) || code.toLowerCase() === q).slice(0, 15);

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Território atual (ex.: Polinésia Francesa)"
        className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-sm"
      />
      {list.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-lg border border-line bg-background text-sm shadow-lg">
          {list.map(([code, name]) => (
            <li key={code}>
              <button
                type="button"
                onClick={() => {
                  onPick(code);
                  setQuery("");
                }}
                className="flex w-full justify-between gap-3 px-3 py-1.5 text-left hover:bg-surface"
              >
                <span>{name}</span>
                <span className="text-muted">{code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type EditFn = (change: (d: EmpireDraft) => EmpireDraft, ...fields: AutoField[]) => void;

function EmpireForm({
  draft,
  touched,
  hasAuto,
  edit,
  continentShares,
  slugLocked,
}: {
  draft: EmpireDraft;
  touched: Set<AutoField>;
  hasAuto: boolean;
  edit: EditFn;
  continentShares: ContinentShare[];
  slugLocked: boolean;
}) {
  const autoMark = (f: AutoField) => (hasAuto && !touched.has(f) ? " ⚙" : "");
  const share = (c: Continent) => continentShares.find((s) => s.continent === c);

  return (
    <div className="flex flex-col gap-3 text-sm">
      <Field label={slugLocked ? "Slug (nome do arquivo, não muda num império existente)" : `Slug (nome do arquivo)${autoMark("slug")}`}>
        <input value={draft.slug} disabled={slugLocked} onChange={(e) => edit((d) => ({ ...d, slug: e.target.value }), "slug")} className={inputClass} />
      </Field>

      <TextField label={`Nome${autoMark("nameEn")}`} value={draft.name} onChange={(name, lang) => edit((d) => ({ ...d, name }), ...(lang === "en" ? (["nameEn"] as const) : []))} />

      <div className="grid grid-cols-3 gap-2">
        <YearField label={`Auge (mapa)${autoMark("peak")}`} value={draft.peak} onChange={(peak) => edit((d) => ({ ...d, peak }), "peak")} />
        <YearField label={`Início${autoMark("start")}`} value={draft.start} onChange={(start) => edit((d) => ({ ...d, start }), "start")} />
        <EndField label={`Fim${autoMark("end")}`} value={draft.end} onChange={(end) => edit((d) => ({ ...d, end }), "end")} />
      </div>
      <TextField label="Nota da duração (opcional)" value={draft.durationNotes ?? emptyText()} onChange={(durationNotes) => edit((d) => ({ ...d, durationNotes }))} multiline />

      <div className="grid grid-cols-3 gap-2">
        <Field label={`Área no auge (km²)${autoMark("area")}`}>
          <input
            type="number"
            value={draft.area.km2}
            onChange={(e) => edit((d) => ({ ...d, area: { ...d.area, km2: Number(e.target.value) } }), "area")}
            className={inputClass}
          />
        </Field>
        <Field label="Precisão da área">
          <Select value={draft.area.precision} options={AREA_PRECISIONS} onChange={(precision) => edit((d) => ({ ...d, area: { ...d.area, precision } }))} />
        </Field>
        <Field label="Precisão do mapa">
          <Select value={draft.mapAccuracy} options={MAP_ACCURACIES} onChange={(mapAccuracy) => edit((d) => ({ ...d, mapAccuracy }))} />
        </Field>
      </div>

      <Field label={`Continentes (o marcado com ● é o principal)${autoMark("continents")}`}>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {CONTINENTS.map((c) => (
            <span key={c} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={draft.continents.includes(c)}
                onChange={(e) =>
                  edit(
                    (d) => ({ ...d, continents: e.target.checked ? [...d.continents, c] : d.continents.filter((x) => x !== c) }),
                    "continents",
                  )
                }
              />
              <input
                type="radio"
                name="primary"
                title="principal"
                checked={draft.primaryContinent === c}
                onChange={() => edit((d) => ({ ...d, primaryContinent: c }), "continents")}
              />
              {CONTINENT_PT[c]}
              {share(c) && <span className="text-muted">({Math.round(share(c)!.share * 100)}%)</span>}
            </span>
          ))}
        </div>
      </Field>

      <TextField label="Capital" value={draft.capital} onChange={(capital) => edit((d) => ({ ...d, capital }))} />
      <TextField label="Língua" value={draft.language} onChange={(language) => edit((d) => ({ ...d, language }))} />
      <TextField label="Religião" value={draft.religion} onChange={(religion) => edit((d) => ({ ...d, religion }))} />
      <TextField label="Nota da religião (opcional)" value={draft.religionNotes ?? emptyText()} onChange={(religionNotes) => edit((d) => ({ ...d, religionNotes }))} multiline />

      {draft.curiosities.map((c, i) => (
        <TextField
          key={i}
          label={`Dica ${i + 1} (${["menos óbvia", "média", "mais óbvia"][i]})`}
          value={c}
          onChange={(text) => edit((d) => ({ ...d, curiosities: d.curiosities.map((x, j) => (j === i ? text : x)) }))}
          multiline
        />
      ))}

      <TextField label={`Wikipedia (links)${autoMark("wikipedia")}`} value={draft.wikipedia ?? emptyText()} onChange={(wikipedia) => edit((d) => ({ ...d, wikipedia }), "wikipedia")} />
    </div>
  );
}

const inputClass = "w-full rounded-md border border-line bg-surface px-2 py-1";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-muted">{label}</span>
      {children}
    </label>
  );
}

function TextField({ label, value, onChange, multiline }: { label: string; value: Text; onChange: (t: Text, lang: "en" | "pt") => void; multiline?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <div className="grid grid-cols-2 gap-2">
        {(["en", "pt"] as const).map((lang) =>
          multiline ? (
            <textarea key={lang} rows={2} placeholder={lang} value={value[lang]} onChange={(e) => onChange({ ...value, [lang]: e.target.value }, lang)} className={inputClass} />
          ) : (
            <input key={lang} placeholder={lang} value={value[lang]} onChange={(e) => onChange({ ...value, [lang]: e.target.value }, lang)} className={inputClass} />
          ),
        )}
      </div>
    </div>
  );
}

function YearField({ label, value, onChange }: { label: string; value: EmpireDraft["peak"]; onChange: (y: EmpireDraft["peak"]) => void }) {
  return (
    <Field label={label}>
      <div className="flex gap-1">
        <input type="number" value={value.year} onChange={(e) => onChange({ ...value, year: Number(e.target.value) })} className={inputClass} title="negativo = a.C." />
        <Select value={value.precision} options={YEAR_PRECISIONS} onChange={(precision) => onChange({ ...value, precision })} />
      </div>
    </Field>
  );
}

// "Ainda existe" saves "end": null: the game counts the duration up to the
// current year and shows the period as "1776 – hoje".
function EndField({ label, value, onChange }: { label: string; value: EmpireDraft["end"]; onChange: (y: EmpireDraft["end"]) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-muted">{label}</span>
      {value && (
        <div className="flex gap-1">
          <input type="number" value={value.year} onChange={(e) => onChange({ ...value, year: Number(e.target.value) })} className={inputClass} title="negativo = a.C." />
          <Select value={value.precision} options={YEAR_PRECISIONS} onChange={(precision) => onChange({ ...value, precision })} />
        </div>
      )}
      <label className="flex items-center gap-1 text-xs text-muted">
        <input type="checkbox" checked={!value} onChange={(e) => onChange(e.target.checked ? null : { year: new Date().getFullYear(), precision: "Exact" })} />
        ainda existe
      </label>
    </div>
  );
}

function Select<T extends string>({ value, options, onChange }: { value: T; options: readonly T[]; onChange: (v: T) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)} className="rounded-md border border-line bg-surface px-1 py-1">
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

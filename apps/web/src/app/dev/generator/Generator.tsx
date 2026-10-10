"use client";

import type { MultiPolygon } from "geojson";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { EmpireMap } from "@/map/EmpireMap";
import type { MapStage } from "@/map/geo";
import { CONTINENTS, type Continent, type ContinentShare } from "@/map/build/continents";
import {
  AREA_PRECISIONS,
  CURIOSITY_COUNT,
  MAP_ACCURACIES,
  YEAR_PRECISIONS,
  toContentJson,
  validateDraft,
  type EmpireDraft,
  type Text,
} from "@/map/build/empireDraft";
import type { Polity, PolitySummary } from "@/map/build/localData";

// The empire generator's screen. Everything it needs comes from the
// /api/geo/* endpoints, whose contract the public version's API will keep.

type Part = { polity: Polity; rangeIndex: number };
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
  const [saveState, setSaveState] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    fetch("/api/dev/empires").then((r) => r.json()).then(setExisting, () => {});
  }, []);

  // Rebuilds the shape whenever the parts change.
  const partsKey = parts.map((p) => `${p.polity.id}@${p.polity.ranges[p.rangeIndex].from}`).join(",");
  useEffect(() => {
    if (parts.length === 0) return;
    let current = true;
    fetch("/api/geo/shape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parts: parts.map((p) => ({ id: p.polity.id, year: p.polity.ranges[p.rangeIndex].from })) }),
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
      })
      .catch((e) => current && setShapeError(String(e)));
    return () => {
      current = false;
    };
    // partsKey stands for parts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partsKey]);

  // Wikipedia links from the first part's Wikidata id.
  const wikidata = parts[0]?.polity.wikidata ?? null;
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
    if (parts.length === 0) return null;
    const first = parts[0];
    const range = first.polity.ranges[first.rangeIndex];
    const name = first.polity.name.replace(/^\((.*)\)$/, "$1");
    const continents = (result?.continents ?? []).filter((c) => c.share >= 0.01).map((c) => c.continent);
    return {
      nameEn: name,
      slug: slugify(name),
      peak: range.from,
      start: Math.min(...parts.map((p) => p.polity.from)),
      end: Math.max(...parts.map((p) => p.polity.to)),
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
      slug: keep("slug") ? draft.slug : auto.slug,
      name: keep("nameEn") ? draft.name : { ...draft.name, en: auto.nameEn },
      peak: keep("peak") ? draft.peak : { ...draft.peak, year: auto.peak },
      start: keep("start") ? draft.start : { ...draft.start, year: auto.start },
      end: keep("end") ? draft.end : { ...draft.end, year: auto.end },
      area: keep("area") ? draft.area : { ...draft.area, km2: auto.area },
      continents: keep("continents") ? draft.continents : auto.continents,
      primaryContinent: keep("continents") ? draft.primaryContinent : (auto.primary ?? draft.primaryContinent),
      wikipedia: keep("wikipedia") || !auto.wikipedia ? draft.wikipedia : auto.wikipedia,
      map: {
        parts: parts.map((p) => {
          const r = p.polity.ranges[p.rangeIndex];
          const peak = keep("peak") ? draft.peak.year : auto.peak;
          // The peak year when the record covers it, so the file reads naturally.
          return { polity: p.polity.name, year: r.from <= peak && peak <= r.to ? peak : r.from };
        }),
      },
    };
  }, [draft, auto, touched, parts]);

  // Edits start from what's on screen, and pin the automatic fields they touch.
  const edit = (change: (d: EmpireDraft) => EmpireDraft, ...fields: AutoField[]) => {
    setDraft(change(shown));
    if (fields.length > 0) setTouched((t) => new Set([...t, ...fields]));
    setSaveState(null);
  };

  const errors = useMemo(() => validateDraft(shown, existing), [shown, existing]);

  const save = async () => {
    if (!result) return;
    const res = await fetch("/api/dev/empires", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft: shown, shape: result.shape }),
    });
    const body = await res.json();
    if (res.ok) {
      setSaveState({ ok: true, message: `Salvo: ${body.saved.join(" e ")}. Reinicie a API pra importar e confira em /dev/maps.` });
      setExisting((e) => [...e, { slug: shown.slug, name: shown.name }]);
    } else {
      setSaveState({ ok: false, message: body.errors?.join("; ") ?? body.error ?? `erro ${res.status}` });
    }
  };

  return (
    <main className="mx-auto grid max-w-7xl gap-6 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="flex flex-col gap-3 lg:sticky lg:top-4 lg:self-start">
        <h1 className="text-xl font-semibold">Gerador de impérios</h1>
        <p className="text-sm text-muted">
          Busque a entidade no Cliopatria, escolha o período e junte outras partes se precisar. Os campos marcados com ⚙ se
          preenchem sozinhos até você editar.
        </p>

        <PolitySearch onPick={(polity) => setParts((ps) => [...ps, { polity, rangeIndex: peakRangeIndex(polity) }])} />

        {parts.length > 0 && (
          <ul className="flex flex-col gap-2">
            {parts.map((p, i) => (
              <li key={`${p.polity.id}-${i}`} className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm">
                <span className="font-semibold">{p.polity.name}</span>
                <select
                  value={p.rangeIndex}
                  onChange={(e) => setParts((ps) => ps.map((q, j) => (j === i ? { ...q, rangeIndex: Number(e.target.value) } : q)))}
                  className="rounded border border-line bg-background px-1 py-0.5"
                >
                  {p.polity.ranges.map((r, j) => (
                    <option key={j} value={j}>
                      {formatYear(r.from)}–{formatYear(r.to)} · {formatKm2(r.areaKm2)}
                      {r.areaKm2 === p.polity.peakAreaKm2 ? " ★ maior área" : ""}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => setParts((ps) => ps.filter((_, j) => j !== i))} className="ml-auto text-muted hover:text-foreground">
                  remover
                </button>
              </li>
            ))}
          </ul>
        )}

        {shapeError && <p className="text-sm text-danger">{shapeError}</p>}

        {hydrated && result && parts.length > 0 && (
          <>
            <EmpireMap
              empire={showRaw ? result.raw : result.shape}
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
            <div className="flex flex-wrap items-center gap-3 text-sm">
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
        <EmpireForm draft={shown} touched={touched} hasAuto={!!auto} edit={edit} continentShares={result?.continents ?? []} />

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
            Salvar império
          </button>
          {saveState && <p className={saveState.ok ? "text-success" : "text-danger"}>{saveState.message}</p>}
        </div>

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
        placeholder="Adicionar entidade do Cliopatria (em inglês, ex.: mongol, ottoman)"
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
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

type EditFn = (change: (d: EmpireDraft) => EmpireDraft, ...fields: AutoField[]) => void;

function EmpireForm({
  draft,
  touched,
  hasAuto,
  edit,
  continentShares,
}: {
  draft: EmpireDraft;
  touched: Set<AutoField>;
  hasAuto: boolean;
  edit: EditFn;
  continentShares: ContinentShare[];
}) {
  const autoMark = (f: AutoField) => (hasAuto && !touched.has(f) ? " ⚙" : "");
  const share = (c: Continent) => continentShares.find((s) => s.continent === c);

  return (
    <div className="flex flex-col gap-3 text-sm">
      <Field label={`Slug (nome do arquivo)${autoMark("slug")}`}>
        <input value={draft.slug} onChange={(e) => edit((d) => ({ ...d, slug: e.target.value }), "slug")} className={inputClass} />
      </Field>

      <TextField label={`Nome${autoMark("nameEn")}`} value={draft.name} onChange={(name, lang) => edit((d) => ({ ...d, name }), ...(lang === "en" ? (["nameEn"] as const) : []))} />

      <div className="grid grid-cols-3 gap-2">
        <YearField label={`Auge (mapa)${autoMark("peak")}`} value={draft.peak} onChange={(peak) => edit((d) => ({ ...d, peak }), "peak")} />
        <YearField label={`Início${autoMark("start")}`} value={draft.start} onChange={(start) => edit((d) => ({ ...d, start }), "start")} />
        <YearField label={`Fim${autoMark("end")}`} value={draft.end} onChange={(end) => edit((d) => ({ ...d, end }), "end")} />
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

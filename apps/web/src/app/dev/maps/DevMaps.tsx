"use client";

import type { MultiPolygon } from "geojson";
import { useState, useSyncExternalStore } from "react";
import { EmpireMap } from "@/map/EmpireMap";
import type { MapLocale, MapStage } from "@/map/geo";

const STAGES: { value: MapStage; label: string }[] = [
  { value: 1, label: "1. Só contorno" },
  { value: 2, label: "2. + continentes" },
  { value: 3, label: "3. + países" },
];

const noSubscription = () => () => {};

export function DevMaps({ empires }: { empires: { id: string; label: string; shape: MultiPolygon }[] }) {
  // The map reads the saved 2D/3D choice from the browser, so it only renders
  // after hydration.
  const hydrated = useSyncExternalStore(noSubscription, () => true, () => false);
  const [empireId, setEmpireId] = useState(empires[0]?.id);
  const [stage, setStage] = useState<MapStage>(1);
  const [locale, setLocale] = useState<MapLocale>("pt");
  const empire = empires.find((e) => e.id === empireId);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Revisão dos mapas</h1>

      <div className="flex flex-wrap gap-2 text-sm">
        <select value={empireId} onChange={(e) => setEmpireId(e.target.value)} className="rounded-md border border-line bg-surface px-2 py-1">
          {empires.map((e) => (
            <option key={e.id} value={e.id}>{e.label}</option>
          ))}
        </select>
        <Toggle options={[{ value: "pt", label: "PT" }, { value: "en", label: "EN" }]} value={locale} onChange={setLocale} />
      </div>
      <Toggle options={STAGES} value={stage} onChange={setStage} />

      {hydrated && empire && (
        <EmpireMap
          empire={empire.shape}
          stage={stage}
          locale={locale}
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
      )}

      <p className="text-sm text-muted">
        Etapa 1 travada no império. Etapas 2 e 3: arraste e use a roda do mouse ou pinça; a mira volta pro império, o
        globo alterna 2D/3D. Etapa 3: clique num país pra ver o nome. Formas em apps/api/Content/shapes.
      </p>
    </main>
  );
}

function Toggle<T extends string | number>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex overflow-hidden rounded-md border border-line text-sm">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={"px-3 py-1 " + (o.value === value ? "bg-accent text-accent-foreground" : "bg-surface hover:bg-background")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

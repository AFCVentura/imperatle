"use client";

import { useState } from "react";

// Each look is a set of CSS variables applied by lib/previewBoot.ts inside the
// frame, so what shows here is exactly what the classes and tokens would ship.
type Look = {
  name: string;
  box: string; // card and box outline, px
  pill: string; // buttons, chips, input, px
  div: string; // dividers inside cards, px
  fw: "main" | "500" | "600" | "700";
  muted: "old" | "new";
  line: "0" | "1" | "2" | "3";
  blank: "old" | "new";
};

const PRESETS: Look[] = [
  { name: "A. Main (no ar hoje)", box: "1", pill: "1", div: "1", fw: "main", muted: "old", line: "0", blank: "old" },
  { name: "B. Branch de ontem (2px + 700)", box: "2", pill: "2", div: "2", fw: "700", muted: "new", line: "1", blank: "new" },
  { name: "C. Recomendada (1px escuro + 500)", box: "1", pill: "1", div: "1", fw: "500", muted: "new", line: "3", blank: "new" },
  { name: "D. C + 1,5px na borda de fora", box: "1.5", pill: "1.5", div: "1", fw: "500", muted: "new", line: "3", blank: "new" },
  { name: "E. C + 1,5px só nos cartões", box: "1.5", pill: "1", div: "1", fw: "500", muted: "new", line: "3", blank: "new" },
  { name: "F. Cartão sem borda (ideia 2)", box: "0", pill: "1", div: "1", fw: "500", muted: "new", line: "2", blank: "new" },
  { name: "G. C com a fonte da main", box: "1", pill: "1", div: "1", fw: "main", muted: "new", line: "3", blank: "new" },
];

const OPTIONS: { key: keyof Omit<Look, "name">; label: string; values: [string, string][] }[] = [
  { key: "box", label: "Cartões", values: [["0", "0"], ["1", "1px"], ["1.5", "1,5px"], ["2", "2px"]] },
  { key: "pill", label: "Pills/input", values: [["1", "1px"], ["1.5", "1,5px"], ["2", "2px"]] },
  { key: "div", label: "Divisórias", values: [["0", "0"], ["1", "1px"], ["1.5", "1,5px"], ["2", "2px"]] },
  { key: "fw", label: "Fonte", values: [["main", "400 (main)"], ["500", "500"], ["600", "600"], ["700", "700 tudo"]] },
  { key: "line", label: "Cor da linha", values: [["0", "main"], ["1", "+ escura"], ["2", "++"], ["3", "+++"]] },
  { key: "muted", label: "Texto secund.", values: [["old", "main"], ["new", "novo"]] },
  { key: "blank", label: "Fundo Contorno", values: [["old", "branco"], ["new", "bege"]] },
];

const PAGES = ["/pt", "/pt/practice", "/pt/archive", "/pt/empires", "/pt/about"];

function query(look: Look, theme: string) {
  const { box, pill, div, fw, muted, line, blank } = look;
  return `box:${box},pill:${pill},div:${div},fw:${fw},muted:${muted},line:${line},blank:${blank},theme:${theme}`;
}

export default function VisualCompare() {
  const [looks, setLooks] = useState<Look[]>(PRESETS);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [page, setPage] = useState("/pt");
  const [width, setWidth] = useState(390);
  const [height, setHeight] = useState(780);
  const [scale, setScale] = useState(0.8);
  const [reload, setReload] = useState(0);
  const [open, setOpen] = useState<number | null>(null);

  const update = (i: number, patch: Partial<Look>) =>
    setLooks((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const btn = (active: boolean) =>
    `rounded-full border px-3 py-1 text-sm ${active ? "border-foreground bg-foreground text-background" : "border-line"}`;

  return (
    <div className="min-h-screen p-4 font-sans">
      <div className="sticky top-0 z-10 -mx-4 mb-4 flex flex-wrap items-center gap-2 border-b border-line bg-background/95 px-4 py-3">
        <strong className="mr-2 font-display">Comparar visual</strong>
        <button className={btn(theme === "light")} onClick={() => setTheme("light")}>Claro</button>
        <button className={btn(theme === "dark")} onClick={() => setTheme("dark")}>Escuro</button>
        <span className="mx-2 text-muted">|</span>
        {PAGES.map((p) => (
          <button key={p} className={btn(page === p)} onClick={() => setPage(p)}>{p}</button>
        ))}
        <input
          className="w-40 rounded-full border border-line bg-surface px-3 py-1 text-sm"
          value={page}
          onChange={(e) => setPage(e.target.value)}
          title="Qualquer caminho do site"
        />
        <span className="mx-2 text-muted">|</span>
        {[360, 390, 430].map((w) => (
          <button key={w} className={btn(width === w)} onClick={() => setWidth(w)}>{w}px</button>
        ))}
        {[640, 780, 900].map((h) => (
          <button key={h} className={btn(height === h)} onClick={() => setHeight(h)}>alt {h}</button>
        ))}
        <label className="flex items-center gap-1 text-sm">
          zoom
          <input type="range" min={0.5} max={1} step={0.05} value={scale} onChange={(e) => setScale(+e.target.value)} />
          {Math.round(scale * 100)}%
        </label>
        <button className={btn(false)} onClick={() => setReload((r) => r + 1)}>Recarregar todos</button>
        <button
          className={btn(false)}
          onClick={() => setLooks((ls) => [...ls, { ...ls[ls.length - 1], name: `Minha ${ls.length + 1}` }])}
        >
          + coluna
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-6">
        {looks.map((look, i) => (
          <div key={i} className="shrink-0" style={{ width: width * scale }}>
            <div className="mb-2 flex items-start justify-between gap-2">
              <button className="text-left text-sm font-semibold" onClick={() => setOpen(open === i ? null : i)}>
                {look.name} {open === i ? "▴" : "▾"}
              </button>
              <button className="text-xs text-muted" onClick={() => setLooks((ls) => ls.filter((_, j) => j !== i))}>
                remover
              </button>
            </div>
            <p className="mb-2 text-xs text-muted">
              cartão {look.box} · pill {look.pill} · div {look.div} · fonte {look.fw} · linha {look.line}
            </p>
            {open === i && (
              <div className="mb-2 space-y-1 rounded-lg border border-line bg-surface p-2 text-xs">
                <input
                  className="w-full rounded border border-line bg-background px-2 py-0.5"
                  value={look.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                />
                {OPTIONS.map((o) => (
                  <div key={o.key} className="flex flex-wrap items-center gap-1">
                    <span className="w-24 text-muted">{o.label}</span>
                    {o.values.map(([v, label]) => (
                      <button
                        key={v}
                        className={`rounded-full border px-2 ${look[o.key] === v ? "border-foreground bg-foreground text-background" : "border-line"}`}
                        onClick={() => update(i, { [o.key]: v } as Partial<Look>)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
            <div style={{ width: width * scale, height: height * scale }} className="overflow-hidden rounded-2xl border border-line shadow">
              <iframe
                key={`${query(look, theme)}|${page}|${reload}`}
                src={`${page}${page.includes("?") ? "&" : "?"}pv=${query(look, theme)}`}
                title={look.name}
                style={{ width, height, transform: `scale(${scale})`, transformOrigin: "top left", border: 0 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

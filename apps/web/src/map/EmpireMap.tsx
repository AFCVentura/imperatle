"use client";

import type { MultiPolygon } from "geojson";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlatMap } from "./FlatMap";
import { GlobeMap } from "./GlobeMap";
import { countryName, loadWorld, type CountryFeature, type MapLocale, type MapStage, type World } from "./geo";

export type MapMode = "flat" | "globe";

export type EmpireMapLabels = {
  focus: string;
  fullscreen: string;
  exitFullscreen: string;
  loading: string;
  globe: string;
  flat: string;
};

type Props = {
  empire: MultiPolygon | null; // null while it loads
  stage: MapStage;
  locale: MapLocale;
  labels: EmpireMapLabels;
  // Size of the card outside fullscreen.
  className?: string;
};

const MODE_KEY = "imperatle:mapMode";

// The player's last choice; flat by default. Storage can be unavailable
// (private mode, blocked site data), which just means the default.
function savedMode(): MapMode {
  try {
    return typeof window !== "undefined" && localStorage.getItem(MODE_KEY) === "globe" ? "globe" : "flat";
  } catch {
    return "flat";
  }
}

// Tied to the view it was opened in: a new stage, mode or empire hides it.
type Label = { id: string; name: string; x: number; y: number; view: unknown[] };

// The map card: flat map or globe (the player's choice, remembered), with
// "focus" (fly back to the empire) and fullscreen. In fullscreen on a phone it
// tries to turn to landscape, where the map has more room.
export function EmpireMap({ empire, stage, locale, labels, className = "aspect-[4/3] w-full" }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<MapMode>(savedMode);
  const [world, setWorld] = useState<World | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [focusSignal, setFocusSignal] = useState(0);
  const [openLabel, setLabel] = useState<Label | null>(null);
  const view = [stage, mode, empire];
  const label = openLabel?.view.every((v, i) => v === view[i]) ? openLabel : null;
  // Real fullscreen where the browser allows it; otherwise (iPhone Safari) the
  // frame just covers the page.
  const [fullscreen, setFullscreen] = useState<"off" | "native" | "covered">("off");

  useEffect(() => {
    loadWorld().then(setWorld, (e) => console.error(e));
  }, []);

  useEffect(() => {
    const el = frameRef.current!;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.round(width), height: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setFullscreen((f) => (f === "native" ? "off" : f));
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = async () => {
    if (fullscreen === "native") {
      await document.exitFullscreen().catch(() => {});
      return;
    }
    if (fullscreen === "covered") {
      setFullscreen("off");
      return;
    }
    const el = frameRef.current!;
    if (el.requestFullscreen) {
      try {
        await el.requestFullscreen();
        setFullscreen("native");
        // Android browsers allow this in fullscreen; elsewhere it just fails.
        const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
        await orientation.lock?.("landscape").catch(() => {});
        return;
      } catch {
        // falls through to the covered mode
      }
    }
    setFullscreen("covered");
  };

  const toggleMode = () => {
    const next = mode === "flat" ? "globe" : "flat";
    setMode(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      // not remembered, still switched
    }
  };

  const onCountry = useCallback(
    (c: CountryFeature | null, x: number, y: number) => {
      setLabel((prev) =>
        !c || prev?.id === c.id ? null : { id: String(c.id), name: countryName(c, locale), x, y, view: [stage, mode, empire] },
      );
    },
    [locale, stage, mode, empire],
  );

  const Map = mode === "flat" ? FlatMap : GlobeMap;
  const isFull = fullscreen !== "off";

  return (
    <div
      ref={frameRef}
      onContextMenu={(e) => e.preventDefault()}
      className={
        "relative overflow-hidden bg-map select-none [-webkit-touch-callout:none] " +
        (isFull
          ? fullscreen === "covered" ? "fixed inset-0 z-50" : "h-full w-full"
          : `${className} rounded-xl border border-map-line`)
      }
    >
      {world && empire && size.width > 0 ? (
        <Map
          world={world}
          empire={empire}
          stage={stage}
          width={size.width}
          height={size.height}
          focusSignal={focusSignal}
          selected={label?.id ?? null}
          onCountry={onCountry}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-muted">{labels.loading}</div>
      )}

      {label && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background shadow"
          style={{ left: label.x, top: label.y - 8 }}
        >
          {label.name}
        </div>
      )}

      <div className="absolute right-2 bottom-2 flex gap-2">
        <MapButton onClick={toggleMode} title={mode === "flat" ? labels.globe : labels.flat}>
          {mode === "flat" ? (
            // globe
            <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 0c2.5 2.4 3.8 5.4 3.8 9s-1.3 6.6-3.8 9m0-18C9.5 5.4 8.2 8.4 8.2 12s1.3 6.6 3.8 9M3.5 9h17m-17 6h17" />
          ) : (
            // folded flat map
            <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zm0 0v14m6-12v14" />
          )}
        </MapButton>
        {stage > 1 && (
          <MapButton onClick={() => setFocusSignal((n) => n + 1)} title={labels.focus}>
            <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0-6v3m0 14v3M2 12h3m14 0h3" />
          </MapButton>
        )}
        <MapButton onClick={toggleFullscreen} title={isFull ? labels.exitFullscreen : labels.fullscreen}>
          {isFull ? (
            <path d="M9 4v5H4m11-5v5h5M9 20v-5H4m11 5v-5h5" />
          ) : (
            <path d="M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5" />
          )}
        </MapButton>
      </div>
    </div>
  );
}

function MapButton({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex size-9 items-center justify-center rounded-full border border-map-line bg-background/90 text-foreground shadow-sm hover:bg-surface"
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  );
}

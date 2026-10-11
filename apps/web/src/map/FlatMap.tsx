"use client";

import type { MultiPolygon } from "geojson";
import { geoCentroid, geoContains, geoEqualEarth, geoGraticule10, geoPath } from "d3-geo";
import { select } from "d3-selection";
import "d3-transition";
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import { useEffect, useMemo, useRef } from "react";
import { readMapColors, type CountryFeature, type MapStage, type World } from "./geo";

// A ring of [longitude, latitude] points drawn by hand in the empire
// generator, to add to the empire or cut out of it.
export type DrawMode = "add" | "remove";
export type DrawnRing = { mode: DrawMode; ring: [number, number][] };

type Props = {
  world: World;
  empire: MultiPolygon;
  // What the view centres on and frames (default: the empire). The generator
  // keeps it fixed while areas are drawn, so the map doesn't jump each time.
  frame?: MultiPolygon;
  // Generator only: tracing an area with the pointer (dragging no longer pans;
  // the wheel still zooms), and the areas already drawn, outlined.
  draw?: { mode: DrawMode; onDone: (ring: [number, number][]) => void } | null;
  overlays?: DrawnRing[];
  stage: MapStage;
  width: number;
  height: number;
  focusSignal: number; // bump to fly back to the empire
  zoomSignal: { n: number; factor: number }; // bump n to zoom by factor
  selected: string | null; // country id
  onCountry: (c: CountryFeature | null, x: number, y: number) => void;
};

const MAX_ZOOM = 40;

// Where the player is looking, kept across resizes (fullscreen, rotating the
// phone) so the map doesn't jump back to the empire.
type View = { frame: MultiPolygon; center: [number, number]; k: number };

const DRAW_COLORS: Record<DrawMode, string> = { add: "rgb(22 140 60)", remove: "rgb(200 30 30)" };

// The stroke's points, in projected map units: fewer points (Douglas-Peucker,
// within `tolerance`), then rounded corners (two passes of Chaikin), so a
// shaky hand still gives a fluid line.
function simplify(points: [number, number][], tolerance: number): [number, number][] {
  if (points.length < 3) return points;
  const [a, b] = [points[0], points.at(-1)!];
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const length = Math.hypot(dx, dy);
  let [farthest, index] = [0, 0];
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i];
    // Distance to the chord; to the first point when the stroke closes on itself.
    const d = length === 0 ? Math.hypot(px - a[0], py - a[1]) : Math.abs(dy * px - dx * py + b[0] * a[1] - b[1] * a[0]) / length;
    if (d > farthest) [farthest, index] = [d, i];
  }
  if (farthest <= tolerance) return [a, b];
  return [...simplify(points.slice(0, index + 1), tolerance).slice(0, -1), ...simplify(points.slice(index), tolerance)];
}

function smoothClosed(points: [number, number][], passes = 2): [number, number][] {
  let ring = points;
  for (let n = 0; n < passes; n++) {
    const current = ring;
    ring = current.flatMap((p, i): [number, number][] => {
      const q = current[(i + 1) % current.length];
      return [
        [0.75 * p[0] + 0.25 * q[0], 0.75 * p[1] + 0.25 * q[1]],
        [0.25 * p[0] + 0.75 * q[0], 0.25 * p[1] + 0.75 * q[1]],
      ];
    });
  }
  return ring;
}

// ~100 m, the same rounding as the shapes.
const roundDeg = (n: number) => Math.round(n * 1000) / 1000;

// Flat world map (Equal Earth: keeps areas true, which matters in a game where
// area is a clue), centred on the empire's longitude. Stage 1 is locked on the
// empire; from stage 2 on, the player can zoom out to the whole world.
//
// Drawn on canvas: every shape is projected once into a Path2D, and each frame
// only repaints them at the current zoom, so panning stays smooth and sharp.
export function FlatMap({ world, empire, frame, draw = null, overlays, stage, width, height, focusSignal, zoomSignal, selected, onCountry }: Props) {
  const anchor = frame ?? empire;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoomRef = useRef<ZoomBehavior<HTMLCanvasElement, unknown> | null>(null);
  const transformRef = useRef<ZoomTransform>(zoomIdentity);
  const viewRef = useRef<View | null>(null);
  const stageRef = useRef(stage);
  const drawRef = useRef<() => void>(() => {});
  const frameRef = useRef(0);
  const drawModeRef = useRef(draw);
  // The stroke being traced, in projected map units (null when not tracing).
  const strokeRef = useRef<[number, number][] | null>(null);

  useEffect(() => {
    drawModeRef.current = draw;
  }, [draw]);

  const schedule = () => {
    frameRef.current ||= requestAnimationFrame(() => {
      frameRef.current = 0;
      drawRef.current();
    });
  };

  const geo = useMemo(() => {
    const projection = geoEqualEarth()
      .rotate([-geoCentroid(anchor)[0], 0])
      .fitExtent([[8, 8], [width - 8, height - 8]], { type: "Sphere" });
    const path = geoPath(projection);
    const shape = (o: Parameters<typeof path>[0]) => new Path2D(path(o) ?? "");
    const [[x0, y0], [x1, y1]] = path.bounds(anchor);
    const k = Math.min(MAX_ZOOM, 0.85 / Math.max((x1 - x0) / width, (y1 - y0) / height));
    const focus = zoomIdentity
      .translate(width / 2, height / 2)
      .scale(k)
      .translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
    return {
      projection,
      path,
      focus,
      sphere: shape({ type: "Sphere" }),
      graticule: shape(geoGraticule10()),
      land: shape(world.land),
      borders: shape(world.borders),
    };
  }, [world, anchor, width, height]);

  const empireShape = useMemo(() => new Path2D(geo.path(empire) ?? ""), [geo, empire]);

  // Drawn rings joined point to point on the map (straight lines, as traced),
  // not as spherical polygons, which a ring's winding could turn inside out.
  const overlayShapes = useMemo(
    () =>
      (overlays ?? []).map(({ mode, ring }) => {
        const path = new Path2D();
        ring.forEach((lonLat, i) => {
          const xy = geo.projection(lonLat);
          if (xy) (i === 0 ? path.moveTo : path.lineTo).call(path, xy[0], xy[1]);
        });
        path.closePath();
        return { mode, path };
      }),
    [overlays, geo],
  );

  const selectedShape = useMemo(() => {
    const c = world.countries.find((c) => c.id === selected);
    return c ? new Path2D(geo.path(c) ?? "") : null;
  }, [world, selected, geo]);

  // Paints the current frame.
  useEffect(() => {
    stageRef.current = stage;
    const canvas = canvasRef.current!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d")!;
    const colors = readMapColors(canvas);
    const ink = getComputedStyle(canvas).color;

    drawRef.current = () => {
      const t = transformRef.current;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr * t.k, 0, 0, dpr * t.k, dpr * t.x, dpr * t.y);
      ctx.lineJoin = "round";
      // Line widths in screen pixels, whatever the zoom.
      const stroke = (shape: Path2D, style: string, px: number) => {
        ctx.strokeStyle = style;
        ctx.lineWidth = px / t.k;
        ctx.stroke(shape);
      };
      const fill = (shape: Path2D, style: string) => {
        ctx.fillStyle = style;
        ctx.fill(shape);
      };

      if (stage >= 2) {
        fill(geo.sphere, colors.ocean);
        stroke(geo.sphere, colors.coast, 1);
        stroke(geo.graticule, "rgb(153 88 42 / 0.15)", 0.5);
        fill(geo.land, colors.land);
        stroke(geo.land, colors.coast, 0.7);
      }
      if (stage === 3) stroke(geo.borders, colors.border, 0.6);
      ctx.globalAlpha = stage === 1 ? 0.9 : 0.6;
      fill(empireShape, colors.empire);
      ctx.globalAlpha = 1;
      stroke(empireShape, colors.empireLine, 1.2);
      if (stage === 3 && selectedShape) stroke(selectedShape, ink, 1.5);

      ctx.setLineDash([6 / t.k, 4 / t.k]);
      for (const o of overlayShapes) stroke(o.path, DRAW_COLORS[o.mode], 1.5);
      ctx.setLineDash([]);
      const traced = strokeRef.current;
      const mode = drawModeRef.current?.mode;
      if (traced && mode && traced.length > 1) {
        const p = new Path2D();
        traced.forEach(([x, y], i) => (i === 0 ? p.moveTo(x, y) : p.lineTo(x, y)));
        ctx.globalAlpha = 0.2;
        fill(p, DRAW_COLORS[mode]);
        ctx.globalAlpha = 1;
        stroke(p, DRAW_COLORS[mode], 2);
      }
    };
    schedule();
  }, [geo, empireShape, overlayShapes, stage, selectedShape, width, height]);

  // Zoom behaviour, rebuilt with the geometry (new size or empire). After a
  // resize it puts back what the player was looking at.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const sel = select(canvas);
    const z = zoom<HTMLCanvasElement, unknown>()
      // While drawing, a drag traces instead of panning; the wheel still zooms.
      .filter((e: MouseEvent) => (drawModeRef.current ? e.type === "wheel" : (!e.ctrlKey || e.type === "wheel") && !e.button))
      .scaleExtent([1, MAX_ZOOM * 1.5])
      .translateExtent([[0, 0], [width, height]])
      .on("zoom", (e: { transform: ZoomTransform }) => {
        const t = e.transform;
        transformRef.current = t;
        const center = geo.projection.invert!([(width / 2 - t.x) / t.k, (height / 2 - t.y) / t.k]);
        if (center) viewRef.current = { frame: anchor, center, k: t.k };
        schedule();
      });
    zoomRef.current = z;
    sel.call(z).on("dblclick.zoom", null);

    const v = viewRef.current;
    let start = geo.focus;
    if (stageRef.current !== 1 && v?.frame === anchor) {
      const p = geo.projection(v.center);
      if (p) start = zoomIdentity.translate(width / 2, height / 2).scale(v.k).translate(-p[0], -p[1]);
    }
    sel.call(z.transform, start);
    return () => {
      sel.on(".zoom", null);
    };
  }, [geo, anchor, width, height]);

  // Stage 1: no panning or zooming, always framed on the empire.
  useEffect(() => {
    const sel = select(canvasRef.current!);
    const z = zoomRef.current!;
    if (stage === 1) {
      sel.interrupt().call(z.transform, geo.focus).on(".zoom", null);
    } else {
      sel.call(z).on("dblclick.zoom", null);
    }
  }, [stage, geo]);

  // Only when the button is pressed, not when a resize rebuilds the geometry.
  const flownRef = useRef(focusSignal);
  useEffect(() => {
    if (focusSignal === flownRef.current) return;
    flownRef.current = focusSignal;
    const sel = select(canvasRef.current!);
    sel.transition().duration(900).call(zoomRef.current!.transform, geo.focus);
  }, [focusSignal, geo]);

  const zoomedRef = useRef(zoomSignal.n);
  useEffect(() => {
    if (zoomSignal.n === zoomedRef.current) return;
    zoomedRef.current = zoomSignal.n;
    select(canvasRef.current!).transition().duration(300).call(zoomRef.current!.scaleBy, zoomSignal.factor);
  }, [zoomSignal]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    },
    [],
  );

  // d3-zoom swallows the click that ends a drag, so this only sees real clicks.
  const click = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (stage !== 3 || draw) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const t = transformRef.current;
    const lonLat = geo.projection.invert!([(x - t.x) / t.k, (y - t.y) / t.k]);
    const hit = lonLat && world.countries.find((c) => geoContains(c, lonLat));
    onCountry(hit ?? null, x, y);
  };

  // Tracing: pointer position in projected map units (before the zoom).
  const mapPoint = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    const t = transformRef.current;
    return [(e.clientX - r.left - t.x) / t.k, (e.clientY - r.top - t.y) / t.k];
  };

  const startStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draw || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    strokeRef.current = [mapPoint(e)];
    schedule();
  };

  const extendStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const traced = strokeRef.current;
    if (!traced) return;
    const p = mapPoint(e);
    const last = traced.at(-1)!;
    // A point every 3 screen pixels is plenty before smoothing.
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) * transformRef.current.k < 3) return;
    traced.push(p);
    schedule();
  };

  const endStroke = () => {
    const traced = strokeRef.current;
    strokeRef.current = null;
    schedule();
    if (!traced || !draw || traced.length < 3) return;
    const ring = smoothClosed(simplify(traced, 1.5 / transformRef.current.k))
      .map((p) => geo.projection.invert!(p))
      .filter((p): p is [number, number] => !!p)
      // Across the antimeridian the longitude keeps going (179, 181...) instead
      // of jumping to -179, or the ring would wrap the whole globe.
      .reduce<[number, number][]>((ring, [lon, lat]) => {
        const prev = ring.at(-1)?.[0];
        ring.push([prev === undefined ? lon : lon + 360 * Math.round((prev - lon) / 360), lat]);
        return ring;
      }, [])
      .map(([lon, lat]): [number, number] => [roundDeg(lon), roundDeg(lat)])
      .filter((p, i, r) => i === 0 || p[0] !== r[i - 1][0] || p[1] !== r[i - 1][1]);
    if (ring.length >= 3) draw.onDone(ring);
  };

  const cancelStroke = () => {
    strokeRef.current = null;
    schedule();
  };

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, cursor: draw ? "crosshair" : undefined }}
      onClick={click}
      onPointerDown={startStroke}
      onPointerMove={extendStroke}
      onPointerUp={endStroke}
      onPointerCancel={cancelStroke}
      className="block touch-none select-none text-foreground"
    />
  );
}

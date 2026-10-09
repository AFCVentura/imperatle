"use client";

import type { MultiPolygon } from "geojson";
import { geoCentroid, geoContains, geoEqualEarth, geoGraticule10, geoPath } from "d3-geo";
import { select } from "d3-selection";
import "d3-transition";
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import { useEffect, useMemo, useRef } from "react";
import { readMapColors, type CountryFeature, type MapStage, type World } from "./geo";

type Props = {
  world: World;
  empire: MultiPolygon;
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
type View = { empire: MultiPolygon; center: [number, number]; k: number };

// Flat world map (Equal Earth: keeps areas true, which matters in a game where
// area is a clue), centred on the empire's longitude. Stage 1 is locked on the
// empire; from stage 2 on, the player can zoom out to the whole world.
//
// Drawn on canvas: every shape is projected once into a Path2D, and each frame
// only repaints them at the current zoom, so panning stays smooth and sharp.
export function FlatMap({ world, empire, stage, width, height, focusSignal, zoomSignal, selected, onCountry }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoomRef = useRef<ZoomBehavior<HTMLCanvasElement, unknown> | null>(null);
  const transformRef = useRef<ZoomTransform>(zoomIdentity);
  const viewRef = useRef<View | null>(null);
  const stageRef = useRef(stage);
  const drawRef = useRef<() => void>(() => {});
  const frameRef = useRef(0);

  const schedule = () => {
    frameRef.current ||= requestAnimationFrame(() => {
      frameRef.current = 0;
      drawRef.current();
    });
  };

  const geo = useMemo(() => {
    const projection = geoEqualEarth()
      .rotate([-geoCentroid(empire)[0], 0])
      .fitExtent([[8, 8], [width - 8, height - 8]], { type: "Sphere" });
    const path = geoPath(projection);
    const shape = (o: Parameters<typeof path>[0]) => new Path2D(path(o) ?? "");
    const [[x0, y0], [x1, y1]] = path.bounds(empire);
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
      empire: shape(empire),
    };
  }, [world, empire, width, height]);

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
      fill(geo.empire, colors.empire);
      ctx.globalAlpha = 1;
      stroke(geo.empire, colors.empireLine, 1.2);
      if (stage === 3 && selectedShape) stroke(selectedShape, ink, 1.5);
    };
    schedule();
  }, [geo, stage, selectedShape, width, height]);

  // Zoom behaviour, rebuilt with the geometry (new size or empire). After a
  // resize it puts back what the player was looking at.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const sel = select(canvas);
    const z = zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([1, MAX_ZOOM * 1.5])
      .translateExtent([[0, 0], [width, height]])
      .on("zoom", (e: { transform: ZoomTransform }) => {
        const t = e.transform;
        transformRef.current = t;
        const center = geo.projection.invert!([(width / 2 - t.x) / t.k, (height / 2 - t.y) / t.k]);
        if (center) viewRef.current = { empire, center, k: t.k };
        schedule();
      });
    zoomRef.current = z;
    sel.call(z).on("dblclick.zoom", null);

    const v = viewRef.current;
    let start = geo.focus;
    if (stageRef.current !== 1 && v?.empire === empire) {
      const p = geo.projection(v.center);
      if (p) start = zoomIdentity.translate(width / 2, height / 2).scale(v.k).translate(-p[0], -p[1]);
    }
    sel.call(z.transform, start);
    return () => {
      sel.on(".zoom", null);
    };
  }, [geo, empire, width, height]);

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
    if (stage !== 3) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const t = transformRef.current;
    const lonLat = geo.projection.invert!([(x - t.x) / t.k, (y - t.y) / t.k]);
    const hit = lonLat && world.countries.find((c) => geoContains(c, lonLat));
    onCountry(hit ?? null, x, y);
  };

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      onClick={click}
      className="block touch-none select-none text-foreground"
    />
  );
}

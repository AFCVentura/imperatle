"use client";

import type { MultiPolygon } from "geojson";
import { geoCentroid, geoContains, geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { interpolate } from "d3-interpolate";
import { useEffect, useMemo, useRef, useState } from "react";
import { loadWorld, readMapColors, visiblePieces, worldPieces, type CountryFeature, type MapStage, type World } from "./geo";

type Props = {
  world: World;
  empire: MultiPolygon;
  stage: MapStage;
  width: number;
  height: number;
  focusSignal: number;
  selected: string | null;
  onCountry: (c: CountryFeature | null, x: number, y: number) => void;
};

type View = { rotate: [number, number]; scale: number };

const graticule = geoGraticule10();

// Globe you can spin: drag rotates, wheel/pinch zooms, a click names the
// country under it. Drawn on canvas, since every rotation redraws the world.
export function GlobeMap({ world, empire, stage, width, height, focusSignal, selected, onCountry }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef<View>({ rotate: [0, 0], scale: 1 });
  const drawRef = useRef<() => void>(() => {});
  const stageRef = useRef(stage);
  const frameRef = useRef(0);
  // While the globe moves it draws the light world, then the full one once it
  // has been still for a moment.
  const movingRef = useRef(false);
  const settleRef = useRef(0);
  const [light, setLight] = useState<World | null>(null);
  // Which empire, at which globe size, the current view belongs to.
  const shownRef = useRef<{ empire: MultiPolygon; baseScale: number } | null>(null);

  useEffect(() => {
    loadWorld("world-light.json").then(setLight, (e) => console.error(e));
  }, []);

  // Marks the globe as moving (light world) and redraws in full once it stops.
  const moving = () => {
    movingRef.current = true;
    clearTimeout(settleRef.current);
    settleRef.current = window.setTimeout(() => {
      movingRef.current = false;
      drawRef.current();
    }, 150);
  };

  // One redraw per screen frame, however many pointer events arrive.
  const schedule = () => {
    frameRef.current ||= requestAnimationFrame(() => {
      frameRef.current = 0;
      drawRef.current();
    });
  };

  const baseScale = (Math.min(width, height) / 2) * 0.92;

  // The empire framed in the middle of the visible hemisphere.
  const focus = useMemo<View>(() => {
    const [lon, lat] = geoCentroid(empire);
    const p = geoOrthographic()
      .rotate([-lon, -lat])
      .fitExtent([[width * 0.1, height * 0.1], [width * 0.9, height * 0.9]], empire);
    return { rotate: [-lon, -lat], scale: Math.max(baseScale, p.scale()) };
  }, [empire, width, height, baseScale]);

  // Redraw function, rebuilt whenever what's drawn changes.
  useEffect(() => {
    stageRef.current = stage;
    const canvas = canvasRef.current!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d")!;
    const colors = readMapColors(canvas);
    const selectedCountry = world.countries.find((c) => c.id === selected);

    drawRef.current = () => {
      const { rotate, scale } = viewRef.current;
      // No adaptive resampling: the world's points are already close together,
      // and resampling every line on every frame was the main cost of a spin.
      const projection = geoOrthographic().rotate(rotate).scale(scale).translate([width / 2, height / 2]).precision(0);
      const path = geoPath(projection, ctx);
      const pieces = worldPieces(movingRef.current && light ? light : world);
      // How far from the centre the screen reaches: the whole hemisphere when
      // the globe fits, less when zoomed in past the screen's corners.
      const halfDiagonal = Math.hypot(width, height) / 2;
      const visibleAngle = halfDiagonal >= scale ? Math.PI / 2 : Math.asin(halfDiagonal / scale);
      const viewCenter: [number, number] = [-rotate[0], -rotate[1]];
      const visible = <G,>(list: { geometry: G; center: [number, number]; radius: number }[]) =>
        visiblePieces(list, viewCenter, visibleAngle);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const stroke = (style: string, w: number) => {
        ctx.strokeStyle = style;
        ctx.lineWidth = w;
        ctx.stroke();
      };

      if (stageRef.current >= 2) {
        ctx.beginPath(); path({ type: "Sphere" }); ctx.fillStyle = colors.ocean; ctx.fill(); stroke(colors.coast, 1);
        ctx.beginPath(); path(graticule); stroke("rgb(153 88 42 / 0.15)", 0.5);
        ctx.beginPath();
        for (const p of visible(pieces.land)) path(p.geometry);
        ctx.fillStyle = colors.land; ctx.fill(); stroke(colors.coast, 0.7);
      }
      if (stageRef.current === 3) {
        ctx.beginPath();
        for (const p of visible(pieces.borders)) path(p.geometry);
        stroke(colors.border, 0.6);
      }
      ctx.beginPath(); path(empire);
      ctx.globalAlpha = stageRef.current === 1 ? 0.9 : 0.6;
      ctx.fillStyle = colors.empire; ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineJoin = "round"; stroke(colors.empireLine, 1.2);
      if (stageRef.current === 3 && selectedCountry) {
        ctx.beginPath(); path(selectedCountry); stroke(getComputedStyle(canvas).color, 1.5);
      }
    };
    drawRef.current();
  }, [world, light, empire, width, height, stage, selected]);

  // A new empire starts framed on it; a resize (fullscreen, rotating the
  // phone) keeps the view, with the zoom scaled to the new globe size.
  useEffect(() => {
    const shown = shownRef.current;
    if (shown?.empire === empire && stageRef.current !== 1) {
      viewRef.current = { ...viewRef.current, scale: viewRef.current.scale * (baseScale / shown.baseScale) };
    } else {
      viewRef.current = { rotate: [...focus.rotate], scale: focus.scale };
    }
    shownRef.current = { empire, baseScale };
    drawRef.current();
  }, [focus, empire, baseScale]);

  // Animated fly back to the empire, only when the button is pressed (not when
  // a resize recomputes the focus).
  const flownRef = useRef(focusSignal);
  useEffect(() => {
    if (focusSignal === flownRef.current) return;
    flownRef.current = focusSignal;
    const from = viewRef.current;
    // Shortest way round in longitude.
    const dLon = ((focus.rotate[0] - from.rotate[0] + 540) % 360) - 180;
    const to: View = { rotate: [from.rotate[0] + dLon, focus.rotate[1]], scale: focus.scale };
    const i = interpolate(from, to);
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1000);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
      viewRef.current = i(eased) as View;
      moving();
      drawRef.current();
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [focusSignal, focus]);

  // Drag to spin, wheel or pinch to zoom, tap to name a country. Stage 1 is
  // locked on the empire, like the flat map.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const pointers = new Map<number, { x: number; y: number }>();
    let moved = 0;
    let pinch = 0;
    const clampScale = (s: number) => Math.min(baseScale * 40, Math.max(baseScale * 0.8, s));

    const down = (e: PointerEvent) => {
      if (stageRef.current === 1) return;
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = 0;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };
    const move = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const cur = { x: e.clientX, y: e.clientY };
      pointers.set(e.pointerId, cur);
      const v = viewRef.current;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        v.scale = clampScale(v.scale * (d / (pinch || d)));
        pinch = d;
      } else {
        // Degrees per pixel at the current zoom, so the point under the
        // finger roughly follows it.
        const k = 180 / (Math.PI * v.scale);
        const dx = cur.x - prev.x;
        const dy = cur.y - prev.y;
        moved += Math.abs(dx) + Math.abs(dy);
        v.rotate = [v.rotate[0] + dx * k, Math.max(-90, Math.min(90, v.rotate[1] - dy * k))];
      }
      moving();
      schedule();
    };
    const up = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      if (moved < 5 && pointers.size === 0 && stageRef.current === 3) {
        const r = canvas.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        const { rotate, scale } = viewRef.current;
        const lonLat = geoOrthographic().rotate(rotate).scale(scale).translate([width / 2, height / 2]).invert!([x, y]);
        const hit = lonLat && world.countries.find((c) => geoContains(c, lonLat));
        onCountry(hit ?? null, x, y);
      }
    };
    const wheel = (e: WheelEvent) => {
      if (stageRef.current === 1) return;
      e.preventDefault();
      viewRef.current.scale = clampScale(viewRef.current.scale * Math.exp(-e.deltaY * 0.0015));
      moving();
      schedule();
    };

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("wheel", wheel);
    };
  }, [world, width, height, baseScale, onCountry]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
      clearTimeout(settleRef.current);
    },
    [],
  );

  // Back on stage 1: snap to the empire.
  useEffect(() => {
    if (stage !== 1) return;
    viewRef.current = { rotate: [...focus.rotate], scale: focus.scale };
    drawRef.current();
  }, [stage, focus]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="block touch-none select-none text-foreground"
    />
  );
}

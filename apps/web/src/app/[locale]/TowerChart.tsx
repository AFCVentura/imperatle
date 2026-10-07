"use client";

import { useTooltip } from "./useTooltip";

export interface Tower {
  key: string;
  // Under the tower (the attempt number, or ✕ for losses).
  label: string;
  value: number;
  // Over the tower; defaults to the value.
  valueLabel?: string;
  // Today's result -- drawn in the highlight color, with a bold label so
  // it isn't told apart by color alone.
  highlight?: boolean;
  tooltip: string;
}

const MAX_TOWER_PX = 72;

// Single-series column chart ("towers"). Bars rise from a shared baseline
// with 4px rounded tops and a direct value label each; hovering or tapping a
// column shows its tooltip. A visually hidden table carries the same data
// for screen readers.
export function TowerChart({ towers, caption }: { towers: Tower[]; caption: string }) {
  const max = Math.max(1, ...towers.map((t) => t.value));

  return (
    <figure className="flex flex-col gap-1">
      <div className="flex items-end gap-1.5 border-b border-line" aria-hidden>
        {towers.map((tower) => (
          <TowerColumn key={tower.key} tower={tower} heightPx={(tower.value / max) * MAX_TOWER_PX} />
        ))}
      </div>
      <div className="flex gap-1.5" aria-hidden>
        {towers.map((tower) => (
          <span
            key={tower.key}
            className={`flex-1 text-center text-xs ${tower.highlight ? "font-bold text-foreground" : "text-muted"}`}
          >
            {tower.label}
          </span>
        ))}
      </div>
      {/* sr-only on the wrapper, not the table: a table's caption sits
          outside the table box and would stay visible. */}
      <div className="sr-only">
        <table>
          <caption>{caption}</caption>
          <tbody>
            {towers.map((tower) => (
              <tr key={tower.key}>
                <th scope="row">{tower.label}</th>
                <td>{tower.tooltip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

function TowerColumn({ tower, heightPx }: { tower: Tower; heightPx: number }) {
  const { anchorProps, toggle, tooltip } = useTooltip(tower.tooltip);

  return (
    // The whole column is the hit target, not just the (possibly tiny) bar.
    <div
      {...anchorProps}
      onPointerUp={toggle}
      className="flex flex-1 cursor-default flex-col items-center justify-end gap-0.5"
      style={{ height: MAX_TOWER_PX + 18 }}
    >
      <span className={`text-[11px] tabular-nums ${tower.highlight ? "font-bold text-foreground" : "text-muted"}`}>
        {tower.valueLabel ?? tower.value}
      </span>
      {tower.value > 0 && (
        <div
          className={`w-full max-w-9 rounded-t-[4px] ${tower.highlight ? "bg-chart-highlight" : "bg-chart-bar"}`}
          style={{ height: Math.max(heightPx, 3) }}
        />
      )}
      {tooltip}
    </div>
  );
}

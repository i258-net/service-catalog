"use client";

import type { GraphView } from "@bones/core/browser";

export function ViewControls({
  view,
  depth,
  disabled,
  onViewChange,
  onDepthChange,
}: {
  view: GraphView;
  depth: number;
  disabled: boolean;
  onViewChange: (view: GraphView) => void;
  onDepthChange: (depth: number) => void;
}) {
  return (
    <div className="view-controls">
      {(["neighborhood", "upstream", "downstream"] as const).map((v) => (
        <button
          key={v}
          type="button"
          className={view === v ? "active" : undefined}
          disabled={disabled}
          onClick={() => onViewChange(v)}
        >
          {v}
        </button>
      ))}
      <label className="depth">
        depth
        <input
          type="number"
          min={1}
          max={6}
          value={depth}
          disabled={disabled}
          onChange={(e) => {
            const n = Number.parseInt(e.target.value, 10);
            if (Number.isFinite(n) && n >= 1) onDepthChange(n);
          }}
        />
      </label>
    </div>
  );
}

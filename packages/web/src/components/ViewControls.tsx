"use client";

import type { GraphView } from "@service-catalog/core/browser";
import { Input, Label, ToggleChip } from "@i258/ui";

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
        <ToggleChip
          key={v}
          size="sm"
          pressed={view === v}
          disabled={disabled}
          onClick={() => onViewChange(v)}
        >
          {v}
        </ToggleChip>
      ))}
      <Label className="depth-field">
        depth
        <Input
          type="number"
          size="sm"
          min={1}
          max={6}
          value={depth}
          disabled={disabled}
          onChange={(e) => {
            const n = Number.parseInt(e.target.value, 10);
            if (Number.isFinite(n) && n >= 1) onDepthChange(n);
          }}
        />
      </Label>
    </div>
  );
}

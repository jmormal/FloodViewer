/* ─────────────────────────────────────────────
 *  OpacitySlider — layer opacity control
 * ───────────────────────────────────────────── */

import { useFloodState, useFloodActions } from "../../context/FloodContext";

export function OpacitySlider() {
  const { opacity } = useFloodState();
  const { setOpacity } = useFloodActions();

  return (
    <div>
      <label className="ctrl-label">Opacity</label>
      <div className="flex items-center gap-2.5">
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
          className="slider flex-1"
        />
        <span className="font-mono text-xs text-dim w-8 text-right">
          {Math.round(opacity * 100)}%
        </span>
      </div>
    </div>
  );
}

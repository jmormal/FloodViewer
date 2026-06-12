/* ─────────────────────────────────────────────
 *  Legend — color class reference
 * ───────────────────────────────────────────── */

import { useFloodState } from "../context/FloodContext";

export function Legend() {
  const { dataset, activeProperty } = useFloodState();
  if (!dataset) return null;

  const entry = dataset.legend[activeProperty];
  if (!entry) return null;

  return (
    <div className="panel absolute bottom-10 left-4 z-[1000] p-3.5 min-w-[170px]">
      <div className="text-[11px] font-semibold tracking-wider uppercase text-dim mb-2.5">
        {entry.label}
      </div>

      {entry.classes.map((cls, i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <div
            className="w-5 h-3.5 rounded-sm border border-white/10 shrink-0"
            style={{ backgroundColor: cls.color }}
          />
          <span className="font-mono text-[11px] text-white/85">
            {cls.min} – {cls.max}
          </span>
        </div>
      ))}
    </div>
  );
}

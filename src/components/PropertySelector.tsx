/* ─────────────────────────────────────────────
 *  PropertySelector — pill buttons for each property
 * ───────────────────────────────────────────── */

import { useFloodState, useFloodActions } from "../context/FloodContext";
import { theme } from "../config/theme";

export function PropertySelector() {
  const { dataset, activeProperty } = useFloodState();
  const { setActiveProperty } = useFloodActions();

  if (!dataset) return null;

  return (
    <div>
      <label className="ctrl-label">Property</label>
      <div className="flex flex-wrap gap-1.5">
        {dataset.meta.properties.map((prop) => {
          const isActive = prop === activeProperty;
          const label = theme.propertyLabels[prop] ?? prop;

          return (
            <button
              key={prop}
              onClick={() => setActiveProperty(prop)}
              className={`
                rounded-md px-3 py-1.5 text-xs font-medium
                border transition-all duration-200
                ${
                  isActive
                    ? "bg-accent text-[#0a0e17] border-accent font-bold"
                    : "bg-white/5 text-white/80 border-white/10 hover:border-accent/40 hover:bg-white/10"
                }
              `}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}


import { useFloodState, useFloodActions } from "../context/FloodContext";
import { theme } from "../config/theme";
import { getColorForValue } from "../utils/colors";

export function TriangleHistory() {
  const { dataset, selectedTriangle, activeProperty, currentFrame } = useFloodState();
  const { setSelectedTriangle, setActiveProperty, setCurrentFrame } = useFloodActions();

  if (selectedTriangle == null || !dataset) return null;

  const properties = dataset.meta.properties;
  const tri = dataset.triangles[selectedTriangle] as any;
  const times = dataset.times;
  const MAX_VALUES: Record<string, number> = { depth: 3.0, speed: 4.0, momentum: 6.0, hazard: 5.0 };

  return (
    <div className="panel absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] p-4 max-w-[640px] w-[92vw]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-dim">
          Triangle #{selectedTriangle.toLocaleString()} — History
        </span>
        <button onClick={() => setSelectedTriangle(null)} className="text-dim hover:text-white text-lg leading-none px-1">✕</button>
      </div>
      <div className="flex flex-col gap-2.5">
        {properties.map((prop) => {
          const isActive = prop === activeProperty;
          const label = theme.propertyLabels[prop] ?? prop;
          const maxVal = MAX_VALUES[prop] || 1;

          return (
            <div key={prop} className={`rounded-lg px-3 py-2 cursor-pointer transition-all border ${isActive ? "bg-white/[0.08] border-accent/30" : "bg-transparent border-transparent hover:bg-white/[0.04]"}`} onClick={() => setActiveProperty(prop)}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-semibold tracking-wider uppercase ${isActive ? "text-accent" : "text-dim"}`}>{label}</span>
              </div>
              <div className="flex items-end gap-px h-10">
                {times.map((t, i) => {
                  const val = prop === "hazard" ? (tri.depth[i] || 0) * (tri.speed[i] || 0) : (tri[prop]?.[i] || 0);
                  const height = val > 0 ? (val / maxVal) * 100 : 0;
                  const isCurrent = i === currentFrame;
                  const rgb = getColorForValue(prop, val);
                  const colorStr = rgb ? `rgb(${rgb[0]},${rgb[1]},${rgb[2]})` : "transparent";

                  return (
                    <div key={i} className="flex-1 relative group cursor-pointer" style={{ height: "100%" }} onClick={(e) => { e.stopPropagation(); setCurrentFrame(i); }}>
                      <div className={`absolute bottom-0 w-full rounded-t-sm transition-all ${isCurrent ? "ring-1 ring-white ring-offset-1 ring-offset-transparent" : ""}`} style={{ height: `${Math.max(0, Math.min(100, height))}%`, backgroundColor: colorStr, minHeight: val > 0 ? 2 : 0, opacity: isCurrent ? 1 : 0.65 }} />
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#1a1a2e] text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10 pointer-events-none border border-white/10">
                        {t}s: {val.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

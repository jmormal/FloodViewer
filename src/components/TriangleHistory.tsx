/* ─────────────────────────────────────────────
 *  TriangleHistory — per-triangle timeline popup
 * ───────────────────────────────────────────── */

import { useMemo } from "react";
import { useFloodState, useFloodActions } from "../context/FloodContext";
import { theme } from "../config/theme";

export function TriangleHistory() {
  const {
    dataset, selectedTriangle, activeProperty,
    triangleHistories, currentFrame,
  } = useFloodState();
  const { setSelectedTriangle, setActiveProperty, setCurrentFrame } = useFloodActions();

  const allHistories = useMemo(() => {
    if (selectedTriangle == null || !dataset || !triangleHistories) return null;

    const nframes = dataset.meta.nframes;
    const times = dataset.frames.map((f) => f.t as number);
    const result: Record<string, { t: number; ci: number; frame: number }[]> = {};

    for (const prop of dataset.meta.properties) {
      const hist = triangleHistories[prop];
      const base = selectedTriangle * nframes;
      const points: { t: number; ci: number; frame: number }[] = [];

      for (let f = 0; f < nframes; f++) {
        points.push({ t: times[f], ci: hist[base + f], frame: f });
      }
      result[prop] = points;
    }

    return result;
  }, [selectedTriangle, dataset, triangleHistories]);

  if (selectedTriangle == null || !allHistories || !dataset) return null;

  const properties = dataset.meta.properties;
  const nclasses = dataset.meta.nclasses;

  return (
    <div className="panel absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] p-4 max-w-[640px] w-[92vw]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-dim">
          Triangle #{selectedTriangle.toLocaleString()} — History
        </span>
        <button
          onClick={() => setSelectedTriangle(null)}
          className="text-dim hover:text-white text-lg leading-none px-1"
        >
          ✕
        </button>
      </div>

      {/* One row per property */}
      <div className="flex flex-col gap-2.5">
        {properties.map((prop) => {
          const legend = dataset.legend[prop];
          const points = allHistories[prop];
          const isActive = prop === activeProperty;
          const label = theme.propertyLabels[prop] ?? prop;

          return (
            <div
              key={prop}
              className={`rounded-lg px-3 py-2 cursor-pointer transition-all border ${isActive
                  ? "bg-white/[0.08] border-accent/30"
                  : "bg-transparent border-transparent hover:bg-white/[0.04]"
                }`}
              onClick={() => setActiveProperty(prop)}
            >
              {/* Property label */}
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-[10px] font-semibold tracking-wider uppercase ${isActive ? "text-accent" : "text-dim"
                    }`}
                >
                  {label}
                </span>
                <span className="text-[10px] text-dim font-mono">
                  {legend.classes[0].min}–{legend.classes[nclasses - 1].max}
                </span>
              </div>

              {/* Bar chart */}
              <div className="flex items-end gap-px h-10">
                {points.map((pt, i) => {
                  const height =
                    pt.ci >= 0 ? ((pt.ci + 1) / nclasses) * 100 : 0;
                  const isCurrent = i === currentFrame;
                  const cls = pt.ci >= 0 ? legend.classes[pt.ci] : null;

                  return (
                    <div
                      key={i}
                      className="flex-1 relative group cursor-pointer"
                      style={{ height: "100%" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentFrame(pt.frame);
                      }}
                    >
                      <div
                        className={`absolute bottom-0 w-full rounded-t-sm transition-all ${isCurrent ? "ring-1 ring-white ring-offset-1 ring-offset-transparent" : ""
                          }`}
                        style={{
                          height: `${height}%`,
                          backgroundColor: cls?.color ?? "transparent",
                          minHeight: pt.ci >= 0 ? 2 : 0,
                          opacity: isCurrent ? 1 : 0.65,
                        }}
                      />
                      {/* Hover tooltip */}
                      <div
                        className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2
                        hidden group-hover:block bg-[#1a1a2e] text-white text-[10px]
                        px-1.5 py-0.5 rounded whitespace-nowrap z-10 pointer-events-none
                        border border-white/10"
                      >
                        {pt.t}min: {cls ? `${cls.min}–${cls.max}` : "dry"}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Time axis on active property */}
              {isActive && (
                <div className="flex justify-between mt-1 text-[9px] text-dim font-mono">
                  <span>{points[0]?.t}m</span>
                  <span>{points[points.length - 1]?.t}m</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

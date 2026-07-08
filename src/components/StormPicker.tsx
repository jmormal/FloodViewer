/* ─────────────────────────────────────────────
 *  StormPicker — modal list of historical storms.
 *
 *  On select, the parent creates a "storm" feature pre-filled with the
 *  storm_ref and a default placement footprint (which the user then drags
 *  with the existing transform gizmo).
 * ───────────────────────────────────────────── */

import { useEffect, useState } from "react";
import { listStorms, type StormSummary } from "../utils/storms";

interface StormPickerProps {
  onSelect: (storm: StormSummary) => void;
  onClose: () => void;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fmtDuration(frames: number, stepS: number): string {
  const mins = Math.round((frames * stepS) / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function StormPicker({ onSelect, onClose }: StormPickerProps) {
  const [storms, setStorms] = useState<StormSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listStorms();
        if (!cancelled) setStorms(data);
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? "Failed to load storms");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="panel w-[min(640px,92vw)] max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="font-mono text-sm font-semibold text-accent">
            Historical storms
          </h2>
          <button
            onClick={onClose}
            className="text-dim hover:text-white text-lg leading-none px-1"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto">
          {loading ? (
            <div className="flex items-center gap-3 text-dim text-sm py-12 justify-center">
              <div className="h-5 w-5 rounded-full border-2 border-white/10 border-t-accent animate-spin" />
              Loading storms…
            </div>
          ) : error ? (
            <div className="m-4 rounded-md border border-[#ff6b6b]/40 bg-[#ff6b6b]/10 px-4 py-2 text-sm text-[#ff6b6b]">
              {error}
            </div>
          ) : storms.length === 0 ? (
            <div className="py-12 text-center text-dim text-sm">
              No storms in the catalog yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-dim border-b border-white/10 sticky top-0 bg-[#0a0e17]">
                  <th className="px-4 py-2.5 font-medium">Storm</th>
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium">Duration</th>
                  <th className="px-4 py-2.5 font-medium text-right">
                    Total / Peak
                  </th>
                </tr>
              </thead>
              <tbody>
                {storms.map((s) => (
                  <tr
                    key={s.public_id}
                    onClick={() => onSelect(s)}
                    className="border-b border-white/5 last:border-0 hover:bg-white/[0.04] cursor-pointer transition"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{s.name}</div>
                      {s.description && (
                        <div className="text-xs text-dim mt-0.5">
                          {s.description}
                        </div>
                      )}
                      <div className="text-[10px] text-dim font-mono mt-0.5">
                        {s.grid_rows}×{s.grid_cols} · {s.cell_size_m} m ·{" "}
                        {s.timestep_s === 3600
                          ? "hourly"
                          : `${Math.round(s.timestep_s / 60)}-min`}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-dim font-mono text-xs">
                      {fmtDate(s.event_date)}
                    </td>
                    <td className="px-4 py-3 text-dim font-mono text-xs">
                      {fmtDuration(s.n_frames, s.timestep_s)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      <span className="text-accent">
                        {s.total_depth_mm?.toFixed(0) ?? "—"} mm
                      </span>
                      <span className="text-dim">
                        {" "}
                        / {s.peak_intensity_mm_hr?.toFixed(0) ?? "—"} mm/h
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-5 py-3 border-t border-white/10 text-[11px] text-dim">
          Pick a storm, then drag it over the region you want to flood.
        </div>
      </div>
    </div>
  );
}

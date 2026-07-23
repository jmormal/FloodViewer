/* ─────────────────────────────────────────────
 *  AddStormModal — upload a stack of GeoTIFF rainfall
 *  frames as one historical storm.
 *
 *  Frames default-sort by filename (numeric-aware, so
 *  frame2 < frame10), then the user can nudge the order
 *  with the ↑/↓ buttons before submitting — the upload
 *  is sent in exactly that order (see utils/storms.ts).
 * ───────────────────────────────────────────── */

import { useState } from "react";
import { createStorm, type NewStormInput } from "../utils/storms";

interface AddStormModalProps {
  onCreated: () => void;
  onClose: () => void;
}

/** Numeric-aware filename sort, so "frame2" sorts before "frame10". */
function naturalSortKey(name: string): (string | number)[] {
  return name
    .split(/(\d+)/)
    .filter((t) => t !== "")
    .map((t) => (/^\d+$/.test(t) ? Number(t) : t.toLowerCase()));
}

function compareNatural(a: File, b: File): number {
  const ka = naturalSortKey(a.name);
  const kb = naturalSortKey(b.name);
  const len = Math.max(ka.length, kb.length);
  for (let i = 0; i < len; i++) {
    const x = ka[i];
    const y = kb[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (x === y) continue;
    if (typeof x === "number" && typeof y === "number") return x - y;
    return String(x) < String(y) ? -1 : 1;
  }
  return 0;
}

function fmtTimestep(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  if (seconds % 3600 === 0) return `${seconds / 3600} h`;
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  return `${seconds} s`;
}

export function AddStormModal({ onCreated, onClose }: AddStormModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [timestepS, setTimestepS] = useState(600); // 10 min default
  const [units, setUnits] = useState<NewStormInput["units"]>("mm_per_step");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelected = (selected: FileList | null) => {
    if (!selected || selected.length === 0) return;
    setFiles([...selected].sort(compareNatural));
  };

  const move = (index: number, dir: -1 | 1) => {
    setFiles((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const canSubmit =
    name.trim().length > 0 && files.length > 0 && timestepS > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await createStorm({
        name: name.trim(),
        description: description.trim() || undefined,
        eventDate: eventDate || undefined,
        timestepS,
        units,
        files,
      });
      onCreated();
      onClose();
    } catch (e: any) {
      setError(e.message ?? "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="panel w-[min(560px,92vw)] max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="font-mono text-sm font-semibold text-accent">
            Add historical storm
          </h2>
          <button
            onClick={onClose}
            className="text-dim hover:text-white text-lg leading-none px-1"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="ctrl-label">Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Valencia DANA 2024"
              className="px-3 py-2 rounded-md bg-white/5 border border-white/10 text-sm outline-none focus:border-accent/50"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="ctrl-label">Description (optional)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short note about this event"
              className="px-3 py-2 rounded-md bg-white/5 border border-white/10 text-sm outline-none focus:border-accent/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="ctrl-label">Event date (optional)</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="px-3 py-2 rounded-md bg-white/5 border border-white/10 text-sm outline-none focus:border-accent/50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="ctrl-label">
                Timestep (s){timestepS > 0 && (
                  <span className="text-dim font-normal"> — {fmtTimestep(timestepS)}</span>
                )}
              </label>
              <input
                type="number"
                min={1}
                value={timestepS}
                onChange={(e) => setTimestepS(Number(e.target.value))}
                className="px-3 py-2 rounded-md bg-white/5 border border-white/10 text-sm outline-none focus:border-accent/50"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="ctrl-label">Each frame is</label>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  checked={units === "mm_per_step"}
                  onChange={() => setUnits("mm_per_step")}
                />
                Accumulated depth (mm) for that step
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  checked={units === "mm_hr"}
                  onChange={() => setUnits("mm_hr")}
                />
                Rate (mm/hr)
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="ctrl-label">Rainfall frames (.tif / .tiff)</label>
            <input
              type="file"
              multiple
              accept=".tif,.tiff"
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="text-xs text-dim file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-accent file:text-[#0a0e17] file:text-xs file:font-semibold file:cursor-pointer"
            />
            <p className="text-[11px] text-dim mt-0.5">
              Default-sorted by filename. Use ↑/↓ to fix the storm order.
            </p>
          </div>

          {files.length > 0 && (
            <ul className="flex flex-col gap-1 max-h-48 overflow-y-auto rounded-md border border-white/10 p-1.5">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center gap-2 px-2 py-1 rounded bg-white/[0.03] text-xs"
                >
                  <span className="text-dim font-mono w-6 text-right">{i + 1}</span>
                  <span className="flex-1 truncate">{f.name}</span>
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="text-dim hover:text-white disabled:opacity-30 px-1"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === files.length - 1}
                    className="text-dim hover:text-white disabled:opacity-30 px-1"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => removeFile(i)}
                    className="text-[#ff6b6b]/80 hover:text-[#ff6b6b] px-1"
                    title="Remove"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error && (
            <div className="rounded-md border border-[#ff6b6b]/40 bg-[#ff6b6b]/10 px-3 py-2 text-xs text-[#ff6b6b]">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end px-5 py-3 border-t border-white/10">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm border border-white/15 text-white/80 hover:bg-white/5 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-md px-4 py-2 text-sm font-semibold bg-accent text-[#0a0e17] hover:bg-[#4ea8eb] transition disabled:opacity-40"
          >
            {submitting ? "Uploading…" : `Upload ${files.length || ""} frame${files.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}

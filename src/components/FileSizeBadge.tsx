/* ─────────────────────────────────────────────
 *  FileSizeBadge — shows loaded file size
 * ───────────────────────────────────────────── */

import { useFloodState } from "../context/FloodContext";

export function FileSizeBadge() {
  const { fileSize } = useFloodState();
  if (!fileSize) return null;

  return (
    <div className="panel absolute bottom-6 left-4 z-[1000] px-3.5 py-2 font-mono text-[11px] text-dim">
      📦 {(fileSize / 1e6).toFixed(1)} MB
    </div>
  );
}

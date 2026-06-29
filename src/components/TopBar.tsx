/* ─────────────────────────────────────────────
 *  TopBar — app title + dataset metadata
 * ───────────────────────────────────────────── */

import { useAuth } from "../auth/AuthProvider";
import { useFloodState } from "../context/FloodContext";

export function TopBar() {
  const { dataset } = useFloodState();
  if (!dataset) return null;

  const m = dataset.meta;

  const { username, logout } = useAuth();
  return (
    <div
      className="
        panel absolute top-4 left-1/2 -translate-x-1/2 z-[1000]
        flex items-center gap-3 px-5 py-2.5
      "
    >
      <h1 className="font-mono text-sm font-semibold tracking-wide text-accent whitespace-nowrap">
        Hidris Simulation Platform{" "}
        <span className="font-normal text-dim text-xs">GPU</span>
      </h1>

      <div className="w-px h-5 bg-white/10" />

      <span className="font-mono text-xs text-dim">
        {m.ntriangles.toLocaleString()} tri · {m.nframes} frames · {m.nclasses} cls · WebGL
      </span>
      <div className="w-px h-5 bg-white/10" />
      <button
        onClick={logout}
        className="font-mono text-xs text-dim hover:text-accent transition"
        title="Log out"
      >
        {username} · ↩
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
 *  InstanceEditor — the simulation editor for one instance
 *
 *  Reads :publicId from the route, binds the providers to
 *  it, and renders the existing map / drawing / panel UI.
 *  Hydration, autosave, and solution loading are handled
 *  inside SimulationProvider.
 * ───────────────────────────────────────────── */

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FloodProvider } from "../context/FloodProvider";
import { SimulationProvider } from "../context/SimulationProvider";
import { useFloodState } from "../context/FloodContext";
import { FloodMap } from "../components/FloodMap";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { TopBar } from "../components/TopBar";
import { ControlPanel } from "../components/ControlPanel";
import { Legend } from "../components/Legend";
import { TriangleHistory } from "../components/TriangleHistory";

/**
 * Inner shell. The map and drawing panel are always available so the user can
 * build a setup; the result-viewing chrome (TopBar/Legend/etc.) appears once a
 * solution is loaded into the flood visualizer.
 */
function EditorShell({ solved }: { solved: boolean }) {
  const { dataset } = useFloodState();
  const hasSolution = dataset !== null;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0a0e17]">
      <FloodMap />

      {/* Result chrome — only meaningful when a solution is loaded */}
      {hasSolution && (
        <>
          <TopBar />
          <ControlPanel />
          <Legend />
          <TriangleHistory />
        </>
      )}

      {/* Hint when the instance has no solution to view yet */}
      {!hasSolution && !solved && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 z-[1000]">
          <div className="panel px-4 py-2 text-xs text-dim font-mono">
            Draw your setup, then Run Simulation to generate a solution.
          </div>
        </div>
      )}
    </div>
  );
}

export default function InstanceEditor() {
  const { publicId } = useParams<{ publicId: string }>();
  const navigate = useNavigate();
  const [solved, setSolved] = useState(false);

  if (!publicId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e17] text-dim">
        Missing instance id.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Back-to-list affordance, layered above the map */}
      <button
        onClick={() => navigate("/")}
        className="panel absolute top-4 left-4 z-[1500] px-3 py-1.5 text-xs font-mono text-dim hover:text-accent transition"
        title="Back to instances"
      >
        ← Instances
      </button>

      <FloodProvider>
        <SimulationProvider publicId={publicId} onSolvedChange={setSolved}>
          <EditorShell solved={solved} />
        </SimulationProvider>
      </FloodProvider>
    </div>
  );
}

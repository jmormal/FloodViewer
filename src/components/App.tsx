/* ─────────────────────────────────────────────
 *  App — top-level orchestrator
 * ───────────────────────────────────────────── */

import { useState } from "react";
import { FloodProvider } from "../context/FloodProvider";
import { SimulationProvider } from "../context/SimulationProvider";
import { useFloodState } from "../context/FloodContext";
import { FloodMap } from "./FloodMap";
import { FileDrop } from "./FileDrop";
import { LoadingOverlay } from "./LoadingOverlay";
import { TopBar } from "./TopBar";
import { ControlPanel } from "./ControlPanel";
import { Legend } from "./Legend";
import { FileSizeBadge } from "./FileSizeBadge";
import { TriangleHistory } from "./TriangleHistory";
import { Footer } from "./Footer";
/** Inner shell — consumes context */
function AppShell() {
  const { dataset } = useFloodState();
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("Loading…");

  const isLoaded = dataset !== null;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0a0e17]">
      <FloodMap />

      {isLoaded && (
        <>
          <TopBar />
          <ControlPanel />
          <Legend />
          <FileSizeBadge />
          <TriangleHistory />
        </>
      )}

      {!isLoaded && !loading && (
        <FileDrop
          onLoadStart={() => {
            setLoadMsg("Parsing data…");
            setLoading(true);
          }}
          onLoadEnd={() => setLoading(false)}
          onError={(msg) => {
            setLoading(false);
            alert(msg);
          }}
        />
      )}

      {loading && <LoadingOverlay message={loadMsg} />}
    </div>
  );
}

/** Public export — wraps everything in providers */
export default function App() {
  return (
    <FloodProvider>
      <SimulationProvider>
        <AppShell />
      </SimulationProvider>
      <Footer />
    </FloodProvider>
  );
}

/* ─────────────────────────────────────────────
 *  App — top-level orchestrator
 * ───────────────────────────────────────────── */

import { useState } from "react";
import { FloodProvider } from "../context/FloodProvider";
import { useFloodState } from "../context/FloodContext";
import { FloodMap } from "./FloodMap";
import { FileDrop } from "./FileDrop";
import { LoadingOverlay } from "./LoadingOverlay";
import { TopBar } from "./TopBar";
import { ControlPanel } from "./ControlPanel";
import { Legend } from "./Legend";
import { FileSizeBadge } from "./FileSizeBadge";

/** Inner shell — consumes context */
function AppShell() {
  const { dataset } = useFloodState();
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("Loading…");

  const isLoaded = dataset !== null;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0a0e17]">
      {/* Always render map (shows basemap before data loads) */}
      <FloodMap />

      {/* HUD overlays — only visible when data is loaded */}
      {isLoaded && (
        <>
          <TopBar />
          <ControlPanel />
          <Legend />
          <FileSizeBadge />
        </>
      )}

      {/* File upload screen — visible until data loads */}
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

      {/* Loading spinner */}
      {loading && <LoadingOverlay message={loadMsg} />}
    </div>
  );
}

/** Public export — wraps everything in the provider */
export default function App() {
  return (
    <FloodProvider>
      <AppShell />
    </FloodProvider>
  );
}

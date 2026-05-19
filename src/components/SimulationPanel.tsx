import { useCallback } from "react";
import type { FeatureCollection } from "geojson";

export interface SimulationParams {
  /** The drawn polygon(s) as GeoJSON FeatureCollection */
  region: FeatureCollection;
  /** Total area of drawn polygons in m² */
  areaSqM: number;
}

interface SimulationPanelProps {
  drawMode: boolean;
  onToggleDrawMode: () => void;
  drawnFeatures: FeatureCollection | null;
  areaSqM: number | null;
  onClearDrawing: () => void;
  onRunSimulation: (params: SimulationParams) => void;
}

export function SimulationPanel({
  drawMode,
  onToggleDrawMode,
  drawnFeatures,
  areaSqM,
  onClearDrawing,
  onRunSimulation,
}: SimulationPanelProps) {
  const hasPolygons =
    drawnFeatures != null && drawnFeatures.features.length > 0;

  const handleRun = useCallback(() => {
    if (!drawnFeatures || !areaSqM) return;
    onRunSimulation({ region: drawnFeatures, areaSqM });
  }, [drawnFeatures, areaSqM, onRunSimulation]);

  const formatArea = (m2: number) => {
    if (m2 >= 1_000_000) return `${(m2 / 1_000_000).toFixed(2)} km²`;
    if (m2 >= 10_000) return `${(m2 / 10_000).toFixed(2)} ha`;
    return `${m2.toFixed(1)} m²`;
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 10,
        background: "rgba(15, 15, 20, 0.88)",
        backdropFilter: "blur(12px)",
        borderRadius: 10,
        padding: 16,
        minWidth: 220,
        color: "#e4e4e7",
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 13,
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#a1a1aa",
          marginBottom: 10,
          fontWeight: 600,
        }}
      >
        Simulation
      </div>

      {/* Draw‑mode toggle */}
      <button
        onClick={onToggleDrawMode}
        style={{
          width: "100%",
          padding: "8px 0",
          borderRadius: 6,
          border: drawMode
            ? "1px solid #ff6b6b"
            : "1px solid rgba(255,255,255,0.15)",
          background: drawMode ? "rgba(255,107,107,0.15)" : "transparent",
          color: drawMode ? "#ff6b6b" : "#e4e4e7",
          cursor: "pointer",
          fontWeight: 500,
          fontSize: 13,
          transition: "all 0.15s",
        }}
      >
        {drawMode ? "✕  Exit Draw Mode" : "✎  Draw Region"}
      </button>

      {drawMode && (
        <div
          style={{
            marginTop: 8,
            padding: "6px 8px",
            background: "rgba(255,107,107,0.08)",
            borderRadius: 6,
            fontSize: 11,
            color: "#a1a1aa",
            lineHeight: 1.5,
          }}
        >
          Click the map to place polygon vertices. Double‑click or click the
          first point to close.
        </div>
      )}

      {/* Area readout */}
      {hasPolygons && areaSqM != null && (
        <div style={{ marginTop: 12 }}>
          <div style={{ color: "#a1a1aa", fontSize: 11, marginBottom: 2 }}>
            Selected area
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#fff" }}>
            {formatArea(areaSqM)}
          </div>
          <div style={{ fontSize: 11, color: "#71717a" }}>
            {drawnFeatures.features.length} polygon
            {drawnFeatures.features.length > 1 ? "s" : ""}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {hasPolygons && (
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 14,
          }}
        >
          <button
            onClick={onClearDrawing}
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "transparent",
              color: "#a1a1aa",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Clear
          </button>
          <button
            onClick={handleRun}
            style={{
              flex: 2,
              padding: "8px 0",
              borderRadius: 6,
              border: "none",
              background: "#3b82f6",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) =>
              ((e.target as HTMLElement).style.background = "#2563eb")
            }
            onMouseLeave={(e) =>
              ((e.target as HTMLElement).style.background = "#3b82f6")
            }
          >
            Run Simulation
          </button>
        </div>
      )}
    </div>
  );
}
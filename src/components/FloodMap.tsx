/* ─────────────────────────────────────────────
 * FloodMap — DeckGL + polygon drawing + simulation panel
 * ───────────────────────────────────────────── */

import { useMemo, useState, useEffect, useCallback } from "react";
import DeckGL from "@deck.gl/react";
import Map from "react-map-gl/maplibre";
import { SolidPolygonLayer } from "@deck.gl/layers";
import "maplibre-gl/dist/maplibre-gl.css";

import { useFloodState, useFloodActions } from "../context/FloodContext";
import { useSimulationState } from "../context/SimulationContext";
import { computeBounds, estimateZoom } from "../utils/mesh";
import { theme } from "../config/theme";
import { usePolygonDraw } from "../hooks/usePolygonDraw";
import { SimulationPanel } from "./SimulationPanel";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export function FloodMap() {
  /* ── Map Style State (NEW) ─────────────────── */
  const [useOsm, setUseOsm] = useState(false);

  /* ── Flood-viz state ───────────────────────── */
  const {
    dataset,
    triangles,
    precomputedColors,
    currentFrame,
    activeProperty,
    opacity,
  } = useFloodState();
  const { decodeFrame, setSelectedTriangle } = useFloodActions();

  /* ── Simulation state (for cursor) ─────────── */
  const { isDrawing } = useSimulationState();

  const [initialView, setInitialView] = useState(theme.defaultView);

  useEffect(() => {
    if (!dataset) return;
    const bounds = computeBounds(dataset.vertices);
    setInitialView({
      longitude: bounds.centerLng,
      latitude: bounds.centerLat,
      zoom: estimateZoom(bounds),
      pitch: 0,
      bearing: 0,
    } as any);
  }, [dataset]);

  /* ── Polygon drawing (reads from SimulationContext) ── */
  const {
    drawLayers,
    handleClick: drawClick,
    handleHover: drawHover,
  } = usePolygonDraw();

  /* ── Flood-triangle layer ──────────────────── */
  const floodLayers = useMemo(() => {
    if (!triangles || !precomputedColors) return [];
    const src = precomputedColors[activeProperty]?.[currentFrame];
    if (!src) return [];

    return [
      new SolidPolygonLayer({
        id: "flood-triangles",
        data: triangles,
        getPolygon: (d: any) => d,
        getFillColor: (_d: any, { index }: { index: number }) => {
          const off = index * 4;
          return [src[off], src[off + 1], src[off + 2], src[off + 3]];
        },
        updateTriggers: { getFillColor: [currentFrame, activeProperty] },
        opacity,
        pickable: !isDrawing,
        extruded: false,
        material: false,
        parameters: { depthTest: false },
        onClick: (info: any) => {
          if (info.index >= 0) setSelectedTriangle(info.index);
        },
      }),
    ];
  }, [
    triangles,
    precomputedColors,
    currentFrame,
    activeProperty,
    opacity,
    isDrawing,
    setSelectedTriangle,
  ]);

  /* ── Combined layers ───────────────────────── */
  const layers = useMemo(
    () => [...floodLayers, ...drawLayers],
    [floodLayers, drawLayers],
  );

  /* ── Tooltip ───────────────────────────────── */
  const renderTooltip = useCallback(
    ({ object, index, layer }: any) => {
      if (isDrawing) return null;
      if (layer?.id !== "flood-triangles") return null;
      if (object == null || index < 0 || !dataset) return null;
      const frame = decodeFrame(currentFrame);
      if (!frame) return null;
      const tri = dataset.triangles[index] as any;
      const val = activeProperty === "hazard" ? tri.depth[currentFrame] * tri.speed[currentFrame] : tri[activeProperty]?.[currentFrame];
      if (!val || val < 0.01) return null;
      return `${dataset.legend[activeProperty]?.label || activeProperty.toUpperCase()}\n${val.toFixed(2)}`;
    },
    [isDrawing, dataset, currentFrame, activeProperty, decodeFrame],
  );

  /* ── Cursor ────────────────────────────────── */
  const getCursor = useCallback(
    ({ isDragging }: { isDragging: boolean }) => {
      if (isDrawing) return "crosshair";
      if (isDragging) return "grabbing";
      return "grab";
    },
    [isDrawing],
  );

  /* ── Render ────────────────────────────────── */
  return (
    <div className="absolute inset-0 z-0">

      {/* NEW: Map Style Toggle Button (Visible only when dataset is loaded to avoid cluttering drop screen) */}
      {dataset && (
        <div className="absolute bottom-16 left-4 z-[1000]">
          <button
            onClick={() => setUseOsm(!useOsm)}
            className="
              panel flex items-center gap-2 px-3 py-2 
              rounded-md border transition-all duration-200 shadow-lg
              bg-[#0a0e17]/90 backdrop-blur-md text-xs font-medium text-white/80 
              hover:text-white border-white/10 hover:border-accent/40
            "
          >
            <span className="text-accent">{useOsm ? "🗺️" : "🌙"}</span>
            {useOsm ? "Switch to Dark Map" : "Switch to Street Map"}
          </button>
        </div>
      )}

      <DeckGL
        initialViewState={initialView}
        controller={{ doubleClickZoom: !isDrawing }}
        layers={layers}
        getTooltip={isDrawing ? undefined : renderTooltip}
        getCursor={getCursor}
        onClick={drawClick}
        onHover={drawHover}
      >
        {/* Toggle between OSM and Dark style based on state */}
        <Map
          mapStyle={useOsm ? theme.mapStyleOsm : theme.mapStyleDark}
          reuseMaps
        />
      </DeckGL>
      <SimulationPanel />
    </div>
  );
}

/* ─────────────────────────────────────────────
 *  FloodMap — DeckGL + custom polygon drawing
 *
 *  Drawing is handled by usePolygonDraw (pure DeckGL layers).
 *  No MapboxDraw, no nebula.gl, no pointer-events hacks.
 * ───────────────────────────────────────────── */

import { useMemo, useState, useEffect, useCallback } from "react";
import DeckGL from "@deck.gl/react";
import Map from "react-map-gl/maplibre";
import { SolidPolygonLayer } from "@deck.gl/layers";
import "maplibre-gl/dist/maplibre-gl.css";

import { useFloodState, useFloodActions } from "../context/FloodContext";
import { computeBounds, estimateZoom } from "../utils/mesh";
import { theme } from "../config/theme";
import { usePolygonDraw } from "../hooks/usePolygonDraw";
import {
  SimulationPanel,
  type SimulationParams,
} from "./SimulationPanel";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export function FloodMap() {
  /* ── Flood‑viz state ───────────────────────── */
  const {
    dataset,
    triangles,
    precomputedColors,
    currentFrame,
    activeProperty,
    opacity,
  } = useFloodState();
  const { decodeFrame, setSelectedTriangle } = useFloodActions();

  const [initialView, setInitialView] = useState(theme.defaultView);

  useEffect(() => {
    if (!dataset) return;
    const bounds = computeBounds(dataset.mesh.vertices);
    setInitialView({
      longitude: bounds.centerLng,
      latitude: bounds.centerLat,
      zoom: estimateZoom(bounds),
      pitch: 0,
      bearing: 0,
    } as any);
  }, [dataset]);

  /* ── Polygon drawing ───────────────────────── */
  const {
    state: drawState,
    actions: drawActions,
    drawLayers,
    handleClick: drawClick,
    handleHover: drawHover,
  } = usePolygonDraw();

  const { isDrawing } = drawState;

  /* ── Simulation stub ───────────────────────── */
  const handleRunSimulation = useCallback((params: SimulationParams) => {
    console.log("▶ Run simulation", params);
    // TODO: params.region is the GeoJSON FeatureCollection
  }, []);

  /* ── Flood‑triangle layer ──────────────────── */
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

  /* ── Combined layers: flood on bottom, draw on top ── */
  const layers = useMemo(
    () => [...floodLayers, ...drawLayers],
    [floodLayers, drawLayers],
  );

  /* ── Tooltip (flood only) ──────────────────── */
  const renderTooltip = useCallback(
    ({ object, index, layer }: any) => {
      if (isDrawing) return null;
      if (layer?.id !== "flood-triangles") return null;
      if (object == null || index < 0 || !dataset) return null;
      const frame = decodeFrame(currentFrame);
      if (!frame) return null;
      const ci = (frame[activeProperty] as Int8Array)?.[index];
      if (ci == null || ci < 0) return null;
      const legend = dataset.legend[activeProperty];
      const cls = legend?.classes[ci];
      return cls ? `${legend.label}\n${cls.min} – ${cls.max}` : null;
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
      <DeckGL
        initialViewState={initialView}
        controller={{ doubleClickZoom: !isDrawing }}
        layers={layers}
        getTooltip={isDrawing ? undefined : renderTooltip}
        getCursor={getCursor}
        onClick={drawClick}
        onHover={drawHover}
      >
        <Map mapStyle={theme.mapStyle} reuseMaps />
      </DeckGL>

      <SimulationPanel
        drawMode={isDrawing}
        onToggleDrawMode={() =>
          isDrawing ? drawActions.stopDrawing() : drawActions.startDrawing()
        }
        drawnFeatures={
          drawState.features.features.length > 0
            ? drawState.features
            : null
        }
        areaSqM={drawState.areaSqM}
        onClearDrawing={drawActions.clearAll}
        onRunSimulation={handleRunSimulation}
      />
    </div>
  );
}
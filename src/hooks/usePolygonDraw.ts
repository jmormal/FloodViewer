/* ─────────────────────────────────────────────
 *  usePolygonDraw — DeckGL drawing layers + handlers
 *
 *  Persistent state (features, selection, type)
 *  lives in SimulationContext.
 *
 *  Ephemeral state (in-progress points, cursor)
 *  stays local — no reason to persist them.
 * ───────────────────────────────────────────── */

import { useState, useCallback, useRef, useMemo } from "react";
import { PathLayer, ScatterplotLayer, SolidPolygonLayer } from "@deck.gl/layers";
import type { Feature, Polygon } from "geojson";
import {
  useSimulationState,
  useSimulationActions,
} from "../context/SimulationContext";
import {
  POLYGON_TYPES,
  defaultPropsForType,
} from "../config/polygonTypes";

/* ── Types ───────────────────────────────────── */
export type Coord = [number, number];

/* ── Config ──────────────────────────────────── */
const CLOSE_PX = 12;
const DBL_CLICK_MS = 300;
const MIN_VERTICES = 3;

/* ── Fallback colours ────────────────────────── */
const COL_FILL_CURSOR = [255, 255, 255, 12] as any;
const COL_VERTEX = [255, 255, 255, 255] as any;
const COL_VERTEX_RING = [251, 176, 59, 255] as any;
const COL_FIRST_PT = [59, 178, 208, 255] as any;
const COL_EDGE_ACTIVE = [251, 176, 59, 255] as any;
const COL_EDGE_SEL = [0, 220, 255, 255] as any;

/* ── Helpers ─────────────────────────────────── */

function typeColor(
  typeKey: string | undefined,
  which: "fill" | "stroke" | "fillSelected",
): any {
  const def = typeKey ? POLYGON_TYPES[typeKey] : undefined;
  if (def) return def.color[which];
  if (which === "fill") return [255, 107, 107, 30];
  if (which === "fillSelected") return [255, 107, 107, 60];
  return [255, 107, 107, 200];
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export function usePolygonDraw() {
  /* ── Context (persistent state) ────────────── */
  const simState = useSimulationState();
  const simActions = useSimulationActions();

  const {
    features,
    isDrawing,
    activeType,
    selectedFeatureIndex,
    selectedEdgeIndex,
  } = simState;

  /* ── Local ephemeral state ─────────────────── */
  const [points, setPoints] = useState<Coord[]>([]);
  const [cursor, setCursor] = useState<Coord | null>(null);
  const lastClickMs = useRef(0);

  /* ── Finish polygon → dispatch to context ──── */
  const finishPolygon = useCallback(
    (pts: Coord[], typeKey: string) => {
      if (pts.length < MIN_VERTICES) return;
      const ring = [...pts, pts[0]];
      const props = defaultPropsForType(typeKey);
      const feature: Feature<Polygon> = {
        type: "Feature",
        properties: { ...props, edges: [] },
        geometry: { type: "Polygon", coordinates: [ring] },
      };
      simActions.addFeature(feature);
      setPoints([]);
      setCursor(null);
    },
    [simActions],
  );

  /* ── Click handler ─────────────────────────── */
  const handleClick = useCallback(
    (info: any, _event: any) => {
      if (!isDrawing) {
        // Click on empty space → deselect
        if (
          !info.layer ||
          (info.layer.id !== "draw-completed-fill" &&
            info.layer.id !== "draw-active-edges" &&
            !info.layer.id.startsWith("edit-"))
        ) {
          simActions.setSelectedFeatureIndex(null);
          simActions.setSelectedEdgeIndex(null);
        }
      }
      if (!info.coordinate) return;

      const now = Date.now();
      const isDblClick = now - lastClickMs.current < DBL_CLICK_MS;
      lastClickMs.current = now;
      const coord: Coord = [info.coordinate[0], info.coordinate[1]];

      // Double-click → close
      if (isDblClick && points.length >= MIN_VERTICES) {
        return finishPolygon(points, activeType!);
      }

      // Close to first point → close
      if (points.length >= MIN_VERTICES) {
        const [sx, sy] = info.viewport?.project(points[0]) ?? [0, 0];
        const [cx, cy] = info.viewport?.project(coord) ?? [0, 0];
        if (Math.hypot(sx - cx, sy - cy) < CLOSE_PX) {
          return finishPolygon(points, activeType!);
        }
      }

      setPoints((prev) => [...prev, coord]);
    },
    [isDrawing, points, finishPolygon, activeType, simActions],
  );

  /* ── Hover handler ─────────────────────────── */
  const handleHover = useCallback(
    (info: any) => {
      if (!isDrawing || !info.coordinate) return setCursor(null);
      setCursor([info.coordinate[0], info.coordinate[1]]);
    },
    [isDrawing],
  );

  /* ── Cancel drawing: also clear local state ── */
  const stopDrawing = useCallback(() => {
    simActions.stopDrawing();
    setPoints([]);
    setCursor(null);
  }, [simActions]);

  /* ── Edge segments for selected polygon ────── */
  const selectedTypeDef = useMemo(() => {
    if (selectedFeatureIndex === null || !features.features[selectedFeatureIndex])
      return null;
    const typeKey = features.features[selectedFeatureIndex].properties?._type;
    return typeKey ? POLYGON_TYPES[typeKey] : null;
  }, [features, selectedFeatureIndex]);

  const hasEdgeEditing = selectedTypeDef?.edgeProperties != null;

  const activeEdges = useMemo(() => {
    if (!hasEdgeEditing || selectedFeatureIndex === null) return [];
    const feat = features.features[selectedFeatureIndex];
    if (!feat) return [];
    const ring = feat.geometry.coordinates[0];
    return ring.slice(0, -1).map((pt: any, i: number) => ({
      polyIdx: selectedFeatureIndex,
      edgeIdx: i,
      path: [pt, ring[i + 1]],
    }));
  }, [features, selectedFeatureIndex, hasEdgeEditing]);

  /* ── DeckGL Layers ─────────────────────────── */
  const drawLayers = useMemo(() => {
    const result: any[] = [];

    /* ─ Completed polygons ─ */
    if (features.features.length > 0) {
      result.push(
        new SolidPolygonLayer({
          id: "draw-completed-fill",
          data: features.features,
          getPolygon: (d: any) => d.geometry.coordinates[0],
          getFillColor: (d: any, { index }: { index: number }) =>
            index === selectedFeatureIndex
              ? typeColor(d.properties?._type, "fillSelected")
              : typeColor(d.properties?._type, "fill"),
          pickable: !isDrawing,
          autoHighlight: !isDrawing,
          highlightColor: [255, 255, 255, 20],
          onClick: (info: any) => {
            if (info.index !== -1) {
              simActions.setSelectedFeatureIndex(info.index);
              return true;
            }
          },
          updateTriggers: { getFillColor: [selectedFeatureIndex] },
          parameters: { depthTest: false },
        }),
      );

      result.push(
        new PathLayer({
          id: "draw-completed-borders",
          data: features.features,
          getPath: (d: any) => d.geometry.coordinates[0],
          getColor: (d: any) => typeColor(d.properties?._type, "stroke"),
          getWidth: 2,
          widthUnits: "pixels" as const,
          pickable: false,
          parameters: { depthTest: false },
        }),
      );
    }

    /* ─ Edge editing for selected polygon ─ */
    if (activeEdges.length > 0 && !isDrawing) {
      result.push(
        new PathLayer({
          id: "draw-active-edges",
          data: activeEdges,
          getPath: (d: any) => d.path,
          getColor: (d: any) =>
            d.edgeIdx === selectedEdgeIndex ? COL_EDGE_SEL : COL_EDGE_ACTIVE,
          getWidth: (d: any) =>
            d.edgeIdx === selectedEdgeIndex ? 6 : 4,
          widthUnits: "pixels" as const,
          widthMinPixels: 10,
          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 255, 255, 255],
          onClick: (info: any) => {
            if (info.object) {
              simActions.setSelectedEdgeIndex(info.object.edgeIdx);
              return true;
            }
          },
          updateTriggers: {
            getColor: [selectedEdgeIndex],
            getWidth: [selectedEdgeIndex],
          },
          parameters: { depthTest: false },
        }),
      );
    }

    /* ─ In-progress drawing ─ */
    if (isDrawing && points.length > 0) {
      const strokeCol = activeType
        ? typeColor(activeType, "stroke")
        : [255, 107, 107, 150];

      const pathCoords = cursor ? [...points, cursor] : [...points];

      if (pathCoords.length >= 2) {
        result.push(
          new PathLayer({
            id: "draw-progress-line",
            data: [pathCoords],
            getPath: (d: any) => d,
            getColor: strokeCol,
            getWidth: 2,
            widthUnits: "pixels" as const,
            getDashArray: [6, 4],
            dashJustified: true,
            pickable: false,
            parameters: { depthTest: false },
          }),
        );
      }

      if (points.length >= MIN_VERTICES && cursor) {
        result.push(
          new PathLayer({
            id: "draw-close-hint",
            data: [[cursor, points[0]]],
            getPath: (d: any) => d,
            getColor: [...strokeCol.slice(0, 3), 80],
            getWidth: 1,
            widthUnits: "pixels" as const,
            pickable: false,
            parameters: { depthTest: false },
          }),
        );
        result.push(
          new SolidPolygonLayer({
            id: "draw-progress-fill",
            data: [[...points, cursor, points[0]]],
            getPolygon: (d: any) => d,
            getFillColor: COL_FILL_CURSOR,
            pickable: false,
            parameters: { depthTest: false },
          }),
        );
      }

      result.push(
        new ScatterplotLayer({
          id: "draw-vertices",
          data: points,
          getPosition: (d: Coord) => d,
          getFillColor: (_d: any, { index }: { index: number }) =>
            index === 0 ? COL_FIRST_PT : COL_VERTEX,
          getLineColor: COL_VERTEX_RING,
          getRadius: (_d: any, { index }: { index: number }) =>
            index === 0 ? 6 : 4,
          lineWidthMinPixels: 2,
          stroked: true,
          radiusUnits: "pixels" as const,
          pickable: false,
          parameters: { depthTest: false },
        }),
      );
    }

    return result;
  }, [
    features,
    isDrawing,
    activeType,
    points,
    cursor,
    activeEdges,
    selectedFeatureIndex,
    selectedEdgeIndex,
    simActions,
  ]);

  return {
    drawLayers,
    handleClick,
    handleHover,
    /** Wraps simActions.stopDrawing + clears local points/cursor */
    stopDrawing,
  };
}

/* ─────────────────────────────────────────────
 *  usePolygonDraw — lightweight polygon drawing with pure DeckGL layers
 * ───────────────────────────────────────────── */

import { useState, useCallback, useRef, useMemo } from "react";
import { PathLayer, ScatterplotLayer, SolidPolygonLayer } from "@deck.gl/layers";
import * as turf from "@turf/turf";
import type { FeatureCollection, Feature, Polygon } from "geojson";

/* ── Types ───────────────────────────────────── */
export type Coord = [number, number];

export interface SelectedEdge {
  polyIdx: number;
  edgeIdx: number;
}

export interface DrawState {
  features: FeatureCollection;
  isDrawing: boolean;
  areaSqM: number | null;
  selectedEdge: SelectedEdge | null;
}

export interface DrawActions {
  startDrawing: () => void;
  stopDrawing: () => void;
  clearAll: () => void;
  setSelectedEdge: (edge: SelectedEdge | null) => void;
  updateEdgeProperties: (polyIdx: number, edgeIdx: number, properties: any) => void;
}

/* ── Config ──────────────────────────────────── */
const CLOSE_PX = 12;
const DBL_CLICK_MS = 300;
const MIN_VERTICES = 3;

/* ── Colours ─────────────────────────────────── */
const COL_FILL = [255, 107, 107, 30] as any;
const COL_STROKE = [255, 107, 107, 150] as any;
const COL_STROKE_SEL = [0, 220, 255, 255] as any; // Cyan for selected edge
const COL_FILL_CURSOR = [255, 107, 107, 12] as any;
const COL_VERTEX = [255, 255, 255, 255] as any;
const COL_VERTEX_RING = [251, 176, 59, 255] as any;
const COL_FIRST_PT = [59, 178, 208, 255] as any;

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export function usePolygonDraw() {
  /* ── State ─────────────────────────────────── */
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<Coord[]>([]);
  const [cursor, setCursor] = useState<Coord | null>(null);
  const [features, setFeatures] = useState<FeatureCollection>({
    type: "FeatureCollection",
    features: [],
  });
  const [areaSqM, setAreaSqM] = useState<number | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<SelectedEdge | null>(null);

  const lastClickMs = useRef(0);

  /* ── Helpers ───────────────────────────────── */
  const recalcArea = useCallback((fc: FeatureCollection) => {
    if (fc.features.length === 0) setAreaSqM(null);
    else setAreaSqM(Math.round(turf.area(fc) * 100) / 100);
  }, []);

  const finishPolygon = useCallback(
    (pts: Coord[]) => {
      if (pts.length < MIN_VERTICES) return;
      const ring = [...pts, pts[0]];
      const feature: Feature<Polygon> = {
        type: "Feature",
        // We'll store individual edge attributes in this array
        properties: { edges: [] },
        geometry: { type: "Polygon", coordinates: [ring] },
      };
      setFeatures((prev) => {
        const next: FeatureCollection = {
          type: "FeatureCollection",
          features: [...prev.features, feature],
        };
        recalcArea(next);
        return next;
      });
      setPoints([]);
      setIsDrawing(false);
    },
    [recalcArea],
  );

  /* ── Public actions ────────────────────────── */
  const startDrawing = useCallback(() => {
    setPoints([]);
    setCursor(null);
    setIsDrawing(true);
    setSelectedEdge(null);
  }, []);

  const stopDrawing = useCallback(() => {
    setPoints([]);
    setCursor(null);
    setIsDrawing(false);
  }, []);

  const clearAll = useCallback(() => {
    setFeatures({ type: "FeatureCollection", features: [] });
    setPoints([]);
    setCursor(null);
    setAreaSqM(null);
    setIsDrawing(false);
    setSelectedEdge(null);
  }, []);

  const updateEdgeProperties = useCallback((polyIdx: number, edgeIdx: number, newProps: any) => {
    setFeatures((prev) => {
      const nextFeatures = [...prev.features];
      const poly = nextFeatures[polyIdx];

      // Ensure the edges array exists and copy it
      const edges = poly.properties?.edges ? [...poly.properties.edges] : [];
      // Merge new properties into the specific edge index
      edges[edgeIdx] = { ...(edges[edgeIdx] || {}), ...newProps };

      nextFeatures[polyIdx] = {
        ...poly,
        properties: { ...poly.properties, edges }
      };
      return { ...prev, features: nextFeatures };
    });
  }, []);

  /* ── Deck event handlers ───────────────────── */
  const handleClick = useCallback(
    (info: any, event: any) => {
      if (!isDrawing) {
        // Unselect if we click on the basemap or empty space
        if (!info.layer || info.layer.id !== "draw-completed-edges") {
          setSelectedEdge(null);
        }
        return;
      }
      if (!info.coordinate) return;

      const now = Date.now();
      const isDblClick = now - lastClickMs.current < DBL_CLICK_MS;
      lastClickMs.current = now;

      const coord: Coord = [info.coordinate[0], info.coordinate[1]];

      if (isDblClick && points.length >= MIN_VERTICES) {
        finishPolygon(points);
        return;
      }

      if (points.length >= MIN_VERTICES) {
        const [sx, sy] = info.viewport?.project(points[0]) ?? [0, 0];
        const [cx, cy] = info.viewport?.project(coord) ?? [0, 0];
        const dist = Math.hypot(sx - cx, sy - cy);
        if (dist < CLOSE_PX) {
          finishPolygon(points);
          return;
        }
      }

      setPoints((prev) => [...prev, coord]);
    },
    [isDrawing, points, finishPolygon],
  );

  const handleHover = useCallback(
    (info: any) => {
      if (!isDrawing || !info.coordinate) {
        setCursor(null);
        return;
      }
      setCursor([info.coordinate[0], info.coordinate[1]]);
    },
    [isDrawing],
  );

  /* ── Geometry prep ─────────────────────────── */
  // Extract individual edges from all polygons to render them separately
  const edgeSegments = useMemo(() => {
    const segments: any[] = [];
    features.features.forEach((poly: any, polyIdx: number) => {
      const ring = poly.geometry.coordinates[0];
      for (let i = 0; i < ring.length - 1; i++) {
        segments.push({
          polyIdx,
          edgeIdx: i,
          path: [ring[i], ring[i + 1]],
        });
      }
    });
    return segments;
  }, [features]);

  /* ── Layers ────────────────────────────────── */
  const drawLayers = useMemo(() => {
    const result: any[] = [];

    if (features.features.length > 0) {
      // 1. Fill (Unpickable)
      result.push(
        new SolidPolygonLayer({
          id: "draw-completed-fill",
          data: features.features,
          getPolygon: (d: any) => d.geometry.coordinates[0],
          getFillColor: COL_FILL,
          pickable: false,
          parameters: { depthTest: false },
        }),
      );

      // 2. Individual Edges (Pickable!)
      result.push(
        new PathLayer({
          id: "draw-completed-edges",
          data: edgeSegments,
          getPath: (d: any) => d.path,
          getColor: (d: any) =>
            (selectedEdge?.polyIdx === d.polyIdx && selectedEdge?.edgeIdx === d.edgeIdx)
              ? COL_STROKE_SEL
              : COL_STROKE,
          getWidth: (d: any) =>
            (selectedEdge?.polyIdx === d.polyIdx && selectedEdge?.edgeIdx === d.edgeIdx)
              ? 5
              : 2,
          widthUnits: "pixels" as const,
          pickable: !isDrawing,
          autoHighlight: !isDrawing,
          onClick: (info: any) => {
            if (info.object) {
              setSelectedEdge({ polyIdx: info.object.polyIdx, edgeIdx: info.object.edgeIdx });
              return true;
            }
          },
          updateTriggers: {
            getColor: [selectedEdge],
            getWidth: [selectedEdge],
          },
          parameters: { depthTest: false },
        }),
      );
    }

    if (isDrawing && points.length > 0) {
      const pathCoords = cursor ? [...points, cursor] : [...points];
      if (pathCoords.length >= 2) {
        result.push(
          new PathLayer({
            id: "draw-progress-line",
            data: [pathCoords],
            getPath: (d: any) => d,
            getColor: COL_STROKE,
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
            getColor: [255, 107, 107, 80],
            getWidth: 1,
            widthUnits: "pixels" as const,
            pickable: false,
            parameters: { depthTest: false },
          }),
        );
      }

      if (points.length >= MIN_VERTICES && cursor) {
        const previewRing = [...points, cursor, points[0]];
        result.push(
          new SolidPolygonLayer({
            id: "draw-progress-fill",
            data: [previewRing],
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
  }, [features, isDrawing, points, cursor, edgeSegments, selectedEdge]);

  /* ── Return ────────────────────────────────── */
  return {
    state: { features, isDrawing, areaSqM, selectedEdge } as DrawState,
    actions: { startDrawing, stopDrawing, clearAll, setSelectedEdge, updateEdgeProperties } as DrawActions,
    drawLayers,
    handleClick,
    handleHover,
  };
}

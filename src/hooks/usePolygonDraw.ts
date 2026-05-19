/* ─────────────────────────────────────────────
 *  usePolygonDraw — lightweight polygon drawing with pure DeckGL layers
 *
 *  No external drawing library needed. Tracks click positions,
 *  renders guides, closes on double-click or click-near-first-point.
 * ───────────────────────────────────────────── */

import { useState, useCallback, useRef, useMemo } from "react";
import { PathLayer, ScatterplotLayer, SolidPolygonLayer } from "@deck.gl/layers";
import * as turf from "@turf/turf";
import type { FeatureCollection, Feature, Polygon } from "geojson";

/* ── Types ───────────────────────────────────── */
export type Coord = [number, number];

export interface DrawState {
  /** Completed polygons as GeoJSON */
  features: FeatureCollection;
  /** Whether the user is actively placing vertices */
  isDrawing: boolean;
  /** Total area of completed polygons in m² */
  areaSqM: number | null;
}

export interface DrawActions {
  /** Enter polygon-drawing mode */
  startDrawing: () => void;
  /** Exit drawing mode (keeps completed polygons) */
  stopDrawing: () => void;
  /** Delete all completed polygons */
  clearAll: () => void;
}

/* ── Config ──────────────────────────────────── */
const CLOSE_PX = 12;           // pixel radius to snap-close on first vertex
const DBL_CLICK_MS = 300;      // max ms between clicks to count as double-click
const MIN_VERTICES = 3;        // minimum points to form a polygon

/* ── Colours ─────────────────────────────────── */
const COL_FILL        = [255, 107, 107, 30]  as any;
const COL_STROKE      = [255, 107, 107, 200] as any;
const COL_FILL_CURSOR = [255, 107, 107, 12]  as any;
const COL_VERTEX      = [255, 255, 255, 255]  as any;
const COL_VERTEX_RING = [251, 176, 59, 255]   as any;
const COL_FIRST_PT    = [59, 178, 208, 255]   as any;

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

  const lastClickMs = useRef(0);

  /* ── Helpers ───────────────────────────────── */
  const recalcArea = useCallback((fc: FeatureCollection) => {
    if (fc.features.length === 0) {
      setAreaSqM(null);
    } else {
      setAreaSqM(Math.round(turf.area(fc) * 100) / 100);
    }
  }, []);

  const finishPolygon = useCallback(
    (pts: Coord[]) => {
      if (pts.length < MIN_VERTICES) return;
      const ring = [...pts, pts[0]]; // close the ring
      const feature: Feature<Polygon> = {
        type: "Feature",
        properties: {},
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
  }, []);

  /* ── Deck event handlers ───────────────────── */

  /**
   * Call from <DeckGL onClick={handleClick}>
   * `info.coordinate` is [lng, lat]; `event` is the native PointerEvent.
   */
  const handleClick = useCallback(
    (info: any, event: any) => {
      if (!isDrawing || !info.coordinate) return;

      const now = Date.now();
      const isDblClick = now - lastClickMs.current < DBL_CLICK_MS;
      lastClickMs.current = now;

      const coord: Coord = [info.coordinate[0], info.coordinate[1]];

      if (isDblClick && points.length >= MIN_VERTICES) {
        finishPolygon(points);
        return;
      }

      // Snap-close: click near first point
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

  /**
   * Call from <DeckGL onHover={handleHover}>
   * Tracks cursor position so we can draw the tentative closing line.
   */
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

  /* ── Layers ────────────────────────────────── */
  const drawLayers = useMemo(() => {
    const result: any[] = [];

    /* Completed polygons — fill + outline */
    if (features.features.length > 0) {
      const polys = features.features.map(
        (f: any) => f.geometry.coordinates[0],
      );
      result.push(
        new SolidPolygonLayer({
          id: "draw-completed-fill",
          data: polys,
          getPolygon: (d: any) => d,
          getFillColor: COL_FILL,
          getLineColor: COL_STROKE,
          lineWidthMinPixels: 2,
          pickable: false,
          parameters: { depthTest: false },
        }),
      );
      // Outline on top
      result.push(
        new PathLayer({
          id: "draw-completed-outline",
          data: polys,
          getPath: (d: any) => d,
          getColor: COL_STROKE,
          getWidth: 2,
          widthUnits: "pixels" as const,
          pickable: false,
          parameters: { depthTest: false },
        }),
      );
    }

    /* In-progress polygon */
    if (isDrawing && points.length > 0) {
      // Line connecting placed points + cursor
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
            extensions: [], // add PathStyleExtension if you want real dashes
            pickable: false,
            parameters: { depthTest: false },
          }),
        );
      }

      // Tentative closing line (last point / cursor → first point)
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

      // Tentative fill preview
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

      // Vertex dots
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
  }, [features, isDrawing, points, cursor]);

  /* ── Return ────────────────────────────────── */
  return {
    state: { features, isDrawing, areaSqM } as DrawState,
    actions: { startDrawing, stopDrawing, clearAll } as DrawActions,
    /** Spread into your layers array: [...floodLayers, ...drawLayers] */
    drawLayers,
    /** Attach to <DeckGL onClick={...}> */
    handleClick,
    /** Attach to <DeckGL onHover={...}> */
    handleHover,
  };
}
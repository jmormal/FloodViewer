/* ─────────────────────────────────────────────
 *  usePolygonEdit — vertex editing for drawn polygons
 *
 *  Persistent state (isEditing, geometry) lives in
 *  SimulationContext. Ephemeral state (which vertex
 *  is being dragged) stays local.
 *
 *  Interactions:
 *  - Drag a white vertex      → move it
 *  - Click an amber midpoint  → split the edge (new vertex)
 *  - Alt+click a vertex       → delete it (min 3 kept)
 * ───────────────────────────────────────────── */

import { useMemo, useRef, useState, useCallback } from "react";
import { ScatterplotLayer, PathLayer } from "@deck.gl/layers";
import {
  useSimulationState,
  useSimulationActions,
} from "../context/SimulationContext";
import { POLYGON_TYPES } from "../config/polygonTypes";

type Coord = [number, number];

const COL_VERTEX = [255, 255, 255, 255] as any;
const COL_VERTEX_DRAG = [0, 220, 255, 255] as any;
const COL_MIDPOINT = [251, 176, 59, 220] as any;

export function usePolygonEdit() {
  const { features, isEditing, selectedFeatureIndex } = useSimulationState();
  const actions = useSimulationActions();

  /* Local ephemeral drag state (ref avoids stale closures mid-drag) */
  const [dragVertex, setDragVertex] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);

  const feature =
    isEditing && selectedFeatureIndex !== null
      ? features.features[selectedFeatureIndex]
      : null;

  const ring: Coord[] | null =
    (feature?.geometry as any)?.coordinates?.[0] ?? null;

  const strokeColor = useMemo(() => {
    const typeKey = feature?.properties?._type as string | undefined;
    return typeKey && POLYGON_TYPES[typeKey]
      ? POLYGON_TYPES[typeKey].color.stroke
      : ([255, 107, 107, 200] as any);
  }, [feature]);

  /* Unique vertices (ring is closed: last === first) */
  const vertices = useMemo(
    () => (ring ? ring.slice(0, -1).map((c, i) => ({ i, position: c })) : []),
    [ring],
  );

  /* Midpoints of each edge — clicking one inserts a vertex there */
  const midpoints = useMemo(() => {
    if (!ring) return [];
    return ring.slice(0, -1).map((c, i) => ({
      edgeIdx: i,
      position: [
        (c[0] + ring[i + 1][0]) / 2,
        (c[1] + ring[i + 1][1]) / 2,
      ] as Coord,
    }));
  }, [ring]);

  /* ── Drag handlers ─────────────────────────── */

  const onVertexDragStart = useCallback((info: any) => {
    if (!info.object) return false;
    dragRef.current = info.object.i;
    setDragVertex(info.object.i);
    return true; // consume — don't pan the map
  }, []);

  const onVertexDrag = useCallback(
    (info: any) => {
      if (dragRef.current === null || !info.coordinate) return false;
      actions.moveVertex(selectedFeatureIndex!, dragRef.current, [
        info.coordinate[0],
        info.coordinate[1],
      ]);
      return true;
    },
    [actions, selectedFeatureIndex],
  );

  const onVertexDragEnd = useCallback(() => {
    dragRef.current = null;
    setDragVertex(null);
    return true;
  }, []);

  /* ── Layers ────────────────────────────────── */

  const editLayers = useMemo(() => {
    if (!isEditing || !ring || selectedFeatureIndex === null) return [];

    return [
      /* Highlight ring of the polygon being edited */
      new PathLayer({
        id: "edit-outline",
        data: [ring],
        getPath: (d: any) => d,
        getColor: strokeColor,
        getWidth: 3,
        widthUnits: "pixels" as const,
        getDashArray: [4, 3],
        dashJustified: true,
        pickable: false,
        parameters: { depthTest: false },
      }),

      /* Midpoints — click to split an edge */
      new ScatterplotLayer({
        id: "edit-midpoints",
        data: midpoints,
        getPosition: (d: any) => d.position,
        getFillColor: COL_MIDPOINT,
        getLineColor: [255, 255, 255, 200],
        getRadius: 4,
        radiusUnits: "pixels" as const,
        stroked: true,
        lineWidthMinPixels: 1,
        pickable: true,
        autoHighlight: true,
        onClick: (info: any) => {
          if (!info.object) return false;
          actions.insertVertex(
            selectedFeatureIndex,
            info.object.edgeIdx,
            info.object.position,
          );
          return true;
        },
        parameters: { depthTest: false },
      }),

      /* Vertices — drag to move, Alt+click to delete */
      new ScatterplotLayer({
        id: "edit-vertices",
        data: vertices,
        getPosition: (d: any) => d.position,
        getFillColor: (d: any) =>
          d.i === dragVertex ? COL_VERTEX_DRAG : COL_VERTEX,
        getLineColor: strokeColor,
        getRadius: (d: any) => (d.i === dragVertex ? 8 : 6),
        radiusUnits: "pixels" as const,
        stroked: true,
        lineWidthMinPixels: 2,
        pickable: true,
        autoHighlight: true,
        onClick: (info: any, event: any) => {
          if (!info.object) return false;
          if (event?.srcEvent?.altKey) {
            actions.deleteVertex(selectedFeatureIndex, info.object.i);
          }
          return true; // consume so the map-level click doesn't deselect
        },
        onDragStart: onVertexDragStart,
        onDrag: onVertexDrag,
        onDragEnd: onVertexDragEnd,
        updateTriggers: {
          getFillColor: [dragVertex],
          getRadius: [dragVertex],
        },
        parameters: { depthTest: false },
      }),
    ];
  }, [
    isEditing,
    ring,
    vertices,
    midpoints,
    selectedFeatureIndex,
    strokeColor,
    dragVertex,
    actions,
    onVertexDragStart,
    onVertexDrag,
    onVertexDragEnd,
  ]);

  return {
    editLayers,
    /** Disable map panning while true */
    isDraggingVertex: dragVertex !== null,
  };
}

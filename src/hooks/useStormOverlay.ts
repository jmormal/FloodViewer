/* ─────────────────────────────────────────────
 *  useStormOverlay — renders every placed storm's
 *  accumulated-rainfall bitmap, and a move/resize/rotate
 *  gizmo for whichever storm feature is currently selected.
 *
 *  Modeled on FloodMap.tsx's weather-overlay gizmo (same
 *  BitmapLayer + PathLayer + ScatterplotLayer construction,
 *  same onDragStart/onDrag/onDragEnd routing by layer id),
 *  but split into its own hook — FloodMap.tsx is already
 *  large, and this concern (persisted feature, selection-
 *  gated, committed via updateFeatureProperty) is different
 *  enough from weather's ephemeral debug overlay that sharing
 *  code would mean threading through more flags than it saves.
 * ───────────────────────────────────────────── */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BitmapLayer, ScatterplotLayer, PathLayer } from "@deck.gl/layers";
import {
  useSimulationState,
  useSimulationActions,
} from "../context/SimulationContext";
import type { StormPlacement } from "../utils/stormPlacement";
import {
  fetchStormBitmap,
  stormBitmapCorners,
  type StormBitmap,
} from "../utils/stormPreview";
import {
  transformCenter,
  transformRotationHandle,
  transformResizeHandles,
} from "../utils/weather";

type DragMode =
  | null
  | { kind: "move"; startLng: number; startLat: number; origCenterLng: number; origCenterLat: number }
  | { kind: "resize"; corner: number }
  | { kind: "rotate" };

export function useStormOverlay() {
  const { features, selectedFeatureIndex } = useSimulationState();
  const actions = useSimulationActions();

  const stormFeatures = useMemo(
    () =>
      features.features
        .map((f, idx) => ({ f, idx }))
        .filter(({ f }) => f.properties?._type === "storm"),
    [features.features],
  );

  const selected =
    selectedFeatureIndex !== null &&
    features.features[selectedFeatureIndex]?.properties?._type === "storm"
      ? { f: features.features[selectedFeatureIndex], idx: selectedFeatureIndex }
      : null;

  /* ── Bitmap cache, keyed by storm_ref (several features can share one) ── */
  const [bitmaps, setBitmaps] = useState<Record<string, StormBitmap>>({});
  const fetchingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const { f } of stormFeatures) {
      const ref = f.properties?.storm_ref as string | undefined;
      if (!ref || bitmaps[ref] || fetchingRef.current.has(ref)) continue;
      fetchingRef.current.add(ref);
      fetchStormBitmap(ref)
        .then((bmp) => setBitmaps((prev) => ({ ...prev, [ref]: bmp })))
        .catch((e) => console.error("Storm preview fetch failed:", e))
        .finally(() => fetchingRef.current.delete(ref));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stormFeatures]);

  /* ── Live drag transform for the selected storm ─────────────────────── */
  const [dragTransform, setDragTransform] = useState<StormPlacement | null>(null);
  const dragRef = useRef<DragMode>(null);
  const [dragging, setDragging] = useState(false);
  const syncedIdxRef = useRef<number | null>(null);

  // Re-sync local transform from the feature only when the selection changes
  // to a (different) storm — not on every render — so a live drag isn't
  // clobbered by the feature's own (not-yet-updated) placement.
  useEffect(() => {
    if (!selected) {
      syncedIdxRef.current = null;
      setDragTransform(null);
      return;
    }
    if (syncedIdxRef.current !== selected.idx) {
      syncedIdxRef.current = selected.idx;
      setDragTransform(selected.f.properties!.placement as StormPlacement);
    }
  }, [selected]);

  const onDragStart = useCallback(
    (info: any, event: any) => {
      if (!selected || !dragTransform || !info.coordinate) return false;
      const [lng, lat] = info.coordinate;

      const layerId: string | undefined = info.layer?.id;
      if (layerId === "storm-rotate-handle") {
        dragRef.current = { kind: "rotate" };
      } else if (layerId === "storm-resize-handles" && info.object) {
        dragRef.current = { kind: "resize", corner: info.object.corner };
      } else if (
        layerId === `storm-raster-${selected.idx}` ||
        layerId === "storm-gizmo-outline" ||
        layerId === "storm-center-handle"
      ) {
        dragRef.current = {
          kind: "move",
          startLng: lng,
          startLat: lat,
          origCenterLng: dragTransform.centerLng,
          origCenterLat: dragTransform.centerLat,
        };
      } else {
        return false;
      }
      setDragging(true);
      event?.stopPropagation?.();
      return true; // consume → don't pan the map
    },
    [selected, dragTransform],
  );

  const onDrag = useCallback(
    (info: any, event: any) => {
      const mode = dragRef.current;
      if (!mode || !dragTransform || !info.coordinate) return false;
      const [lng, lat] = info.coordinate;
      event?.stopPropagation?.();

      if (mode.kind === "move") {
        setDragTransform({
          ...dragTransform,
          centerLng: mode.origCenterLng + (lng - mode.startLng),
          centerLat: mode.origCenterLat + (lat - mode.startLat),
        });
      } else if (mode.kind === "resize") {
        const dx = lng - dragTransform.centerLng;
        const dy = lat - dragTransform.centerLat;
        const rad = (-dragTransform.rotationDeg * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const localX = dx * cos + dy * sin;
        const localY = -dx * sin + dy * cos;
        setDragTransform({
          ...dragTransform,
          halfW: Math.max(0.0005, Math.abs(localX)),
          halfH: Math.max(0.0005, Math.abs(localY)),
        });
      } else if (mode.kind === "rotate") {
        const dx = lng - dragTransform.centerLng;
        const dy = lat - dragTransform.centerLat;
        const angle = (Math.atan2(dx, dy) * 180) / Math.PI;
        setDragTransform({ ...dragTransform, rotationDeg: angle });
      }
      return true;
    },
    [dragTransform],
  );

  const onDragEnd = useCallback(() => {
    if (dragRef.current && selected && dragTransform) {
      actions.updateFeatureProperty(selected.idx, "placement", dragTransform);
    }
    dragRef.current = null;
    setDragging(false);
    return true;
  }, [selected, dragTransform, actions]);

  /* ── Layers ───────────────────────────────────────────────────────── */
  const layers = useMemo(() => {
    const result: any[] = [];

    for (const { f, idx } of stormFeatures) {
      const ref = f.properties?.storm_ref as string | undefined;
      const bmp = ref ? bitmaps[ref] : undefined;
      if (!bmp) continue;

      const isSelected = selected?.idx === idx;
      const placement: StormPlacement =
        isSelected && dragTransform
          ? dragTransform
          : (f.properties!.placement as StormPlacement);

      result.push(
        new BitmapLayer({
          id: `storm-raster-${idx}`,
          image: bmp.image,
          bounds: stormBitmapCorners(placement) as any,
          opacity: 0.65,
          // Always pickable (not just when selected) so a deselected storm
          // can be clicked again to bring its gizmo back.
          pickable: true,
          parameters: { depthTest: false },
          onClick: () => {
            actions.setSelectedFeatureIndex(idx);
            return true;
          },
          onDragStart,
          onDrag,
          onDragEnd,
          textureParameters: { minFilter: "nearest", magFilter: "nearest" },
        }),
      );

      if (isSelected && dragTransform) {
        const corners = stormBitmapCorners(dragTransform);
        const ring = [...corners, corners[0]];
        const center = transformCenter(dragTransform);
        const rotHandle = transformRotationHandle(dragTransform);
        const resizeHandles = transformResizeHandles(dragTransform);

        result.push(
          new PathLayer({
            id: "storm-gizmo-outline",
            data: [ring],
            getPath: (d: any) => d,
            getColor: [94, 187, 255, 230],
            getWidth: 2,
            widthUnits: "pixels" as const,
            pickable: true,
            parameters: { depthTest: false },
            onDragStart,
            onDrag,
            onDragEnd,
          }),
          new PathLayer({
            id: "storm-rotate-stem",
            data: [[center, rotHandle]],
            getPath: (d: any) => d,
            getColor: [94, 187, 255, 160],
            getWidth: 1.5,
            widthUnits: "pixels" as const,
            pickable: false,
            parameters: { depthTest: false },
          }),
          new ScatterplotLayer({
            id: "storm-center-handle",
            data: [{ position: center }],
            getPosition: (d: any) => d.position,
            getFillColor: [94, 187, 255, 220],
            getLineColor: [255, 255, 255, 230],
            getRadius: 6,
            radiusUnits: "pixels" as const,
            stroked: true,
            lineWidthMinPixels: 2,
            pickable: true,
            parameters: { depthTest: false },
            onDragStart,
            onDrag,
            onDragEnd,
          }),
          new ScatterplotLayer({
            id: "storm-resize-handles",
            data: resizeHandles,
            getPosition: (d: any) => d.position,
            getFillColor: [255, 255, 255, 240],
            getLineColor: [94, 187, 255, 240],
            getRadius: 6,
            radiusUnits: "pixels" as const,
            stroked: true,
            lineWidthMinPixels: 2,
            pickable: true,
            autoHighlight: true,
            parameters: { depthTest: false },
            onDragStart,
            onDrag,
            onDragEnd,
          }),
          new ScatterplotLayer({
            id: "storm-rotate-handle",
            data: [{ position: rotHandle }],
            getPosition: (d: any) => d.position,
            getFillColor: [251, 176, 59, 240],
            getLineColor: [255, 255, 255, 240],
            getRadius: 7,
            radiusUnits: "pixels" as const,
            stroked: true,
            lineWidthMinPixels: 2,
            pickable: true,
            autoHighlight: true,
            parameters: { depthTest: false },
            onDragStart,
            onDrag,
            onDragEnd,
          }),
        );
      }
    }

    return result;
  }, [stormFeatures, bitmaps, selected, dragTransform, onDragStart, onDrag, onDragEnd, actions]);

  return {
    stormLayers: layers,
    /** True while a storm feature is selected — gates map interactions the same way the weather transform mode does. */
    isStormActive: selected !== null,
    /** True mid-drag — disable map pan / other picking, like isDraggingVertex. */
    isDraggingStorm: dragging,
  };
}

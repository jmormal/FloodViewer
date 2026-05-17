/* ─────────────────────────────────────────────
 *  FloodMap — DeckGL + precomputed color buffers
 * ───────────────────────────────────────────── */

import { useMemo, useState, useEffect } from "react";
import DeckGL from "@deck.gl/react";
import Map from "react-map-gl/maplibre";
import { SolidPolygonLayer } from "@deck.gl/layers";
import "maplibre-gl/dist/maplibre-gl.css";

import { useFloodState, useFloodActions } from "../context/FloodContext";
import { computeBounds, estimateZoom } from "../utils/mesh";
import { theme } from "../config/theme";

export function FloodMap() {
  const {
    dataset, triangles, precomputedColors,
    currentFrame, activeProperty, opacity,
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

  const layers = useMemo(() => {
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
        updateTriggers: {
          getFillColor: [currentFrame, activeProperty],
        },
        opacity: opacity,
        pickable: true,
        extruded: false,
        material: false,
        parameters: { depthTest: false },
        onClick: (info: any) => {
          if (info.index >= 0) {
            setSelectedTriangle(info.index);
          }
        },
      }),
    ];
  }, [
    triangles,
    precomputedColors,
    currentFrame,
    activeProperty,
    opacity,
    setSelectedTriangle,
  ]);

  const renderTooltip = ({ object, index }: any) => {
    if (object == null || index < 0 || !dataset) return null;
    const frame = decodeFrame(currentFrame);
    if (!frame) return null;
    const ci = (frame[activeProperty] as Int8Array)?.[index];
    if (ci == null || ci < 0) return null;
    const legend = dataset.legend[activeProperty];
    const cls = legend?.classes[ci];
    return cls
      ? `${legend.label}\n${cls.min} – ${cls.max}`
      : null;
  };

  return (
    <div className="absolute inset-0 z-0">
      <DeckGL
        initialViewState={initialView}
        controller={true}
        layers={layers}
        getTooltip={renderTooltip}
      >
        <Map mapStyle={theme.mapStyle} reuseMaps />
      </DeckGL>
    </div>
  );
}

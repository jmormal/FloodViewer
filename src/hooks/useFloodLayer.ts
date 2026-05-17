/* ────────/* ─────────────────────────────────────────────
 *  useFloodLayer — builds the deck.gl SolidPolygonLayer
 *
 *  Performance strategy:
 *  - The layer *instance* is recreated only when the triangle
 *    geometry or color LUT changes (i.e. on dataset load).
 *  - Fast-changing values (frame, property, opacity) are read
 *    from refs inside the accessor, and `updateTriggers` tells
 *    deck.gl when to re-evaluate getFillColor.
 *  - This keeps the layer reference stable across frame ticks,
 *    which avoids deck.gl diffing a brand-new layer every frame.
 * ───────────────────────────────────────────── */

import { useMemo, useRef, useEffect } from "react";
import { SolidPolygonLayer } from "@deck.gl/layers";
import { useFloodState, useFloodActions } from "../context/FloodContext";
import { theme } from "../config/theme";
import type { DecodedFrame, ColorLUT } from "../types/flood";

export function useFloodLayer() {
  const { triangles, colorLUT, currentFrame, activeProperty, opacity } = useFloodState();
  const { decodeFrame } = useFloodActions();

  // ── Refs for values read inside the accessor ──
  const classesRef = useRef<Int8Array | null>(null);
  const lutRef = useRef<Record<number, [number, number, number]> | null>(null);
  const alphaRef = useRef(Math.round(opacity * theme.layer.alphaScale));

  // Keep refs in sync — cheap, no allocation
  useEffect(() => {
    if (!colorLUT) return;
    const frame = decodeFrame(currentFrame);
    if (!frame) return;

    classesRef.current = frame[activeProperty] as Int8Array;
    lutRef.current = colorLUT[activeProperty];
    alphaRef.current = Math.round(opacity * theme.layer.alphaScale);
  }, [currentFrame, activeProperty, opacity, colorLUT, decodeFrame]);

  // ── Build the layer — only recreated when geometry or LUT swap ──
  const layer = useMemo(() => {
    if (!triangles || !colorLUT) return null;

    const TRANSPARENT: [number, number, number, number] = [0, 0, 0, 0];

    return new SolidPolygonLayer({
      id: "flood-triangles",
      data: triangles,
      getPolygon: (d: any) => d,
      getFillColor: (_d: any, { index }: { index: number }) => {
        const classes = classesRef.current;
        const lut = lutRef.current;
        if (!classes || !lut) return TRANSPARENT;

        const ci = classes[index];
        if (ci < 0) return TRANSPARENT;
        const rgb = lut[ci];
        return rgb ? [rgb[0], rgb[1], rgb[2], alphaRef.current] : TRANSPARENT;
      },
      // updateTriggers tells deck.gl to re-invoke getFillColor
      // even though the layer reference didn't change.
      updateTriggers: {
        getFillColor: [currentFrame, activeProperty, opacity],
      },
      pickable: true,
      extruded: false,
      material: false,
      parameters: { depthTest: false },
    });
  }, [triangles, colorLUT, currentFrame, activeProperty, opacity]);

  return layer;
}

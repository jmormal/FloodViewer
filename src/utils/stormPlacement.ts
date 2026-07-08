/* ─────────────────────────────────────────────
 *  stormPlacement — build a default footprint for a picked storm and
 *  manage its move/resize/rotate transform.
 *
 *  A storm's native size is grid_cols × cell_size_m (metres). We convert that
 *  to an approximate lon/lat half-extent at the current map centre so the
 *  initial footprint is physically sized, then the user nudges it with the
 *  same gizmo used for the weather overlay.
 *
 *  Placement is stored in lon/lat (degrees) + rotation; the WORKER reprojects
 *  the centre to EPSG:25830 and derives metre half-extents (see
 *  STORMS_INTEGRATION.md). Keeping the browser side in lon/lat avoids shipping
 *  a projection lib to the client.
 * ───────────────────────────────────────────── */

import type { StormSummary } from "./storms";

export interface StormPlacement {
  centerLng: number;
  centerLat: number;
  halfWidthDeg: number;
  halfHeightDeg: number;
  rotationDeg: number;
}

const METRES_PER_DEG_LAT = 111_320;

/** Approx metres per degree of longitude at a given latitude. */
function metresPerDegLng(lat: number): number {
  return METRES_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

/**
 * Default placement: a footprint matching the storm's true ground size,
 * centred on the current map view.
 */
export function defaultStormPlacement(
  storm: StormSummary,
  centerLng: number,
  centerLat: number,
): StormPlacement {
  const widthM = storm.grid_cols * storm.cell_size_m;
  const heightM = storm.grid_rows * storm.cell_size_m;

  const halfWidthDeg = widthM / 2 / metresPerDegLng(centerLat);
  const halfHeightDeg = heightM / 2 / METRES_PER_DEG_LAT;

  return {
    centerLng,
    centerLat,
    halfWidthDeg,
    halfHeightDeg,
    rotationDeg: 0,
  };
}

/**
 * Convert a StormPlacement into the geometry ring + placement block stored on
 * the feature. The ring is an axis-aligned (or rotated) rectangle so the storm
 * shows up as a normal polygon on the map and can be edited; the placement
 * block is what the worker actually uses.
 */
export function placementToFeature(
  stormRef: string,
  p: StormPlacement,
): {
  _type: "storm";
  storm_ref: string;
  placement: StormPlacement;
  _ring: [number, number][];
} {
  const { centerLng, centerLat, halfWidthDeg, halfHeightDeg, rotationDeg } = p;
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const corners: [number, number][] = [
    [-halfWidthDeg, -halfHeightDeg],
    [-halfWidthDeg, halfHeightDeg],
    [halfWidthDeg, halfHeightDeg],
    [halfWidthDeg, -halfHeightDeg],
  ];

  const ring = corners.map(([dx, dy]) => {
    const rx = dx * cos + dy * sin;
    const ry = -dx * sin + dy * cos;
    return [centerLng + rx, centerLat + ry] as [number, number];
  });
  ring.push(ring[0]); // close

  return {
    _type: "storm",
    storm_ref: stormRef,
    placement: p,
    _ring: ring,
  };
}

/* ─────────────────────────────────────────────
 *  stormPlacement — build a default footprint for a picked storm and
 *  manage its move/resize/rotate transform.
 *
 *  A storm's native size is grid_cols × cell_size_m (metres). We convert that
 *  to an approximate lon/lat half-extent at the current map centre so the
 *  initial footprint is physically sized, then the user nudges it with the
 *  same gizmo used for the weather overlay.
 *
 *  Placement is stored in lon/lat (degrees) + rotation, using the same shape
 *  as WeatherTransform (utils/weather.ts) so both overlays can share the
 *  same transform math (transformToCorners, transformCenter, ...).
 * ───────────────────────────────────────────── */

import type { Feature, Polygon } from "geojson";
import type { StormSummary } from "./storms";
import { transformToCorners, type WeatherTransform } from "./weather";

export type StormPlacement = WeatherTransform;

const METRES_PER_DEG_LAT = 111_320;

/** Approx metres per degree of longitude at a given latitude. */
function metresPerDegLng(lat: number): number {
  return METRES_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

/**
 * Default placement: a footprint matching the storm's true ground size.
 * Centered on the storm's own recorded geographic origin (where the source
 * rasters actually were) when the upload captured one; otherwise falls back
 * to whatever center the caller supplies (e.g. the current map view).
 */
export function defaultStormPlacement(
  storm: StormSummary,
  fallbackCenterLng: number,
  fallbackCenterLat: number,
): StormPlacement {
  const widthM = storm.grid_cols * storm.cell_size_m;
  const heightM = storm.grid_rows * storm.cell_size_m;

  const centerLng = storm.center_lng ?? fallbackCenterLng;
  const centerLat = storm.center_lat ?? fallbackCenterLat;

  return {
    centerLng,
    centerLat,
    halfW: widthM / 2 / metresPerDegLng(centerLat),
    halfH: heightM / 2 / METRES_PER_DEG_LAT,
    rotationDeg: 0,
  };
}

/**
 * Build a GeoJSON Feature for a picked storm: geometry is the placement
 * footprint (a rotated rectangle, purely for the "Drawn Elements" area calc
 * and as a fallback outline), properties carry the storm_ref + placement the
 * accumulated-rain bitmap and (eventually) the solver read from.
 */
export function placementToFeature(
  stormRef: string,
  p: StormPlacement,
): Feature<Polygon> {
  const corners = transformToCorners(p);
  const ring = [...corners, corners[0]];

  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [ring] },
    properties: {
      _type: "storm",
      storm_ref: stormRef,
      placement: p,
    },
  };
}

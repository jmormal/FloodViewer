/* ─────────────────────────────────────────────
 *  Mesh geometry helpers
 * ───────────────────────────────────────────── */

import type { FloodMesh, TriPolygon } from "../types/flood";

/**
 * Convert flat vertex + triangle index arrays into an array of
 * [[lng,lat],[lng,lat],[lng,lat]] polygons for deck.gl.
 * Called once when data loads.
 */
export function buildTrianglePolygons(mesh: FloodMesh, ntri: number): TriPolygon[] {
  const V = mesh.vertices;
  const T = mesh.triangles;
  const polys: TriPolygon[] = new Array(ntri);

  for (let i = 0; i < ntri; i++) {
    const a = T[i * 3];
    const b = T[i * 3 + 1];
    const c = T[i * 3 + 2];
    polys[i] = [
      [V[a * 2], V[a * 2 + 1]],
      [V[b * 2], V[b * 2 + 1]],
      [V[c * 2], V[c * 2 + 1]],
    ];
  }

  return polys;
}

/** Axis-aligned bounding box */
export interface BBox {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
  centerLng: number;
  centerLat: number;
}

/** Compute the bounding box of the mesh vertices */
export function computeBounds(vertices: number[]): BBox {
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;

  for (let i = 0; i < vertices.length; i += 2) {
    const lng = vertices[i];
    const lat = vertices[i + 1];
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  return {
    minLng, maxLng, minLat, maxLat,
    centerLng: (minLng + maxLng) / 2,
    centerLat: (minLat + maxLat) / 2,
  };
}

/** Estimate a reasonable zoom level from a bounding box */
export function estimateZoom(bounds: BBox): number {
  const span = Math.max(bounds.maxLat - bounds.minLat, bounds.maxLng - bounds.minLng);
  const zoom = Math.floor(Math.log2(360 / span)) - 0.5;
  return Math.max(10, Math.min(zoom, 16));
}

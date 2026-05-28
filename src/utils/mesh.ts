
import type { FloodDataset, TriPolygon, Vertex } from "../types/flood";
export function buildTrianglePolygons(dataset: FloodDataset): TriPolygon[] {
  return dataset.triangles.map((t) => {
    const v0 = dataset.vertices[t.vertices[0]];
    const v1 = dataset.vertices[t.vertices[1]];
    const v2 = dataset.vertices[t.vertices[2]];
    return [[v0.lon, v0.lat], [v1.lon, v1.lat], [v2.lon, v2.lat]];
  });
}
export interface BBox { minLng: number; maxLng: number; minLat: number; maxLat: number; centerLng: number; centerLat: number; }
export function computeBounds(vertices: Vertex[]): BBox {
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  for (const v of vertices) {
    if (v.lat < minLat) minLat = v.lat;
    if (v.lat > maxLat) maxLat = v.lat;
    if (v.lon < minLng) minLng = v.lon;
    if (v.lon > maxLng) maxLng = v.lon;
  }
  return { minLng, maxLng, minLat, maxLat, centerLng: (minLng + maxLng) / 2, centerLat: (minLat + maxLat) / 2 };
}
export function estimateZoom(bounds: BBox): number {
  const span = Math.max(bounds.maxLat - bounds.minLat, bounds.maxLng - bounds.minLng);
  const zoom = Math.floor(Math.log2(360 / span)) - 0.5;
  return Math.max(10, Math.min(zoom, 16));
}

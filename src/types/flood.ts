/* ─────────────────────────────────────────────
 *  Flood data model — matches sww_to_geojson_v2 output
 * ───────────────────────────────────────────── */

/** A single legend class (color stop) */
export interface LegendClass {
  min: number;
  max: number;
  color: string; // hex e.g. "#08306b"
}

/** Legend entry for one property */
export interface LegendEntry {
  label: string;
  classes: LegendClass[];
}

/** Dataset metadata block */
export interface FloodMeta {
  epsg_source: number;
  nclasses: number;
  scale: string;
  ntriangles: number;
  nnodes: number;
  nframes: number;
  properties: string[];
  rle: boolean;
}

/** Triangle mesh (flat arrays for performance) */
export interface FloodMesh {
  vertices: number[];  // [lng0, lat0, lng1, lat1, ...]
  triangles: number[]; // [v0, v1, v2, ...]
}

/** A single time-step frame (RLE-encoded strings per property) */
export interface FloodFrame {
  t: number;
  [property: string]: string | number;
}

/** Top-level JSON structure */
export interface FloodDataset {
  version: number;
  meta: FloodMeta;
  legend: Record<string, LegendEntry>;
  mesh: FloodMesh;
  frames: FloodFrame[];
}

/** Decoded frame: class indices per triangle (-1 = inactive) */
export interface DecodedFrame {
  _t: number;
  [property: string]: Int8Array | number;
}

/** Triangle polygon for deck.gl: [[lng,lat], [lng,lat], [lng,lat]] */
export type TriPolygon = [number, number][];

/** RGB tuple */
export type RGB = [number, number, number];

/** Color lookup table: { propertyName: { classIndex: RGB } } */
export type ColorLUT = Record<string, Record<number, RGB>>;

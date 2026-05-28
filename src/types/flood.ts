
export interface Vertex { lat: number; lon: number; }
export interface Triangle {
  vertices: [number, number, number];
  elevation: number; friction: number;
  stage: number[]; depth: number[];
  xmomentum: number[]; ymomentum: number[];
  speed: number[]; xvelocity: number[]; yvelocity: number[];
}
export interface LegendClass { min: number; max: number; color: string; }
export interface LegendEntry { label: string; classes: LegendClass[]; }
export interface FloodMeta { epsg_source: number; nclasses: number; scale: string; ntriangles: number; nnodes: number; nframes: number; properties: string[]; rle: boolean; }
export interface FloodDataset { meta: FloodMeta; legend: Record<string, LegendEntry>; times: number[]; vertices: Vertex[]; triangles: Triangle[]; }
export type TriPolygon = [number, number][];
export type RGB = [number, number, number];
export type ColorLUT = Record<string, Record<number, RGB>>;
export interface DecodedFrame { _t: number; [property: string]: any; }

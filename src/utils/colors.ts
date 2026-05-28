
import type { FloodDataset, RGB } from "../types/flood";
const COLOR_RAMPS: Record<string, string[]> = {
  depth: ["#f7fbff", "#c6dbef", "#6baed6", "#2171b5", "#08519c", "#08306b"],
  speed: ["#ffffb2", "#fed976", "#fd8d3c", "#fc4e2a", "#e31a1c", "#800026"],
  momentum: ["#f7fcf5", "#c7e9c0", "#74c476", "#31a354", "#238b45", "#00441b"],
  hazard: ["#ffffd4", "#fee391", "#fe9929", "#d95f0e", "#993404", "#662506"],
};
const MAX_VALUES: Record<string, number> = { depth: 3.0, speed: 4.0, momentum: 6.0, hazard: 5.0 };
function hexToRGB(hex: string): RGB {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const RGB_RAMPS = Object.fromEntries(Object.entries(COLOR_RAMPS).map(([k, v]) => [k, v.map(hexToRGB)]));

export function getColorForValue(prop: string, value: number): RGB | null {
  if (value < 0.01) return null;
  const ramp = RGB_RAMPS[prop];
  const max = MAX_VALUES[prop];
  const normalized = Math.max(0, Math.min(1, value / max));
  const idx = normalized * (ramp.length - 1);
  const i0 = Math.floor(idx);
  const i1 = Math.min(i0 + 1, ramp.length - 1);
  const f = idx - i0;
  const c0 = ramp[i0];
  const c1 = ramp[i1];
  return [Math.round(c0[0] + f * (c1[0] - c0[0])), Math.round(c0[1] + f * (c1[1] - c0[1])), Math.round(c0[2] + f * (c1[2] - c0[2]))];
}

export function precomputeAllColors(dataset: FloodDataset): Record<string, Uint8Array[]> {
  const properties = ["depth", "speed", "momentum", "hazard"];
  const nframes = dataset.times.length;
  const ntri = dataset.triangles.length;
  const result: Record<string, Uint8Array[]> = {};
  
  for (const prop of properties) {
    result[prop] = Array.from({ length: nframes }, () => new Uint8Array(ntri * 4));
  }
  
  for (let triIdx = 0; triIdx < ntri; triIdx++) {
    const tri = dataset.triangles[triIdx] as any;
    for (let f = 0; f < nframes; f++) {
      const off = triIdx * 4;
      for (const prop of properties) {
        const val = prop === "hazard" ? (tri.depth[f] || 0) * (tri.speed[f] || 0) : (tri[prop]?.[f] || 0);
        const rgb = getColorForValue(prop, val);
        if (rgb) {
          result[prop][f][off] = rgb[0];
          result[prop][f][off + 1] = rgb[1];
          result[prop][f][off + 2] = rgb[2];
          result[prop][f][off + 3] = 255;
        }
      }
    }
  }
  return result;
}

// Dummies for compatibility with FloodProvider imports
export const buildColorLUT = () => ({});
export const buildTriangleHistories = () => ({});

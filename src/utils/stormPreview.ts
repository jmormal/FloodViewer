/* ─────────────────────────────────────────────
 *  stormPreview — fetch a storm's accumulated-rainfall
 *  grid and paint it to a canvas for a deck.gl BitmapLayer.
 *
 *  Mirrors utils/weather.ts's fetchWeatherGrid: same
 *  {image, bounds, values, min, max} shape, so the storm
 *  overlay can reuse the same transform math (transformToCorners
 *  etc.) — only the data source and color ramp differ.
 * ───────────────────────────────────────────── */

import { getStormPreview } from "./storms";
import type { StormPlacement } from "./stormPlacement";
import { transformToCorners } from "./weather";

export interface StormBitmap {
  image: HTMLCanvasElement;
  rows: number;
  cols: number;
  values: Float32Array;
  min: number;
  max: number;
}

/** Blue rain ramp: transparent (no rain) → deep blue (heaviest accumulation). */
const RAIN_RAMP: [number, [number, number, number]][] = [
  [0, [255, 255, 255]],
  [0.05, [199, 233, 192]],
  [0.25, [116, 196, 118]],
  [0.55, [49, 130, 189]],
  [1, [8, 48, 107]],
];

function rainColor(t: number): [number, number, number, number] {
  if (t <= 0) return [255, 255, 255, 0]; // no rain -> transparent
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (RAIN_RAMP.length - 1);
  const i0 = Math.floor(scaled);
  const i1 = Math.min(i0 + 1, RAIN_RAMP.length - 1);
  const f = scaled - i0;
  const [, c0] = RAIN_RAMP[i0];
  const [, c1] = RAIN_RAMP[i1];
  return [
    Math.round(c0[0] + f * (c1[0] - c0[0])),
    Math.round(c0[1] + f * (c1[1] - c0[1])),
    Math.round(c0[2] + f * (c1[2] - c0[2])),
    220,
  ];
}

/** Fetch the accumulated-rain grid for a storm and rasterize it to a canvas. */
export async function fetchStormBitmap(stormRef: string): Promise<StormBitmap> {
  const grid = await getStormPreview(stormRef);
  const { rows, cols } = grid;

  const values = Float32Array.from(grid.values);
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!Number.isFinite(min)) {
    min = 0;
    max = 0;
  }

  const canvas = document.createElement("canvas");
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D canvas context");

  const img = ctx.createImageData(cols, rows);
  const span = max - min;
  for (let i = 0; i < values.length; i++) {
    const t = span > 1e-9 ? (values[i] - min) / span : 0;
    const [r, g, b, a] = rainColor(t);
    const off = i * 4;
    img.data[off] = r;
    img.data[off + 1] = g;
    img.data[off + 2] = b;
    img.data[off + 3] = a;
  }
  ctx.putImageData(img, 0, 0);

  return { image: canvas, rows, cols, values, min, max };
}

/** Legend entries for the storm ramp, high→low (mirrors utils/weather.ts's legendEntries). */
export function stormLegendEntries(
  min: number,
  max: number,
  steps = 6,
): { value: number; color: [number, number, number] }[] {
  const entries: { value: number; color: [number, number, number] }[] = [];
  for (let i = steps - 1; i >= 0; i--) {
    const t = steps > 1 ? i / (steps - 1) : 0;
    const value = min + t * (max - min);
    const [r, g, b] = rainColor(t);
    entries.push({ value, color: [r, g, b] });
  }
  return entries;
}

/** Four corners for BitmapLayer.bounds, given a storm placement transform. */
export function stormBitmapCorners(p: StormPlacement): [number, number][] {
  return transformToCorners(p);
}

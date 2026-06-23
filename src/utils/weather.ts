/* ─────────────────────────────────────────────
 *  weather — fetch Open-Meteo grid + paint to canvas
 *
 *  Open-Meteo's API is GET-only (POST returns 400).
 *  We sample a small regular lat/lon grid over the
 *  flood bounds, request all points in one GET call
 *  (kept short enough to avoid URL-length limits),
 *  then paint each cell into a canvas for a deck.gl
 *  BitmapLayer (which linearly interpolates between
 *  cells, so a coarse grid still looks smooth).
 *
 *  Colours are stretched to the grid's own min/max,
 *  so even a small area with little absolute variation
 *  still shows visible relative gradients.
 * ───────────────────────────────────────────── */

import type { BBox } from "./mesh";

export interface WeatherGrid {
  /** RGBA image for BitmapLayer */
  image: HTMLCanvasElement;
  /** [west, south, east, north] for BitmapLayer.bounds */
  bounds: [number, number, number, number];
  width: number;
  height: number;
  /** raw values, row-major north→south, west→east (handy for tooltips/legend) */
  values: Float32Array;
  /** min / max of the non-NaN values (drives the stretched ramp + legend) */
  min: number;
  max: number;
  variable: WeatherVariable;
}

export type WeatherVariable =
  | "temperature_2m"
  | "precipitation"
  | "rain"
  | "wind_speed_10m";

export const WEATHER_LABELS: Record<
  WeatherVariable,
  { label: string; unit: string }
> = {
  temperature_2m: { label: "Temperature", unit: "°C" },
  precipitation: { label: "Precipitation", unit: "mm" },
  rain: { label: "Rain", unit: "mm" },
  wind_speed_10m: { label: "Wind Speed", unit: "km/h" },
};

/**
 * Colour ramp per variable, low→high. These colours are used as an evenly
 * spaced gradient; the *values* attached to each stop are only used as a
 * fallback / reference — the actual mapping is stretched to the live data
 * range (see rampColorNormalized).
 */
const RAMPS: Record<WeatherVariable, [number, [number, number, number]][]> = {
  temperature_2m: [
    [-10, [69, 117, 180]],
    [0, [145, 191, 219]],
    [10, [224, 243, 248]],
    [20, [254, 224, 144]],
    [30, [252, 141, 89]],
    [40, [215, 48, 39]],
  ],
  precipitation: [
    [0, [255, 255, 255]],
    [1, [199, 233, 192]],
    [4, [116, 196, 118]],
    [10, [49, 130, 189]],
    [25, [8, 81, 156]],
    [50, [8, 48, 107]],
  ],
  rain: [
    [0, [255, 255, 255]],
    [1, [199, 233, 192]],
    [4, [116, 196, 118]],
    [10, [49, 130, 189]],
    [25, [8, 81, 156]],
    [50, [8, 48, 107]],
  ],
  wind_speed_10m: [
    [0, [237, 248, 251]],
    [5, [179, 205, 227]],
    [10, [140, 150, 198]],
    [20, [136, 86, 167]],
    [30, [129, 15, 124]],
    [40, [77, 0, 75]],
  ],
};

/** Just the colour list for a variable (low→high) */
function rampColors(variable: WeatherVariable): [number, number, number][] {
  return RAMPS[variable].map((s) => s[1]);
}

/**
 * Colour a value by its position within [min, max], using the variable's
 * ramp colours as an evenly spaced gradient. This stretches the full colour
 * range across whatever spread the data actually has, so a tight range
 * (e.g. 24.1–24.4 °C) still produces visible variation instead of one flat
 * colour. If the field is perfectly flat (min === max) everything maps to
 * the gradient midpoint.
 */
export function rampColorNormalized(
  variable: WeatherVariable,
  v: number,
  min: number,
  max: number,
): [number, number, number] {
  const colors = rampColors(variable);
  const t = max > min ? (v - min) / (max - min) : 0.5;
  const scaled = Math.max(0, Math.min(1, t)) * (colors.length - 1);
  const i0 = Math.floor(scaled);
  const i1 = Math.min(i0 + 1, colors.length - 1);
  const f = scaled - i0;
  const c0 = colors[i0];
  const c1 = colors[i1];
  return [
    Math.round(c0[0] + f * (c1[0] - c0[0])),
    Math.round(c0[1] + f * (c1[1] - c0[1])),
    Math.round(c0[2] + f * (c1[2] - c0[2])),
  ];
}

/**
 * Build legend entries for a stretched ramp: evenly spaced swatches between
 * min and max, each with the value it represents and its colour. Returns
 * high→low so the legend reads top (max) to bottom (min).
 */
export function legendEntries(
  variable: WeatherVariable,
  min: number,
  max: number,
  steps = 6,
): { value: number; color: [number, number, number] }[] {
  const colors = rampColors(variable);
  const entries: { value: number; color: [number, number, number] }[] = [];
  for (let i = steps - 1; i >= 0; i--) {
    const t = steps > 1 ? i / (steps - 1) : 0;
    const value = min + t * (max - min);
    const scaled = t * (colors.length - 1);
    const i0 = Math.floor(scaled);
    const i1 = Math.min(i0 + 1, colors.length - 1);
    const f = scaled - i0;
    const c0 = colors[i0];
    const c1 = colors[i1];
    entries.push({
      value,
      color: [
        Math.round(c0[0] + f * (c1[0] - c0[0])),
        Math.round(c0[1] + f * (c1[1] - c0[1])),
        Math.round(c0[2] + f * (c1[2] - c0[2])),
      ],
    });
  }
  return entries;
}

/**
 * Fetch an Open-Meteo grid over a bounding box and rasterize it to a canvas.
 *
 * Open-Meteo accepts comma-separated latitude/longitude lists in a single GET.
 * We keep the grid small (default 10×10 = 100 points) so the URL stays well
 * under length limits. BitmapLayer upscales/interpolates the result smoothly.
 *
 * @param bounds   flood-mesh bounding box (WGS84 lat/lon)
 * @param variable which Open-Meteo `current` variable to fetch
 * @param cells    grid resolution per side (default 10 → 100 points)
 */
export async function fetchWeatherGrid(
  bounds: BBox,
  variable: WeatherVariable = "temperature_2m",
  cells = 10,
): Promise<WeatherGrid> {
  // Pad slightly so the overlay fully covers the mesh
  const pad = 0.1;
  const west = bounds.minLng - pad;
  const east = bounds.maxLng + pad;
  const south = bounds.minLat - pad;
  const north = bounds.maxLat + pad;

  const width = Math.max(2, cells);
  const height = Math.max(2, cells);

  // Build grid points: north→south rows, west→east cols (matches BitmapLayer)
  const lats: number[] = [];
  const lons: number[] = [];
  for (let r = 0; r < height; r++) {
    const lat = north - (r / (height - 1)) * (north - south);
    for (let c = 0; c < width; c++) {
      const lon = west + (c / (width - 1)) * (east - west);
      // 4 decimals ≈ 11 m precision — plenty, and keeps the URL short
      lats.push(Number(lat.toFixed(4)));
      lons.push(Number(lon.toFixed(4)));
    }
  }

  // Open-Meteo is GET-only. A ~100-point comma-separated grid keeps the URL
  // well under length limits (POST returns 400 — it isn't supported).
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lats.join(",")}` +
    `&longitude=${lons.join(",")}` +
    `&current=${variable}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  const data = await res.json();

  // A single point returns an object; many points return an array.
  const arr: any[] = Array.isArray(data) ? data : [data];

  const values = new Float32Array(width * height);
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < values.length; i++) {
    const v = arr[i]?.current?.[variable];
    if (Number.isFinite(v)) {
      values[i] = v;
      if (v < min) min = v;
      if (v > max) max = v;
    } else {
      values[i] = NaN;
    }
  }
  if (!Number.isFinite(min)) {
    min = 0;
    max = 0;
  }

  // Paint to canvas (1px per cell; BitmapLayer upscales smoothly).
  // Colours are stretched to [min, max] so small spreads still show variation.
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D canvas context");

  const img = ctx.createImageData(width, height);
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const off = i * 4;
    if (Number.isNaN(v)) {
      img.data[off + 3] = 0; // transparent for missing data
      continue;
    }
    const [r, g, b] = rampColorNormalized(variable, v, min, max);
    img.data[off] = r;
    img.data[off + 1] = g;
    img.data[off + 2] = b;
    img.data[off + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  return {
    image: canvas,
    bounds: [west, south, east, north],
    width,
    height,
    values,
    min,
    max,
    variable,
  };
}

/* ─────────────────────────────────────────────
 *  Transform helpers — move / resize / rotate the
 *  weather overlay as a rotated quad.
 *
 *  BitmapLayer.bounds accepts four explicit corners
 *  in the order [[L,B],[L,T],[R,T],[R,B]], so a
 *  rotated rectangle renders natively — no need to
 *  re-bake the canvas pixels.
 * ───────────────────────────────────────────── */

export interface WeatherTransform {
  centerLng: number;
  centerLat: number;
  /** half-width in degrees longitude */
  halfW: number;
  /** half-height in degrees latitude */
  halfH: number;
  /** rotation in degrees, clockwise */
  rotationDeg: number;
}

/** Build an initial transform centred on a [w,s,e,n] bounds box */
export function transformFromBounds(
  bounds: [number, number, number, number],
): WeatherTransform {
  const [w, s, e, n] = bounds;
  return {
    centerLng: (w + e) / 2,
    centerLat: (s + n) / 2,
    halfW: Math.abs(e - w) / 2,
    halfH: Math.abs(n - s) / 2,
    rotationDeg: 0,
  };
}

/**
 * Rotate a point [dx, dy] (offset from center, in degrees) clockwise by
 * `deg`. Latitude degrees and longitude degrees are not equal in metres,
 * but for a small interactive overlay this screen-space approximation is
 * fine and keeps the handles intuitive.
 */
function rotateOffset(
  dx: number,
  dy: number,
  deg: number,
): [number, number] {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  // clockwise rotation in screen space (y points up in lat)
  return [dx * cos + dy * sin, -dx * sin + dy * cos];
}

/**
 * Compute the four corner coordinates for BitmapLayer.bounds in the order
 * deck.gl expects: [[L,B],[L,T],[R,T],[R,B]] (pre-rotation labels; after
 * rotation they are just the four rotated corners in that cyclic order).
 */
export function transformToCorners(
  t: WeatherTransform,
): [number, number][] {
  const corners: [number, number][] = [
    [-t.halfW, -t.halfH], // left-bottom
    [-t.halfW, t.halfH], // left-top
    [t.halfW, t.halfH], // right-top
    [t.halfW, -t.halfH], // right-bottom
  ];
  return corners.map(([dx, dy]) => {
    const [rx, ry] = rotateOffset(dx, dy, t.rotationDeg);
    return [t.centerLng + rx, t.centerLat + ry];
  });
}

/** Center handle position (lng/lat) */
export function transformCenter(t: WeatherTransform): [number, number] {
  return [t.centerLng, t.centerLat];
}

/**
 * Rotation handle position: a point above the top edge midpoint, offset by
 * `gap` degrees of latitude (before rotation), then rotated with the quad.
 */
export function transformRotationHandle(
  t: WeatherTransform,
  gap = 0.0,
): [number, number] {
  const offY = t.halfH + (gap || t.halfH * 0.25);
  const [rx, ry] = rotateOffset(0, offY, t.rotationDeg);
  return [t.centerLng + rx, t.centerLat + ry];
}

/** The four resize handles = the four corners */
export function transformResizeHandles(
  t: WeatherTransform,
): { corner: number; position: [number, number] }[] {
  return transformToCorners(t).map((position, corner) => ({
    corner,
    position,
  }));
}

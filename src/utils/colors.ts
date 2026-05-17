/* ─────────────────────────────────────────────
 *  Color utilities
 * ───────────────────────────────────────────── */

import type { FloodDataset, RGB, ColorLUT } from "../types/flood";

import { createFrameCache, decodeFrame } from "./decode";
/** Convert "#rrggbb" → [r, g, b] */
export function hexToRGB(hex: string): RGB {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/**
 * Pre-build a lookup table: property → classIndex → RGB.
 * Called once when data loads so rendering is a simple array lookup.
 */
export function buildColorLUT(dataset: FloodDataset): ColorLUT {
  const lut: ColorLUT = {};

  for (const prop of dataset.meta.properties) {
    const entry: Record<number, RGB> = {};
    dataset.legend[prop].classes.forEach((cls, i) => {
      entry[i] = hexToRGB(cls.color);
    });
    lut[prop] = entry;
  }

  return lut;
}


/**
 * Pre-build RGBA color buffers for every frame × property combo.
 * Called once at load time. Returns { property: [Uint8Array per frame] }.
 * Each Uint8Array is ntri×4 (flat RGBA).
 */
export function precomputeAllColors(
  dataset: FloodDataset,
  colorLUT: ColorLUT,
): Record<string, Uint8Array[]> {
  const { ntriangles: ntri, properties, nframes } = dataset.meta;
  const cache = createFrameCache(nframes); // cache all
  const result: Record<string, Uint8Array[]> = {};

  for (const prop of properties) {
    const lut = colorLUT[prop];
    const frames: Uint8Array[] = new Array(nframes);

    for (let f = 0; f < nframes; f++) {
      const decoded = decodeFrame(dataset, f, cache);
      const classes = decoded[prop] as Int8Array;
      const buf = new Uint8Array(ntri * 4);

      for (let i = 0; i < ntri; i++) {
        const ci = classes[i];
        if (ci >= 0) {
          const rgb = lut[ci];
          if (rgb) {
            const off = i * 4;
            buf[off] = rgb[0];
            buf[off + 1] = rgb[1];
            buf[off + 2] = rgb[2];
            buf[off + 3] = 255; // full alpha; actual alpha applied at render
          }
        }
        // inactive triangles stay [0,0,0,0] — transparent
      }

      frames[f] = buf;
    }
    result[prop] = frames;
  }

  return result;
}

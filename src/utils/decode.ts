/* ─────────────────────────────────────────────
 *  Frame decoding (RLE → class-index arrays)
 * ───────────────────────────────────────────── */

import type { FloodDataset, DecodedFrame } from "../types/flood";
import { theme } from "../config/theme";

/**
 * Run-length decode a string.
 * Format: each char optionally followed by a decimal repeat count.
 * E.g.  "A3B2." → "AAABB."
 */
export function rleDecode(encoded: string, expectedLength: number): string {
  if (encoded.length === expectedLength) return encoded;

  let out = "";
  let i = 0;
  while (i < encoded.length) {
    const ch = encoded[i++];
    let numStr = "";
    while (i < encoded.length && encoded[i] >= "0" && encoded[i] <= "9") {
      numStr += encoded[i++];
    }
    out += ch.repeat(numStr ? parseInt(numStr, 10) : 1);
  }
  return out;
}

/**
 * LRU cache for decoded frames.
 * Keeps the most recent `maxSize` entries to avoid re-decoding
 * while bounding memory.
 */
export function createFrameCache(maxSize = theme.frameCacheSize) {
  const cache = new Map<number, DecodedFrame>();

  return {
    get(idx: number): DecodedFrame | undefined {
      return cache.get(idx);
    },

    set(idx: number, frame: DecodedFrame) {
      cache.set(idx, frame);
      if (cache.size > maxSize) {
        // Delete oldest entry
        cache.delete(cache.keys().next().value!);
      }
    },

    clear() {
      cache.clear();
    },
  };
}

/**
 * Decode a single frame: for each property, expand the RLE string
 * into an Int8Array of class indices (-1 = inactive / ".").
 */
export function decodeFrame(
  dataset: FloodDataset,
  frameIndex: number,
  cache: ReturnType<typeof createFrameCache>,
): DecodedFrame {
  const cached = cache.get(frameIndex);
  if (cached) return cached;

  const frame = dataset.frames[frameIndex];
  const ntri = dataset.meta.ntriangles;
  const useRLE = dataset.meta.rle !== false;

  const decoded: DecodedFrame = { _t: frame.t as number };

  for (const prop of dataset.meta.properties) {
    const raw = (frame[prop] as string) || "";
    const str = useRLE ? rleDecode(raw, ntri) : raw;
    const arr = new Int8Array(ntri);

    for (let i = 0; i < ntri && i < str.length; i++) {
      arr[i] = str[i] === "." ? -1 : str[i].charCodeAt(0) - 65;
    }
    (decoded as any)[prop] = arr;
  }

  cache.set(frameIndex, decoded);
  return decoded;
}

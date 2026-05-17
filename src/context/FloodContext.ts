/* ─────────────────────────────────────────────
 *  FloodContext — shared app state
 * ───────────────────────────────────────────── */

import { createContext, useContext } from "react";
import type { FloodDataset, TriPolygon, ColorLUT, DecodedFrame } from "../types/flood";
import type { createFrameCache } from "../utils/decode";

export interface FloodState {
  /** The loaded dataset (null before load) */
  dataset: FloodDataset | null;
  /** Pre-built triangle polygons for deck.gl */
  triangles: TriPolygon[] | null;
  /** Pre-built color LUT */
  colorLUT: ColorLUT | null;
  /** Frame decode cache */
  frameCache: ReturnType<typeof createFrameCache> | null;
  /** Precomputed RGBA buffers: property → frame[] → Uint8Array */
  precomputedColors: Record<string, Uint8Array[]> | null;
  /** Per-triangle history: property → Int8Array(ntri × nframes) */
  triangleHistories: Record<string, Int8Array> | null;
  /** File size in bytes (0 for demo) */
  fileSize: number;

  /** Currently active property key */
  activeProperty: string;
  /** Current frame index */
  currentFrame: number;
  /** Layer opacity (0–1) */
  opacity: number;

  /** Playback state */
  isPlaying: boolean;
  playbackSpeed: number;

  /** Currently selected triangle index */
  selectedTriangle: number | null;
}

export interface FloodActions {
  loadDataset: (dataset: FloodDataset, fileSize?: number) => void;
  setActiveProperty: (prop: string) => void;
  setCurrentFrame: (frame: number) => void;
  setOpacity: (opacity: number) => void;
  stepFrame: (delta: number) => void;
  togglePlay: () => void;
  cycleSpeed: () => void;
  setSelectedTriangle: (index: number | null) => void;

  /** Decode a frame (uses cache) */
  decodeFrame: (index: number) => DecodedFrame | null;
}

export const FloodStateContext = createContext<FloodState | null>(null);
export const FloodActionsContext = createContext<FloodActions | null>(null);

export function useFloodState(): FloodState {
  const ctx = useContext(FloodStateContext);
  if (!ctx) throw new Error("useFloodState must be used within FloodProvider");
  return ctx;
}

export function useFloodActions(): FloodActions {
  const ctx = useContext(FloodActionsContext);
  if (!ctx) throw new Error("useFloodActions must be used within FloodProvider");
  return ctx;
}

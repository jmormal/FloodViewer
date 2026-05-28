
import { createContext, useContext } from "react";
import type { FloodDataset, TriPolygon, DecodedFrame } from "../types/flood";

export interface FloodState {
  dataset: FloodDataset | null; triangles: TriPolygon[] | null;
  precomputedColors: Record<string, Uint8Array[]> | null;
  fileSize: number; activeProperty: string; currentFrame: number; opacity: number;
  isPlaying: boolean; playbackSpeed: number; selectedTriangle: number | null;
  colorLUT: any; frameCache: any; triangleHistories: any; // Keep to satisfy old types
}
export interface FloodActions {
  loadDataset: (dataset: FloodDataset, fileSize?: number) => void;
  setActiveProperty: (prop: string) => void; setCurrentFrame: (frame: number) => void;
  setOpacity: (opacity: number) => void; stepFrame: (delta: number) => void;
  togglePlay: () => void; cycleSpeed: () => void; setSelectedTriangle: (index: number | null) => void;
  decodeFrame: (index: number) => DecodedFrame | null;
}
export const FloodStateContext = createContext<FloodState | null>(null);
export const FloodActionsContext = createContext<FloodActions | null>(null);
export function useFloodState(): FloodState { const ctx = useContext(FloodStateContext); if (!ctx) throw new Error("Missing Provider"); return ctx; }
export function useFloodActions(): FloodActions { const ctx = useContext(FloodActionsContext); if (!ctx) throw new Error("Missing Provider"); return ctx; }

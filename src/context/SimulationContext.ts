/* ─────────────────────────────────────────────
 *  SimulationContext — drawing + config state
 *
 *  Parallel to FloodContext (viewing results).
 *  This context owns everything needed to set up
 *  and submit a simulation job.
 * ───────────────────────────────────────────── */

import { createContext, useContext } from "react";
import type { FeatureCollection, Feature } from "geojson";

/* ── Job status ──────────────────────────────── */

export type JobStatus =
  | "idle"
  | "submitting"
  | "meshing"
  | "solving"
  | "done"
  | "error";

/* ── State ───────────────────────────────────── */

export interface SimulationState {
  /** All drawn polygons with typed properties */
  features: FeatureCollection;

  /** Drawing mode */
  isDrawing: boolean;
  /** Which polygon type is being drawn (null when not drawing) */
  activeType: string | null;

  /** Currently selected polygon index */
  selectedFeatureIndex: number | null;
  /** Currently selected edge index (within selected polygon) */
  selectedEdgeIndex: number | null;

  /** Vertex editing mode */
  isEditing: boolean
  /** Total area of all drawn polygons (m²) */
  areaSqM: number | null;

  /** Simulation solver/mesh config */
  config: Record<string, any>;

  /** Job tracking */
  job: {
    status: JobStatus;
    id: string | null;
    error: string | null;
    progress: number | null;
  };
}

/* ── Actions ─────────────────────────────────── */

export interface SimulationActions {
  /* Drawing */
  startDrawing: (typeKey: string) => void;
  stopDrawing: () => void;

  /* Feature management */
  addFeature: (feature: Feature) => void;
  deleteFeature: (index: number) => void;
  clearAll: () => void;

  /* Selection */
  setSelectedFeatureIndex: (index: number | null) => void;
  setSelectedEdgeIndex: (index: number | null) => void;

  /* Property editing */
  updateFeatureProperty: (polyIdx: number, key: string, value: any) => void;
  updateEdgeProperty: (polyIdx: number, edgeIdx: number, key: string, value: any) => void;

  /* Simulation config */
  updateConfig: (key: string, value: any) => void;

  /* Job */
  submitSimulation: () => Promise<void>;

  startEditing: () => void;
  stopEditing: () => void;
  moveVertex: (polyIdx: number, vertexIdx: number, coord: [number, number]) => void;
  insertVertex: (polyIdx: number, edgeIdx: number, coord: [number, number]) => void;
  deleteVertex: (polyIdx: number, vertexIdx: number) => void;

  sendToBack: (index: number) => void;
  bringToFront: (index: number) => void;
}

/* ── Contexts ────────────────────────────────── */

export const SimulationStateContext = createContext<SimulationState | null>(null);
export const SimulationActionsContext = createContext<SimulationActions | null>(null);

export function useSimulationState(): SimulationState {
  const ctx = useContext(SimulationStateContext);
  if (!ctx) throw new Error("useSimulationState must be used within SimulationProvider");
  return ctx;
}

export function useSimulationActions(): SimulationActions {
  const ctx = useContext(SimulationActionsContext);
  if (!ctx) throw new Error("useSimulationActions must be used within SimulationProvider");
  return ctx;
}

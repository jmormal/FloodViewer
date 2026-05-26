/* ─────────────────────────────────────────────
 *  SimulationProvider — owns drawing + config state
 *
 *  On job completion, downloads the result JSON
 *  and feeds it into the flood visualizer.
 * ───────────────────────────────────────────── */

import React, { useReducer, useMemo, useCallback, useRef } from "react";
import * as turf from "@turf/turf";
import type { Feature } from "geojson";
import {
  SimulationStateContext,
  SimulationActionsContext,
  type SimulationState,
  type SimulationActions,
  type JobStatus,
} from "./SimulationContext";
import { useFloodActions } from "./FloodContext";
import { defaultSimConfig } from "../config/simulationConfig";
import { serializePayload } from "../utils/serialize";
import type { FloodDataset } from "../types/flood";

/* ── Action types ────────────────────────────── */

type Action =
  | { type: "START_DRAWING"; typeKey: string }
  | { type: "STOP_DRAWING" }
  | { type: "ADD_FEATURE"; feature: Feature }
  | { type: "DELETE_FEATURE"; index: number }
  | { type: "CLEAR_ALL" }
  | { type: "SELECT_FEATURE"; index: number | null }
  | { type: "SELECT_EDGE"; index: number | null }
  | { type: "UPDATE_FEATURE_PROP"; polyIdx: number; key: string; value: any }
  | { type: "UPDATE_EDGE_PROP"; polyIdx: number; edgeIdx: number; key: string; value: any }
  | { type: "UPDATE_CONFIG"; key: string; value: any }
  | { type: "SET_JOB"; status: JobStatus; id?: string | null; error?: string | null; progress?: number | null };

/* ── Initial state ───────────────────────────── */

const initialState: SimulationState = {
  features: { type: "FeatureCollection", features: [] },
  isDrawing: false,
  activeType: null,
  selectedFeatureIndex: null,
  selectedEdgeIndex: null,
  areaSqM: null,
  config: defaultSimConfig(),
  job: { status: "idle", id: null, error: null, progress: null },
};

/* ── Helpers ──────────────────────────────────── */

const API_URL = import.meta.env.VITE_API_URL || "http://api.127.0.0.1.nip.io";

function calcArea(fc: { features: any[] }): number | null {
  if (fc.features.length === 0) return null;
  return Math.round(turf.area(fc as any) * 100) / 100;
}

/**
 * Fetch result JSON (plain or gzipped) and parse it.
 * The browser handles Content-Encoding: gzip transparently,
 * so this works for both .json and .json.gz responses.
 */
async function fetchResultDataset(url: string): Promise<FloodDataset> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download result: ${res.status}`);
  return (await res.json()) as FloodDataset;
}

/* ── Reducer ─────────────────────────────────── */

function reducer(state: SimulationState, action: Action): SimulationState {
  switch (action.type) {
    case "START_DRAWING":
      return {
        ...state,
        isDrawing: true,
        activeType: action.typeKey,
        selectedFeatureIndex: null,
        selectedEdgeIndex: null,
      };

    case "STOP_DRAWING":
      return { ...state, isDrawing: false, activeType: null };

    case "ADD_FEATURE": {
      const nextFeatures = {
        type: "FeatureCollection" as const,
        features: [...state.features.features, action.feature],
      };
      return {
        ...state,
        features: nextFeatures,
        isDrawing: false,
        activeType: null,
        areaSqM: calcArea(nextFeatures),
        selectedFeatureIndex: state.features.features.length,
        selectedEdgeIndex: null,
      };
    }

    case "DELETE_FEATURE": {
      const nextFeatures = {
        type: "FeatureCollection" as const,
        features: state.features.features.filter((_, i) => i !== action.index),
      };
      return {
        ...state,
        features: nextFeatures,
        areaSqM: calcArea(nextFeatures),
        selectedFeatureIndex: null,
        selectedEdgeIndex: null,
      };
    }

    case "CLEAR_ALL":
      return {
        ...state,
        features: { type: "FeatureCollection", features: [] },
        isDrawing: false,
        activeType: null,
        selectedFeatureIndex: null,
        selectedEdgeIndex: null,
        areaSqM: null,
      };

    case "SELECT_FEATURE":
      return {
        ...state,
        selectedFeatureIndex: action.index,
        selectedEdgeIndex: null,
      };

    case "SELECT_EDGE":
      return { ...state, selectedEdgeIndex: action.index };

    case "UPDATE_FEATURE_PROP": {
      const feats = [...state.features.features];
      const f = feats[action.polyIdx];
      feats[action.polyIdx] = {
        ...f,
        properties: { ...f.properties, [action.key]: action.value },
      };
      return { ...state, features: { ...state.features, features: feats } };
    }

    case "UPDATE_EDGE_PROP": {
      const feats = [...state.features.features];
      const f = feats[action.polyIdx];
      const edges = f.properties?.edges ? [...f.properties.edges] : [];
      edges[action.edgeIdx] = {
        ...(edges[action.edgeIdx] || {}),
        [action.key]: action.value,
      };
      feats[action.polyIdx] = {
        ...f,
        properties: { ...f.properties, edges },
      };
      return { ...state, features: { ...state.features, features: feats } };
    }

    case "UPDATE_CONFIG":
      return { ...state, config: { ...state.config, [action.key]: action.value } };

    case "SET_JOB":
      return {
        ...state,
        job: {
          status: action.status,
          id: action.id ?? state.job.id,
          error: action.error ?? null,
          progress: action.progress ?? null,
        },
      };

    default:
      return state;
  }
}

/* ── Provider ────────────────────────────────── */

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Access the flood visualizer's loadDataset action
  const { loadDataset } = useFloodActions();

  /** Close any active SSE stream */
  const closeStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  /** Download result and load it into the visualizer */
  const loadResult = useCallback(
    async (resultPath: string) => {
      try {
        // resultPath is relative like "/api/simulate/abc123/result"
        const url = resultPath.startsWith("http")
          ? resultPath
          : `${API_URL}${resultPath}`;

        const dataset = await fetchResultDataset(url);
        loadDataset(dataset, 0);
      } catch (e: any) {
        console.error("Failed to load simulation result:", e);
        dispatch({
          type: "SET_JOB",
          status: "error",
          error: `Result download failed: ${e.message}`,
        });
      }
    },
    [loadDataset],
  );

  /** Open an SSE stream to follow job progress */
  const streamJobStatus = useCallback(
    (jobId: string) => {
      closeStream();

      const es = new EventSource(`${API_URL}/api/simulate/${jobId}/stream`);
      eventSourceRef.current = es;

      es.addEventListener("meshing", () => {
        dispatch({ type: "SET_JOB", status: "meshing", id: jobId });
      });

      es.addEventListener("progress", (e) => {
        try {
          const { progress } = JSON.parse(e.data);
          dispatch({ type: "SET_JOB", status: "solving", progress });
        } catch {
          dispatch({ type: "SET_JOB", status: "solving" });
        }
      });

      es.addEventListener("complete", async (e) => {
        let data: any = {};
        try {
          data = JSON.parse(e.data);
        } catch { }

        dispatch({
          type: "SET_JOB",
          status: "done",
          id: data.job_id ?? jobId,
        });
        es.close();
        eventSourceRef.current = null;

        // If the server included a result URL, download and visualize it
        if (data.file) {
          await loadResult(data.file);
        }
      });

      es.addEventListener("error", (e) => {
        const target = e as MessageEvent;
        let msg = "Connection to server lost";
        try {
          if (target.data) {
            const parsed = JSON.parse(target.data);
            msg = parsed.message || parsed.error || msg;
          }
        } catch { }
        dispatch({ type: "SET_JOB", status: "error", error: msg });
        es.close();
        eventSourceRef.current = null;
      });
    },
    [closeStream, loadResult],
  );

  /** Submit simulation: POST payload → open SSE stream */
  const submitSimulation = useCallback(async () => {
    closeStream();
    dispatch({ type: "SET_JOB", status: "submitting" });

    try {
      const payload = serializePayload(state);

      const res = await fetch(`${API_URL}/api/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`${res.status}: ${errText}`);
      }

      const data = await res.json();
      const jobId = data.job_id;

      if (!jobId) {
        throw new Error("Server did not return a job_id");
      }

      dispatch({ type: "SET_JOB", status: "meshing", id: jobId });
      streamJobStatus(jobId);
    } catch (e: any) {
      dispatch({ type: "SET_JOB", status: "error", error: e.message });
    }
  }, [state, closeStream, streamJobStatus]);

  const actions: SimulationActions = useMemo(
    () => ({
      startDrawing: (typeKey) => dispatch({ type: "START_DRAWING", typeKey }),
      stopDrawing: () => dispatch({ type: "STOP_DRAWING" }),
      addFeature: (feature) => dispatch({ type: "ADD_FEATURE", feature }),
      deleteFeature: (index) => dispatch({ type: "DELETE_FEATURE", index }),
      clearAll: () => {
        closeStream();
        dispatch({ type: "CLEAR_ALL" });
      },
      setSelectedFeatureIndex: (index) =>
        dispatch({ type: "SELECT_FEATURE", index }),
      setSelectedEdgeIndex: (index) =>
        dispatch({ type: "SELECT_EDGE", index }),
      updateFeatureProperty: (polyIdx, key, value) =>
        dispatch({ type: "UPDATE_FEATURE_PROP", polyIdx, key, value }),
      updateEdgeProperty: (polyIdx, edgeIdx, key, value) =>
        dispatch({ type: "UPDATE_EDGE_PROP", polyIdx, edgeIdx, key, value }),
      updateConfig: (key, value) =>
        dispatch({ type: "UPDATE_CONFIG", key, value }),
      submitSimulation,
    }),
    [submitSimulation, closeStream],
  );

  return (
    <SimulationStateContext.Provider value={state}>
      <SimulationActionsContext.Provider value={actions}>
        {children}
      </SimulationActionsContext.Provider>
    </SimulationStateContext.Provider>
  );
}

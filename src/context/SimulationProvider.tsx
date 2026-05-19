/* ─────────────────────────────────────────────
 *  SimulationProvider — owns drawing + config state
 * ───────────────────────────────────────────── */

import React, { useReducer, useMemo, useCallback } from "react";
import * as turf from "@turf/turf";
import type { Feature } from "geojson";
import {
  SimulationStateContext,
  SimulationActionsContext,
  type SimulationState,
  type SimulationActions,
  type JobStatus,
} from "./SimulationContext";
import { defaultSimConfig } from "../config/simulationConfig";
import { serializePayload } from "../utils/serialize";

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

function calcArea(fc: { features: any[] }): number | null {
  if (fc.features.length === 0) return null;
  return Math.round(turf.area(fc as any) * 100) / 100;
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
        selectedFeatureIndex: state.features.features.length, // auto-select new
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

  const submitSimulation = useCallback(async () => {
    dispatch({ type: "SET_JOB", status: "submitting" });

    try {
      const payload = serializePayload(state);
      console.log("▶ Submitting simulation:", payload);

      // TODO: replace with actual API call
      // const res = await fetch("/api/simulate", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(payload),
      // });
      // const data = await res.json();
      // dispatch({ type: "SET_JOB", status: "meshing", id: data.job_id });

      // Stub: simulate a brief delay
      await new Promise((r) => setTimeout(r, 500));
      dispatch({ type: "SET_JOB", status: "idle", id: "stub-123" });
    } catch (e: any) {
      dispatch({ type: "SET_JOB", status: "error", error: e.message });
    }
  }, [state]);

  const actions: SimulationActions = useMemo(
    () => ({
      startDrawing: (typeKey) => dispatch({ type: "START_DRAWING", typeKey }),
      stopDrawing: () => dispatch({ type: "STOP_DRAWING" }),
      addFeature: (feature) => dispatch({ type: "ADD_FEATURE", feature }),
      deleteFeature: (index) => dispatch({ type: "DELETE_FEATURE", index }),
      clearAll: () => dispatch({ type: "CLEAR_ALL" }),
      setSelectedFeatureIndex: (index) => dispatch({ type: "SELECT_FEATURE", index }),
      setSelectedEdgeIndex: (index) => dispatch({ type: "SELECT_EDGE", index }),
      updateFeatureProperty: (polyIdx, key, value) =>
        dispatch({ type: "UPDATE_FEATURE_PROP", polyIdx, key, value }),
      updateEdgeProperty: (polyIdx, edgeIdx, key, value) =>
        dispatch({ type: "UPDATE_EDGE_PROP", polyIdx, edgeIdx, key, value }),
      updateConfig: (key, value) => dispatch({ type: "UPDATE_CONFIG", key, value }),
      submitSimulation,
    }),
    [submitSimulation],
  );

  return (
    <SimulationStateContext.Provider value={state}>
      <SimulationActionsContext.Provider value={actions}>
        {children}
      </SimulationActionsContext.Provider>
    </SimulationStateContext.Provider>
  );
}

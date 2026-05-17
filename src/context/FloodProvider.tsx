/* ─────────────────────────────────────────────
 *  FloodProvider — owns all mutable state
 * ───────────────────────────────────────────── */

import React, { useReducer, useMemo, useRef, useEffect } from "react";
import {
  FloodStateContext,
  FloodActionsContext,
  type FloodState,
  type FloodActions,
} from "./FloodContext";
import type { FloodDataset, DecodedFrame } from "../types/flood";
import { buildTrianglePolygons } from "../utils/mesh";
import { createFrameCache, decodeFrame as decodeFrameUtil } from "../utils/decode";
import { theme } from "../config/theme";
import { buildColorLUT, precomputeAllColors, buildTriangleHistories } from "../utils/colors";

// ── Action types ──
type Action =
  | { type: "LOAD"; dataset: FloodDataset; fileSize: number }
  | { type: "SET_PROPERTY"; prop: string }
  | { type: "SET_FRAME"; frame: number }
  | { type: "SET_OPACITY"; opacity: number }
  | { type: "STEP_FRAME"; delta: number }
  | { type: "TOGGLE_PLAY" }
  | { type: "CYCLE_SPEED" }
  | { type: "SELECT_TRI"; index: number | null };

const initialState: FloodState = {
  dataset: null,
  triangles: null,
  colorLUT: null,
  frameCache: null,
  precomputedColors: null,
  triangleHistories: null,
  fileSize: 0,
  activeProperty: "depth",
  currentFrame: 0,
  opacity: theme.layer.defaultOpacity,
  isPlaying: false,
  playbackSpeed: 1,
  selectedTriangle: null,
};

function reducer(state: FloodState, action: Action): FloodState {
  switch (action.type) {
    case "LOAD": {
      const ds = action.dataset;
      const cache = createFrameCache();
      const lut = buildColorLUT(ds);
      const precomputed = precomputeAllColors(ds, lut);
      const histories = buildTriangleHistories(ds);
      return {
        ...state,
        dataset: ds,
        triangles: buildTrianglePolygons(ds.mesh, ds.meta.ntriangles),
        colorLUT: lut,
        precomputedColors: precomputed,
        triangleHistories: histories,
        frameCache: cache,
        fileSize: action.fileSize,
        activeProperty: ds.meta.properties[0] || "depth",
        currentFrame: 0,
        selectedTriangle: null,
        isPlaying: false,
        playbackSpeed: 1,
      };
    }
    case "SET_PROPERTY":
      return { ...state, activeProperty: action.prop };
    case "SET_FRAME":
      return { ...state, currentFrame: action.frame };
    case "SET_OPACITY":
      return { ...state, opacity: action.opacity };
    case "STEP_FRAME": {
      if (!state.dataset) return state;
      const max = state.dataset.frames.length - 1;
      const next = Math.max(0, Math.min(max, state.currentFrame + action.delta));
      return { ...state, currentFrame: next, isPlaying: false };
    }
    case "TOGGLE_PLAY":
      return { ...state, isPlaying: !state.isPlaying };
    case "CYCLE_SPEED": {
      const steps = theme.playback.speedSteps;
      const idx = steps.indexOf(state.playbackSpeed);
      const next = steps[(idx + 1) % steps.length];
      return { ...state, playbackSpeed: next };
    }
    case "SELECT_TRI":
      return { ...state, selectedTriangle: action.index };
    default:
      return state;
  }
}

export function FloodProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ref-based approach for the interval callback
  const frameRef = useRef(state.currentFrame);
  const maxFrameRef = useRef(0);
  frameRef.current = state.currentFrame;
  if (state.dataset) maxFrameRef.current = state.dataset.frames.length - 1;

  // ── Playback loop ──
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (state.isPlaying && state.dataset) {
      const ms = Math.max(
        theme.playback.minInterval,
        theme.playback.baseInterval / state.playbackSpeed,
      );
      intervalRef.current = setInterval(() => {
        const next = (frameRef.current + 1) % (maxFrameRef.current + 1);
        dispatch({ type: "SET_FRAME", frame: next });
      }, ms);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.isPlaying, state.playbackSpeed, state.dataset]);

  // ── Actions (stable references) ──
  const actions: FloodActions = useMemo(
    () => ({
      loadDataset: (dataset: FloodDataset, fileSize = 0) =>
        dispatch({ type: "LOAD", dataset, fileSize }),
      setActiveProperty: (prop: string) =>
        dispatch({ type: "SET_PROPERTY", prop }),
      setCurrentFrame: (frame: number) =>
        dispatch({ type: "SET_FRAME", frame }),
      setOpacity: (opacity: number) =>
        dispatch({ type: "SET_OPACITY", opacity }),
      stepFrame: (delta: number) =>
        dispatch({ type: "STEP_FRAME", delta }),
      togglePlay: () =>
        dispatch({ type: "TOGGLE_PLAY" }),
      cycleSpeed: () =>
        dispatch({ type: "CYCLE_SPEED" }),
      setSelectedTriangle: (index: number | null) =>
        dispatch({ type: "SELECT_TRI", index }),

      decodeFrame: (index: number): DecodedFrame | null => {
        if (!state.dataset || !state.frameCache) return null;
        return decodeFrameUtil(state.dataset, index, state.frameCache);
      },
    }),
    [state.dataset, state.frameCache],
  );

  return (
    <FloodStateContext.Provider value={state}>
      <FloodActionsContext.Provider value={actions}>
        {children}
      </FloodActionsContext.Provider>
    </FloodStateContext.Provider>
  );
}

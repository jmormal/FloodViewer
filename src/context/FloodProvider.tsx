
import React, { useReducer, useMemo, useRef, useEffect } from "react";
import { FloodStateContext, FloodActionsContext, type FloodState, type FloodActions } from "./FloodContext";
import type { FloodDataset, DecodedFrame } from "../types/flood";
import { buildTrianglePolygons } from "../utils/mesh";
import { theme } from "../config/theme";
import { precomputeAllColors } from "../utils/colors";

type Action = | { type: "LOAD"; dataset: FloodDataset; fileSize: number } | { type: "SET_PROPERTY"; prop: string } | { type: "SET_FRAME"; frame: number } | { type: "SET_OPACITY"; opacity: number } | { type: "STEP_FRAME"; delta: number } | { type: "TOGGLE_PLAY" } | { type: "CYCLE_SPEED" } | { type: "SELECT_TRI"; index: number | null };
const initialState: FloodState = { dataset: null, triangles: null, colorLUT: null, frameCache: null, precomputedColors: null, triangleHistories: null, fileSize: 0, activeProperty: "depth", currentFrame: 0, opacity: theme.layer.defaultOpacity, isPlaying: false, playbackSpeed: 1, selectedTriangle: null };

function reducer(state: FloodState, action: Action): FloodState {
  switch (action.type) {
    case "LOAD": {
      const ds = action.dataset;
      // Inject missing meta and legend for UI compatibility
      ds.meta = { nframes: ds.times.length, ntriangles: ds.triangles.length, properties: ["depth", "speed", "momentum", "hazard"], epsg_source: 25830, nclasses: 6, scale: "linear", nnodes: ds.vertices.length, rle: false };
      ds.legend = {
        depth: { label: "Depth", classes: [{min:0, max:0.5, color:"#f7fbff"}, {min:0.5, max:1, color:"#c6dbef"}, {min:1, max:1.5, color:"#6baed6"}, {min:1.5, max:2, color:"#2171b5"}, {min:2, max:2.5, color:"#08519c"}, {min:2.5, max:3.0, color:"#08306b"}] },
        speed: { label: "Speed", classes: [{min:0, max:0.6, color:"#ffffb2"}, {min:0.6, max:1.3, color:"#fed976"}, {min:1.3, max:2.0, color:"#fd8d3c"}, {min:2.0, max:2.6, color:"#fc4e2a"}, {min:2.6, max:3.3, color:"#e31a1c"}, {min:3.3, max:4.0, color:"#800026"}] },
        momentum: { label: "Momentum", classes: [{min:0, max:1, color:"#f7fcf5"}, {min:1, max:2, color:"#c7e9c0"}, {min:2, max:3, color:"#74c476"}, {min:3, max:4, color:"#31a354"}, {min:4, max:5, color:"#238b45"}, {min:5, max:6, color:"#00441b"}] },
        hazard: { label: "Hazard", classes: [{min:0, max:0.8, color:"#ffffd4"}, {min:0.8, max:1.6, color:"#fee391"}, {min:1.6, max:2.5, color:"#fe9929"}, {min:2.5, max:3.3, color:"#d95f0e"}, {min:3.3, max:4.1, color:"#993404"}, {min:4.1, max:5.0, color:"#662506"}] }
      };
      const precomputed = precomputeAllColors(ds);
      return { ...state, dataset: ds, triangles: buildTrianglePolygons(ds), precomputedColors: precomputed, fileSize: action.fileSize, activeProperty: "depth", currentFrame: 0, selectedTriangle: null, isPlaying: false, playbackSpeed: 1 };
    }
    case "SET_PROPERTY": return { ...state, activeProperty: action.prop };
    case "SET_FRAME": return { ...state, currentFrame: action.frame };
    case "SET_OPACITY": return { ...state, opacity: action.opacity };
    case "STEP_FRAME": {
      if (!state.dataset) return state;
      const max = state.dataset.times.length - 1;
      const next = Math.max(0, Math.min(max, state.currentFrame + action.delta));
      return { ...state, currentFrame: next, isPlaying: false };
    }
    case "TOGGLE_PLAY": return { ...state, isPlaying: !state.isPlaying };
    case "CYCLE_SPEED": {
      const steps = theme.playback.speedSteps;
      return { ...state, playbackSpeed: steps[(steps.indexOf(state.playbackSpeed) + 1) % steps.length] };
    }
    case "SELECT_TRI": return { ...state, selectedTriangle: action.index };
    default: return state;
  }
}

export function FloodProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameRef = useRef(state.currentFrame);
  const maxFrameRef = useRef(0);
  frameRef.current = state.currentFrame;
  if (state.dataset) maxFrameRef.current = state.dataset.times.length - 1;

  useEffect(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (state.isPlaying && state.dataset) {
      const ms = Math.max(theme.playback.minInterval, theme.playback.baseInterval / state.playbackSpeed);
      intervalRef.current = setInterval(() => {
        dispatch({ type: "SET_FRAME", frame: (frameRef.current + 1) % (maxFrameRef.current + 1) });
      }, ms);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [state.isPlaying, state.playbackSpeed, state.dataset]);

  const actions: FloodActions = useMemo(() => ({
    loadDataset: (dataset, fileSize = 0) => dispatch({ type: "LOAD", dataset, fileSize }),
    setActiveProperty: (prop) => dispatch({ type: "SET_PROPERTY", prop }),
    setCurrentFrame: (frame) => dispatch({ type: "SET_FRAME", frame }),
    setOpacity: (opacity) => dispatch({ type: "SET_OPACITY", opacity }),
    stepFrame: (delta) => dispatch({ type: "STEP_FRAME", delta }),
    togglePlay: () => dispatch({ type: "TOGGLE_PLAY" }),
    cycleSpeed: () => dispatch({ type: "CYCLE_SPEED" }),
    setSelectedTriangle: (index) => dispatch({ type: "SELECT_TRI", index }),
    decodeFrame: (index) => ({ _t: state.dataset?.times[index] || 0 })
  }), [state.dataset]);

  return <FloodStateContext.Provider value={state}><FloodActionsContext.Provider value={actions}>{children}</FloodActionsContext.Provider></FloodStateContext.Provider>;
}

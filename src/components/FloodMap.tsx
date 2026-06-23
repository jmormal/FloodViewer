/* ─────────────────────────────────────────────
 * FloodMap — DeckGL + polygon drawing + simulation panel
 *            + Open-Meteo weather raster overlay
 *
 * Weather overlay can be repositioned by HOLDING SHIFT
 * and dragging:
 *   - drag the body            → move
 *   - drag a corner handle     → resize
 *   - drag the rotation handle → rotate
 * Releasing Shift returns control to the map.
 * ───────────────────────────────────────────── */

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import DeckGL from "@deck.gl/react";
import Map from "react-map-gl/maplibre";
import {
  SolidPolygonLayer,
  BitmapLayer,
  ScatterplotLayer,
  PathLayer,
} from "@deck.gl/layers";
import "maplibre-gl/dist/maplibre-gl.css";

import { useFloodState, useFloodActions } from "../context/FloodContext";
import { useSimulationState } from "../context/SimulationContext";
import { computeBounds, estimateZoom } from "../utils/mesh";
import { theme } from "../config/theme";
import { usePolygonDraw } from "../hooks/usePolygonDraw";
import { SimulationPanel } from "./SimulationPanel";
import { usePolygonEdit } from "../hooks/usePolygonEdit";

import {
  fetchWeatherGrid,
  legendEntries,
  WEATHER_LABELS,
  transformFromBounds,
  transformToCorners,
  transformCenter,
  transformRotationHandle,
  transformResizeHandles,
  type WeatherGrid,
  type WeatherVariable,
  type WeatherTransform,
} from "../utils/weather";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const WEATHER_VARS: WeatherVariable[] = [
  "temperature_2m",
  "precipitation",
  "rain",
  "wind_speed_10m",
];

/** What the current Shift-drag is doing */
type DragMode =
  | null
  | { kind: "move"; startLng: number; startLat: number; origCenterLng: number; origCenterLat: number }
  | { kind: "resize"; corner: number }
  | { kind: "rotate" };

export function FloodMap() {
  /* ── Map Style State ───────────────────────── */
  const [useOsm, setUseOsm] = useState(false);

  /* ── Weather overlay state ─────────────────── */
  const [showWeather, setShowWeather] = useState(false);
  const [weatherVar, setWeatherVar] = useState<WeatherVariable>("temperature_2m");
  const [weatherGrid, setWeatherGrid] = useState<WeatherGrid | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherOpacity, setWeatherOpacity] = useState(0.55);

  /* ── Weather transform (move/resize/rotate) ── */
  const [transform, setTransform] = useState<WeatherTransform | null>(null);
  const [shiftHeld, setShiftHeld] = useState(false);
  const dragRef = useRef<DragMode>(null);
  const [dragging, setDragging] = useState(false);

  /* ── Flood-viz state ───────────────────────── */
  const {
    dataset,
    triangles,
    precomputedColors,
    currentFrame,
    activeProperty,
    opacity,
  } = useFloodState();
  const { decodeFrame, setSelectedTriangle } = useFloodActions();

  /* ── Simulation state (for cursor) ─────────── */
  const { isDrawing } = useSimulationState();

  const { editLayers, isDraggingVertex } = usePolygonEdit();
  const [initialView, setInitialView] = useState(theme.defaultView);

  useEffect(() => {
    if (!dataset) return;
    const bounds = computeBounds(dataset.vertices);
    setInitialView({
      longitude: bounds.centerLng,
      latitude: bounds.centerLat,
      zoom: estimateZoom(bounds),
      pitch: 0,
      bearing: 0,
    } as any);
  }, [dataset]);

  /* ── Track Shift key (enables transform mode) ── */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShiftHeld(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setShiftHeld(false);
        dragRef.current = null;
        setDragging(false);
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  /* ── Weather fetch effect ──────────────────── */
  useEffect(() => {
    if (!showWeather || !dataset) {
      setWeatherGrid(null);
      setWeatherError(null);
      return;
    }

    let cancelled = false;
    const bounds = computeBounds(dataset.vertices);

    setWeatherLoading(true);
    setWeatherError(null);

    fetchWeatherGrid(bounds, weatherVar)
      .then((grid) => {
        if (!cancelled) {
          setWeatherGrid(grid);
          setWeatherLoading(false);
          // Initialise the transform from the fetched bounds the first time,
          // or whenever there is no transform yet. Keep an existing transform
          // when only the variable changed, so the user's placement sticks.
          setTransform((prev) => prev ?? transformFromBounds(grid.bounds));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Weather fetch failed:", err);
          setWeatherError(err.message ?? "Weather fetch failed");
          setWeatherGrid(null);
          setWeatherLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [showWeather, weatherVar, dataset]);

  /* ── Reset transform when overlay is hidden ── */
  useEffect(() => {
    if (!showWeather) setTransform(null);
  }, [showWeather]);

  /* ── Polygon drawing (reads from SimulationContext) ── */
  const {
    drawLayers,
    handleClick: drawClick,
    handleHover: drawHover,
  } = usePolygonDraw();

  /* ── Reset transform to the data bounds ────── */
  const resetTransform = useCallback(() => {
    if (weatherGrid) setTransform(transformFromBounds(weatherGrid.bounds));
  }, [weatherGrid]);

  /* ── Transform drag handlers (only while Shift held) ── */
  const transformActive = showWeather && weatherGrid != null && transform != null;

  const onDragStart = useCallback(
    (info: any, event: any) => {
      if (!transformActive || !shiftHeld || !info.coordinate) return false;
      const [lng, lat] = info.coordinate;

      // Which gizmo part was grabbed?
      const layerId: string | undefined = info.layer?.id;
      if (layerId === "weather-rotate-handle") {
        dragRef.current = { kind: "rotate" };
      } else if (layerId === "weather-resize-handles" && info.object) {
        dragRef.current = { kind: "resize", corner: info.object.corner };
      } else if (
        layerId === "weather-raster" ||
        layerId === "weather-gizmo-outline" ||
        layerId === "weather-center-handle"
      ) {
        dragRef.current = {
          kind: "move",
          startLng: lng,
          startLat: lat,
          origCenterLng: transform!.centerLng,
          origCenterLat: transform!.centerLat,
        };
      } else {
        return false;
      }
      setDragging(true);
      event?.stopPropagation?.();
      return true; // consume → don't pan the map
    },
    [transformActive, shiftHeld, transform],
  );

  const onDrag = useCallback(
    (info: any, event: any) => {
      const mode = dragRef.current;
      if (!mode || !transform || !info.coordinate) return false;
      const [lng, lat] = info.coordinate;
      event?.stopPropagation?.();

      if (mode.kind === "move") {
        setTransform({
          ...transform,
          centerLng: mode.origCenterLng + (lng - mode.startLng),
          centerLat: mode.origCenterLat + (lat - mode.startLat),
        });
      } else if (mode.kind === "resize") {
        // New half-extents = distance from center to the dragged corner,
        // measured in the quad's own (un-rotated) frame.
        const dx = lng - transform.centerLng;
        const dy = lat - transform.centerLat;
        const rad = (-transform.rotationDeg * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        // inverse-rotate the offset back to axis-aligned
        const localX = dx * cos + dy * sin;
        const localY = -dx * sin + dy * cos;
        setTransform({
          ...transform,
          halfW: Math.max(0.0005, Math.abs(localX)),
          halfH: Math.max(0.0005, Math.abs(localY)),
        });
      } else if (mode.kind === "rotate") {
        const dx = lng - transform.centerLng;
        const dy = lat - transform.centerLat;
        // angle measured from +Y (north) axis, clockwise
        const angle = (Math.atan2(dx, dy) * 180) / Math.PI;
        setTransform({ ...transform, rotationDeg: angle });
      }
      return true;
    },
    [transform],
  );

  const onDragEnd = useCallback(() => {
    if (dragRef.current) {
      dragRef.current = null;
      setDragging(false);
      return true;
    }
    return false;
  }, []);

  /* ── Weather raster + gizmo layers ─────────── */
  const weatherLayers = useMemo(() => {
    if (!showWeather || !weatherGrid || !transform) return [];

    const corners = transformToCorners(transform);
    const layers: any[] = [
      new BitmapLayer({
        id: "weather-raster",
        image: weatherGrid.image,
        // four explicit corners → supports rotation natively
        bounds: corners as any,
        opacity: weatherOpacity,
        pickable: transformActive && shiftHeld,
        parameters: { depthTest: false },
        onDragStart,
        onDrag,
        onDragEnd,
        textureParameters: {
          minFilter: "nearest",
          magFilter: "nearest",
        },
      }),
    ];

    // Gizmo only while Shift is held (keeps the map clean otherwise)
    if (transformActive && shiftHeld) {
      const ring = [...corners, corners[0]];
      const center = transformCenter(transform);
      const rotHandle = transformRotationHandle(transform);
      const resizeHandles = transformResizeHandles(transform);

      layers.push(
        new PathLayer({
          id: "weather-gizmo-outline",
          data: [ring],
          getPath: (d: any) => d,
          getColor: [94, 187, 255, 230],
          getWidth: 2,
          widthUnits: "pixels" as const,
          pickable: true,
          parameters: { depthTest: false },
          onDragStart,
          onDrag,
          onDragEnd,
        }),
        // line from center to rotation handle
        new PathLayer({
          id: "weather-rotate-stem",
          data: [[center, rotHandle]],
          getPath: (d: any) => d,
          getColor: [94, 187, 255, 160],
          getWidth: 1.5,
          widthUnits: "pixels" as const,
          pickable: false,
          parameters: { depthTest: false },
        }),
        // center (move) handle
        new ScatterplotLayer({
          id: "weather-center-handle",
          data: [{ position: center }],
          getPosition: (d: any) => d.position,
          getFillColor: [94, 187, 255, 220],
          getLineColor: [255, 255, 255, 230],
          getRadius: 6,
          radiusUnits: "pixels" as const,
          stroked: true,
          lineWidthMinPixels: 2,
          pickable: true,
          parameters: { depthTest: false },
          onDragStart,
          onDrag,
          onDragEnd,
        }),
        // corner (resize) handles
        new ScatterplotLayer({
          id: "weather-resize-handles",
          data: resizeHandles,
          getPosition: (d: any) => d.position,
          getFillColor: [255, 255, 255, 240],
          getLineColor: [94, 187, 255, 240],
          getRadius: 6,
          radiusUnits: "pixels" as const,
          stroked: true,
          lineWidthMinPixels: 2,
          pickable: true,
          autoHighlight: true,
          parameters: { depthTest: false },
          onDragStart,
          onDrag,
          onDragEnd,
        }),
        // rotation handle
        new ScatterplotLayer({
          id: "weather-rotate-handle",
          data: [{ position: rotHandle }],
          getPosition: (d: any) => d.position,
          getFillColor: [251, 176, 59, 240],
          getLineColor: [255, 255, 255, 240],
          getRadius: 7,
          radiusUnits: "pixels" as const,
          stroked: true,
          lineWidthMinPixels: 2,
          pickable: true,
          autoHighlight: true,
          parameters: { depthTest: false },
          onDragStart,
          onDrag,
          onDragEnd,
        }),
      );
    }

    return layers;
  }, [
    showWeather,
    weatherGrid,
    transform,
    weatherOpacity,
    transformActive,
    shiftHeld,
    onDragStart,
    onDrag,
    onDragEnd,
  ]);

  /* ── Flood-triangle layer ──────────────────── */
  const floodLayers = useMemo(() => {
    if (!triangles || !precomputedColors) return [];
    const src = precomputedColors[activeProperty]?.[currentFrame];
    if (!src) return [];

    return [
      new SolidPolygonLayer({
        id: "flood-triangles",
        data: triangles,
        getPolygon: (d: any) => d,
        getFillColor: (_d: any, { index }: { index: number }) => {
          const off = index * 4;
          return [src[off], src[off + 1], src[off + 2], src[off + 3]];
        },
        updateTriggers: { getFillColor: [currentFrame, activeProperty] },
        opacity,
        // disable picking while transforming the weather overlay so clicks
        // don't fall through to triangle selection
        pickable: !isDrawing && !(transformActive && shiftHeld),
        extruded: false,
        material: false,
        parameters: { depthTest: false },
        onClick: (info: any) => {
          if (info.index >= 0) setSelectedTriangle(info.index);
        },
      }),
    ];
  }, [
    triangles,
    precomputedColors,
    currentFrame,
    activeProperty,
    opacity,
    isDrawing,
    transformActive,
    shiftHeld,
    setSelectedTriangle,
  ]);

  /* ── Combined layers (weather → flood → draw → edit) ── */
  const layers = useMemo(
    () => [...weatherLayers, ...floodLayers, ...drawLayers, ...editLayers],
    [weatherLayers, floodLayers, drawLayers, editLayers],
  );

  /* ── Tooltip ───────────────────────────────── */
  const renderTooltip = useCallback(
    ({ object, index, layer }: any) => {
      if (isDrawing) return null;
      if (layer?.id !== "flood-triangles") return null;
      if (object == null || index < 0 || !dataset) return null;
      const frame = decodeFrame(currentFrame);
      if (!frame) return null;
      const tri = dataset.triangles[index] as any;
      const val =
        activeProperty === "hazard"
          ? tri.depth[currentFrame] * tri.speed[currentFrame]
          : tri[activeProperty]?.[currentFrame];
      if (!val || val < 0.01) return null;
      return `${dataset.legend[activeProperty]?.label || activeProperty.toUpperCase()}\n${val.toFixed(2)}`;
    },
    [isDrawing, dataset, currentFrame, activeProperty, decodeFrame],
  );

  /* ── Cursor ────────────────────────────────── */
  const getCursor = useCallback(
    ({ isDragging }: { isDragging: boolean }) => {
      if (transformActive && shiftHeld) return dragging ? "grabbing" : "move";
      if (isDrawing) return "crosshair";
      if (isDragging) return "grabbing";
      return "grab";
    },
    [isDrawing, transformActive, shiftHeld, dragging],
  );

  /* ── Weather legend (stretched to live min/max) ── */
  const weatherLegend = useMemo(() => {
    if (!weatherGrid) return [];
    return legendEntries(weatherGrid.variable, weatherGrid.min, weatherGrid.max);
  }, [weatherGrid]);

  const weatherFlat = weatherGrid != null && weatherGrid.max - weatherGrid.min < 1e-6;

  /* ── Render ────────────────────────────────── */
  return (
    <div className="absolute inset-0 z-0">
      {/* Controls stack (only when a dataset is loaded) */}
      {dataset && (
        <div className="absolute bottom-16 left-4 z-[1000] flex flex-col gap-2 items-start">
          {/* Map style toggle */}
          <button
            onClick={() => setUseOsm(!useOsm)}
            className="
              panel flex items-center gap-2 px-3 py-2
              rounded-md border transition-all duration-200 shadow-lg
              bg-[#0a0e17]/90 backdrop-blur-md text-xs font-medium text-white/80
              hover:text-white border-white/10 hover:border-accent/40
            "
          >
            <span className="text-accent">{useOsm ? "🗺️" : "🌙"}</span>
            {useOsm ? "Switch to Dark Map" : "Switch to Street Map"}
          </button>

          {/* Weather toggle */}
          <button
            onClick={() => setShowWeather((s) => !s)}
            className="
              panel flex items-center gap-2 px-3 py-2
              rounded-md border transition-all duration-200 shadow-lg
              bg-[#0a0e17]/90 backdrop-blur-md text-xs font-medium text-white/80
              hover:text-white border-white/10 hover:border-accent/40
            "
          >
            <span className="text-accent">🌦️</span>
            {showWeather ? "Hide Weather" : "Show Weather (Open-Meteo)"}
          </button>

          {/* Weather controls + legend */}
          {showWeather && (
            <div className="panel flex flex-col gap-2 p-3 bg-[#0a0e17]/90 backdrop-blur-md border border-white/10 rounded-md shadow-lg min-w-[190px]">
              <label className="ctrl-label !mb-0">Weather Variable</label>
              <select
                value={weatherVar}
                onChange={(e) =>
                  setWeatherVar(e.target.value as WeatherVariable)
                }
                className="
                  px-2 py-1.5 rounded-md border border-white/10
                  bg-white/5 text-xs text-white/80 outline-none
                  focus:border-accent/40
                "
              >
                {WEATHER_VARS.map((v) => (
                  <option key={v} value={v}>
                    {WEATHER_LABELS[v].label}
                  </option>
                ))}
              </select>

              {/* Opacity */}
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={weatherOpacity}
                  onChange={(e) => setWeatherOpacity(Number(e.target.value))}
                  className="slider flex-1"
                />
                <span className="font-mono text-[10px] text-dim w-8 text-right">
                  {Math.round(weatherOpacity * 100)}%
                </span>
              </div>

              {/* Transform hint + reset */}
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-[10px] ${shiftHeld ? "text-accent" : "text-dim"}`}
                >
                  {shiftHeld
                    ? "✋ Transform mode — drag to move / corners to resize / amber dot to rotate"
                    : "Hold ⇧ Shift to move / resize / rotate"}
                </span>
              </div>
              <button
                onClick={resetTransform}
                className="
                  text-[10px] px-2 py-1 rounded border border-white/10
                  bg-white/5 text-white/70 hover:text-white hover:border-accent/40
                  transition
                "
              >
                ↺ Reset position
              </button>

              {/* Legend (colours stretched to the live data range) */}
              {weatherGrid && !weatherLoading && (
                <div className="flex flex-col gap-1 mt-1">
                  <div className="text-[10px] font-semibold tracking-wider uppercase text-dim">
                    {WEATHER_LABELS[weatherVar].label} (
                    {WEATHER_LABELS[weatherVar].unit})
                  </div>

                  {weatherFlat ? (
                    <div className="font-mono text-[10px] text-dim">
                      uniform: {weatherGrid.min.toFixed(2)}{" "}
                      {WEATHER_LABELS[weatherVar].unit} across the area
                    </div>
                  ) : (
                    <>
                      {weatherLegend.map((entry, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div
                            className="w-5 h-3 rounded-sm border border-white/10 shrink-0"
                            style={{
                              backgroundColor: `rgb(${entry.color[0]},${entry.color[1]},${entry.color[2]})`,
                            }}
                          />
                          <span className="font-mono text-[10px] text-white/75">
                            {entry.value.toFixed(1)}
                          </span>
                        </div>
                      ))}
                      <div className="font-mono text-[9px] text-dim mt-1 leading-snug">
                        colours stretched to range{" "}
                        {weatherGrid.min.toFixed(1)}–{weatherGrid.max.toFixed(1)}{" "}
                        {WEATHER_LABELS[weatherVar].unit}
                      </div>
                    </>
                  )}
                </div>
              )}

              {weatherLoading && (
                <div className="text-[11px] text-accent">⏳ Loading…</div>
              )}
              {weatherError && (
                <div className="text-[11px] text-[#ff6b6b]">
                  ✕ {weatherError}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <DeckGL
        initialViewState={initialView}
        layers={layers}
        getTooltip={isDrawing ? undefined : renderTooltip}
        getCursor={getCursor}
        controller={{
          doubleClickZoom: !isDrawing,
          // lock the map while dragging a vertex OR transforming the overlay
          dragPan: !isDraggingVertex && !(transformActive && shiftHeld),
          dragRotate: !(transformActive && shiftHeld),
        }}
        onClick={drawClick}
        onHover={drawHover}
      >
        {/* Toggle between OSM and Dark style based on state */}
        <Map
          mapStyle={useOsm ? theme.mapStyleOsm : theme.mapStyleDark}
          reuseMaps
        />
      </DeckGL>
      <SimulationPanel />
    </div>
  );
}

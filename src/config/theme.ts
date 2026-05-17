/* ─────────────────────────────────────────────
 *  Theme configuration
 *  Edit this file to reskin the entire app.
 * ───────────────────────────────────────────── */

export const theme = {
  /** MapLibre basemap style URL */
  mapStyle: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",

  /** Default camera (overridden once data loads) */
  defaultView: {
    longitude: -0.42,
    latitude: 39.427,
    zoom: 12,
    pitch: 0,
    bearing: 0,
  },

  /** Playback defaults */
  playback: {
    /** Milliseconds per frame at 1× speed */
    baseInterval: 350,
    /** Fastest allowed interval (ms) */
    minInterval: 50,
    /** Speed multipliers the user can cycle through */
    speedSteps: [1, 2, 4],
  },

  /** Triangle layer defaults */
  layer: {
    defaultOpacity: 0.7,
    /** Alpha channel max (0-255). Actual alpha = opacity × this value */
    alphaScale: 220,
  },

  /** Frame decode cache size (LRU) */
  frameCacheSize: 60,

  /** Human-friendly labels for property keys */
  propertyLabels: {
    depth: "Depth",
    speed: "Speed",
    momentum: "Momentum",
    hazard: "Hazard",
  } as Record<string, string>,
} as const;

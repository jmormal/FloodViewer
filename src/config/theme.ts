// src/config/theme.ts

export const theme = {
  // Default camera view (overridden when a dataset loads)
  defaultView: {
    longitude: -0.3763,
    latitude: 39.4699,
    zoom: 12,
    pitch: 0,
    bearing: 0,
  },

  // Missing layer config added here
  layer: {
    defaultOpacity: 0.8, // Default starting opacity (0.1 to 1.0)
  },

  // Missing playback config added here
  playback: {
    speedSteps: [0.5, 1, 2, 4, 8], // Multipliers for the cycle speed button
    baseInterval: 1000,            // Base milliseconds per frame at 1x speed
    minInterval: 50,               // Hard limit to prevent browser freezing
  },

  // 1. The original dark style
  mapStyleDark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",

  // 2. The new OpenStreetMap raster style
  mapStyleOsm: {
    version: 8,
    sources: {
      "osm-raster-tiles": {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors",
      },
    },
    layers: [
      {
        id: "osm-raster-layer",
        type: "raster",
        source: "osm-raster-tiles",
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  },

  // Labels used by the PropertySelector component
  propertyLabels: {
    depth: "Depth",
    elevation: "Elevation",
    hazard: "Hazard",
    speed: "Speed",
  } as Record<string, string>,
};

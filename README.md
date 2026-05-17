# DANA Flood Viewer v3 — React

GPU-accelerated flood simulation viewer built with **React**, **TypeScript**, **MapLibre GL**, **deck.gl**, and **Tailwind CSS v4**.

## Architecture

```
src/
├── main.tsx                    ← React entry point
├── index.css                   ← Tailwind + custom component classes
│
├── config/
│   └── theme.ts                ← Single source of truth (colors, map style,
│                                  playback speeds, labels)
├── types/
│   ├── flood.ts                ← Full data model (FloodDataset, DecodedFrame…)
│   └── index.ts                ← Barrel export
│
├── utils/
│   ├── decode.ts               ← RLE decoder + LRU frame cache
│   ├── colors.ts               ← hex→RGB + color LUT builder
│   ├── mesh.ts                 ← Triangle polygon builder + bounding box
│   ├── fileLoader.ts           ← .json / .json.gz file reader
│   └── demo.ts                 ← Synthetic demo data generator
│
├── context/
│   ├── FloodContext.ts         ← React contexts + typed hooks
│   └── FloodProvider.tsx       ← useReducer state machine + playback loop
│
├── hooks/
│   └── useFloodLayer.ts        ← Builds the deck.gl SolidPolygonLayer
│
└── components/
    ├── App.tsx                 ← Top-level orchestrator
    ├── FloodMap.tsx            ← MapLibre + deck.gl overlay
    ├── FileDrop.tsx            ← Drag-and-drop upload zone
    ├── LoadingOverlay.tsx      ← Spinner during load
    ├── TopBar.tsx              ← Title + metadata bar
    ├── ControlPanel.tsx        ← Sidebar (composes sub-components)
    ├── PropertySelector.tsx    ← Property toggle buttons
    ├── TimeControls.tsx        ← Frame slider + transport buttons
    ├── OpacitySlider.tsx       ← Layer opacity
    ├── Legend.tsx              ← Color scale reference
    └── FileSizeBadge.tsx       ← File size indicator
```

### Data flow

```
FloodProvider (useReducer)
  │
  ├── FloodStateContext ─────→ all components read from here
  └── FloodActionsContext ───→ all components dispatch through here
                                  │
              useFloodLayer() ←───┘  (memoized deck.gl layer)
                  │
                  ▼
              FloodMap (react-map-gl + MapboxOverlay)
```

## Quick start

```bash
npm install
npm run dev
```

## Customization guide

### Reskin the entire app

Edit **`src/config/theme.ts`**:

| Key                     | What it controls                             |
|-------------------------|----------------------------------------------|
| `mapStyle`              | MapLibre basemap URL (dark, light, satellite) |
| `defaultView`           | Initial camera position                      |
| `playback.baseInterval` | Animation speed                              |
| `layer.defaultOpacity`  | Starting opacity                             |
| `propertyLabels`        | Human-readable names for each property       |

### Change colors

Edit **`src/index.css`** — the `@theme` block at the top defines all design tokens:

```css
@theme {
  --color-accent: #5ebbff;      /* Primary accent color  */
  --color-dim: #8892a4;          /* Muted text            */
  --color-surface: rgba(…);      /* Panel backgrounds     */
  --color-border: rgba(…);       /* Panel borders         */
  --color-track: #1e2738;        /* Slider track          */
  --font-family-mono: …;         /* Monospace font        */
  --font-family-sans: …;         /* Body font             */
}
```

### Add a new property

1. Your JSON data already has the property in `meta.properties` and `legend`.
2. Add a label in `theme.ts → propertyLabels`.
3. That's it — the UI auto-generates buttons and legends.

### Add a new UI panel

1. Create a component in `src/components/`.
2. Use `useFloodState()` to read and `useFloodActions()` to write.
3. Drop it into `App.tsx` next to the other panels.

### Swap the basemap

Change `theme.mapStyle` to any MapLibre-compatible style URL:
- `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json` (light)
- `https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json` (colorful)
- Any self-hosted style or Mapbox/MapTiler URL

## Tech stack

| Library             | Role                        |
|---------------------|-----------------------------|
| React 18            | UI framework                |
| TypeScript          | Type safety                 |
| Vite                | Build tool                  |
| Tailwind CSS v4     | Utility-first styling       |
| MapLibre GL JS      | WebGL basemap               |
| react-map-gl        | React wrapper for MapLibre  |
| deck.gl             | GPU-accelerated data layers |
# FloodViewer
# FloodViewer

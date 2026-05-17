/* ─────────────────────────────────────────────
 *  Synthetic demo dataset (Paiporta area)
 *  Generates a radial flood pulse for testing.
 * ───────────────────────────────────────────── */

import type { FloodDataset } from "../types/flood";

interface DemoOptions {
  /** Grid cells per axis */
  gridSize?: number;
  /** Number of time frames */
  numFrames?: number;
  /** Number of color classes */
  numClasses?: number;
  /** Center longitude */
  centerLng?: number;
  /** Center latitude */
  centerLat?: number;
}

const DEFAULTS: Required<DemoOptions> = {
  gridSize: 80,
  numFrames: 30,
  numClasses: 6,
  centerLng: -0.4185,
  centerLat: 39.426,
};

const PROPERTIES = ["depth", "speed", "momentum", "hazard"] as const;

const MAX_VALUES: Record<string, number> = {
  depth: 3, speed: 4, momentum: 6, hazard: 5,
};

const SCALE_FACTORS: Record<string, number> = {
  depth: 1, speed: 0.75, momentum: 0.6, hazard: 0.5,
};

const COLOR_RAMPS: Record<string, string[]> = {
  depth:    ["#f7fbff", "#c6dbef", "#6baed6", "#2171b5", "#08519c", "#08306b"],
  speed:    ["#ffffb2", "#fed976", "#fd8d3c", "#fc4e2a", "#e31a1c", "#800026"],
  momentum: ["#f7fcf5", "#c7e9c0", "#74c476", "#31a354", "#238b45", "#00441b"],
  hazard:   ["#ffffd4", "#fee391", "#fe9929", "#d95f0e", "#993404", "#662506"],
};

export function generateDemoData(opts: DemoOptions = {}): FloodDataset {
  const { gridSize: N, numFrames: nf, numClasses: nc, centerLng: cx, centerLat: cy } =
    { ...DEFAULTS, ...opts };

  const span = [0.025, 0.018];
  const w = N + 1;

  // ── Vertices (flat) ──
  const vertices: number[] = [];
  for (let iy = 0; iy <= N; iy++) {
    for (let ix = 0; ix <= N; ix++) {
      vertices.push(
        Math.round((cx - span[0] / 2 + (ix / N) * span[0]) * 1e5) / 1e5,
        Math.round((cy - span[1] / 2 + (iy / N) * span[1]) * 1e5) / 1e5,
      );
    }
  }

  // ── Triangle indices ──
  const triangles: number[] = [];
  for (let iy = 0; iy < N; iy++) {
    for (let ix = 0; ix < N; ix++) {
      const bl = iy * w + ix;
      triangles.push(bl, bl + 1, bl + w);
      triangles.push(bl + 1, bl + w + 1, bl + w);
    }
  }

  const ntri = N * N * 2;
  const nn = w * w;

  // ── Legend ──
  const legend: FloodDataset["legend"] = {};
  for (const p of PROPERTIES) {
    const step = MAX_VALUES[p] / nc;
    legend[p] = {
      label: p[0].toUpperCase() + p.slice(1),
      classes: COLOR_RAMPS[p].map((color, i) => ({
        min: Math.round(i * step * 1e3) / 1e3,
        max: Math.round((i + 1) * step * 1e3) / 1e3,
        color,
      })),
    };
  }

  // ── Triangle centroids (for value computation) ──
  const centroids: [number, number][] = [];
  for (let t = 0; t < ntri; t++) {
    const a = triangles[t * 3], b = triangles[t * 3 + 1], c = triangles[t * 3 + 2];
    centroids.push([
      (vertices[a * 2] + vertices[b * 2] + vertices[c * 2]) / 3,
      (vertices[a * 2 + 1] + vertices[b * 2 + 1] + vertices[c * 2 + 1]) / 3,
    ]);
  }

  // ── Frames ──
  const frames: FloodDataset["frames"] = [];
  for (let f = 0; f < nf; f++) {
    const t = f * 6;
    const prog = Math.min(1, f / (nf * 0.55));
    const dec = f > nf * 0.7 ? (nf - f) / (nf * 0.3) : 1;
    const r = (0.003 + prog * 0.012) * dec;

    const fr: FloodDataset["frames"][0] = { t };

    for (const p of PROPERTIES) {
      const sc = SCALE_FACTORS[p];
      let s = "";
      for (let i = 0; i < ntri; i++) {
        const dx = centroids[i][0] - cx;
        const dy = centroids[i][1] - (cy - 0.003);
        const d = Math.sqrt(dx * dx * 2 + dy * dy);
        const val = Math.max(0, (1 - d / (r * sc)) * MAX_VALUES[p] * dec);

        if (val < 0.01) {
          s += ".";
        } else {
          s += String.fromCharCode(65 + Math.min(Math.floor((val / MAX_VALUES[p]) * nc), nc - 1));
        }
      }
      fr[p] = s;
    }

    frames.push(fr);
  }

  return {
    version: 2,
    meta: {
      epsg_source: 25830,
      nclasses: nc,
      scale: "linear",
      ntriangles: ntri,
      nnodes: nn,
      nframes: nf,
      properties: [...PROPERTIES],
      rle: false,
    },
    legend,
    mesh: { vertices, triangles },
    frames,
  };
}

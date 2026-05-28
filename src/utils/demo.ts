
import type { FloodDataset, Vertex, Triangle } from "../types/flood";

export function generateDemoData(): FloodDataset {
  const N = 20; // 20x20 grid
  const times = Array.from({ length: 30 }, (_, i) => i * 60);
  const vertices: Vertex[] = [];

  for (let i = 0; i < N * N; i++) {
    vertices.push({
      lat: 39.42 + Math.floor(i / N) * 0.001,
      lon: -0.42 + (i % N) * 0.001,
    });
  }

  const triangles: Triangle[] = [];
  for (let i = 0; i < N - 1; i++) {
    for (let j = 0; j < N - 1; j++) {
      const idx = i * N + j;

      // Fake physics wave
      const depths = times.map(t => Math.max(0, Math.sin(t / 300.0 - (i + j) / 10.0) * 3.0));
      const speeds = depths.map(d => d * 1.2);
      const zeros = times.map(() => 0.0);

      triangles.push({
        vertices: [idx, idx + 1, idx + N],
        elevation: 10.0,
        friction: 0.03,
        stage: depths,
        depth: depths,
        speed: speeds,
        xmomentum: zeros,
        ymomentum: zeros,
        xvelocity: zeros,
        yvelocity: zeros
      });
      triangles.push({
        vertices: [idx + 1, idx + N + 1, idx + N],
        elevation: 10.0,
        friction: 0.03,
        stage: depths,
        depth: depths,
        speed: speeds,
        xmomentum: zeros,
        ymomentum: zeros,
        xvelocity: zeros,
        yvelocity: zeros
      });
    }
  }

  return {
    times,
    vertices,
    triangles,
    meta: {} as any,   // Injected by FloodProvider on load
    legend: {} as any  // Injected by FloodProvider on load
  } as FloodDataset;
}

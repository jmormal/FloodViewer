/* ─────────────────────────────────────────────
 *  File I/O — read .json or .json.gz uploads
 * ───────────────────────────────────────────── */

import type { FloodDataset } from "../types/flood";

export interface LoadResult {
  dataset: FloodDataset;
  fileSize: number;
}

/**
 * Read a File object (JSON or gzipped JSON) and parse it.
 * Throws on invalid JSON.
 */
export async function readFloodFile(file: File): Promise<LoadResult> {
  let text: string;

  if (file.name.endsWith(".gz")) {
    const ds = new DecompressionStream("gzip");
    const chunks: Uint8Array[] = [];
    const reader = file.stream().pipeThrough(ds).getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    text = await new Blob(chunks).text();
  } else {
    text = await file.text();
  }

  return {
    dataset: JSON.parse(text) as FloodDataset,
    fileSize: file.size,
  };
}

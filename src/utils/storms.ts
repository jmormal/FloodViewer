/* ─────────────────────────────────────────────
 *  storms — read-only client for the storm catalog
 * ───────────────────────────────────────────── */

import { authFetch } from "../auth/keycloak";
import { API_URL } from "./api";

export interface StormSummary {
  public_id: string;
  name: string;
  description: string | null;
  event_date: string | null;
  timestep_s: number;
  n_frames: number;
  grid_rows: number;
  grid_cols: number;
  cell_size_m: number;
  units: string;
  /** Geographic center of the source rasters (WGS84) — null if it couldn't
   *  be determined at upload time (missing/unparseable CRS). */
  center_lng: number | null;
  center_lat: number | null;
  total_depth_mm: number | null;
  peak_intensity_mm_hr: number | null;
  created_at: string;
}

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function listStorms(): Promise<StormSummary[]> {
  return asJson(await authFetch(`${API_URL}/api/storms`));
}

export async function getStorm(publicId: string): Promise<StormSummary> {
  return asJson(await authFetch(`${API_URL}/api/storms/${publicId}`));
}

/** Accumulated-rainfall grid (sum of every frame, in mm) for the placed-storm bitmap. */
export interface StormPreview {
  rows: number;
  cols: number;
  units: string;
  values: number[];
  min: number;
  max: number;
}

export async function getStormPreview(publicId: string): Promise<StormPreview> {
  return asJson(await authFetch(`${API_URL}/api/storms/${publicId}/preview`));
}

export interface NewStormInput {
  name: string;
  description?: string;
  eventDate?: string;
  timestepS: number;
  units: "mm_per_step" | "mm_hr";
  /** Ordered rainfall frames — one GeoTIFF per timestep, in playback order. */
  files: File[];
}

/** Uploads an ordered stack of GeoTIFF frames as one storm. */
export async function createStorm(
  input: NewStormInput,
): Promise<{ public_id: string }> {
  const form = new FormData();
  form.set("name", input.name);
  if (input.description) form.set("description", input.description);
  if (input.eventDate) form.set("event_date", input.eventDate);
  form.set("timestep_s", String(input.timestepS));
  form.set("units", input.units);
  for (const file of input.files) form.append("files", file);

  return asJson(
    await authFetch(`${API_URL}/api/storms`, {
      method: "POST",
      body: form,
    }),
  );
}

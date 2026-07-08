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

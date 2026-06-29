/* ─────────────────────────────────────────────
 *  api — typed client for the instance endpoints
 *
 *  Every call goes through authFetch, which refreshes
 *  the Keycloak token and attaches the bearer header.
 * ───────────────────────────────────────────── */

import { authFetch } from "../auth/keycloak";
import type { SimulationPayload } from "./serialize";

const API_URL = import.meta.env.VITE_API_URL || "https://api.127.0.0.1.nip.io";

/** Row returned by the list/get endpoints (no heavy columns in the list). */
export interface InstanceSummary {
  public_id: string;
  instance_name: string;
  instance_description: string | null;
  is_solved: boolean;
  created_at: string;
  updated_at: string;
}

/** Full instance, including the saved setup payload. */
export interface InstanceDetail extends InstanceSummary {
  instance: SimulationPayload | null;
}

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${text ? `: ${text}` : ""}`);
  }
  return res.json() as Promise<T>;
}

export async function listInstances(): Promise<InstanceSummary[]> {
  return asJson(await authFetch(`${API_URL}/api/instances`));
}

export async function createInstance(
  name: string,
  description?: string,
): Promise<InstanceSummary> {
  return asJson(
    await authFetch(`${API_URL}/api/instances`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: description ?? null }),
    }),
  );
}

export async function getInstance(publicId: string): Promise<InstanceDetail> {
  return asJson(await authFetch(`${API_URL}/api/instances/${publicId}`));
}

/**
 * Patch any subset of fields. Sending `instance` (the setup payload) marks the
 * row unsolved server-side and clears the stored solution.
 */
export async function updateInstance(
  publicId: string,
  patch: {
    name?: string;
    description?: string | null;
    instance?: SimulationPayload;
  },
): Promise<InstanceSummary> {
  return asJson(
    await authFetch(`${API_URL}/api/instances/${publicId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }),
  );
}

export async function deleteInstance(publicId: string): Promise<void> {
  const res = await authFetch(`${API_URL}/api/instances/${publicId}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Delete failed: ${res.status}`);
  }
}

export async function enqueueSimulation(
  publicId: string,
): Promise<{ job_id: string }> {
  return asJson(
    await authFetch(`${API_URL}/api/instances/${publicId}/simulate`, {
      method: "POST",
    }),
  );
}

export { API_URL };

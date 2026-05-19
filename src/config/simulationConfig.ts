/* ─────────────────────────────────────────────
 *  Simulation Configuration
 *
 *  Parameters for mesh generation and ANUGA solver.
 *  Uses the same PropertyDef type as polygonTypes
 *  so the UI can render them with the same component.
 * ───────────────────────────────────────────── */

import type { PropertyDef } from "./polygonTypes";

export const SIMULATION_PARAMS: PropertyDef[] = [
  {
    key: "mesh_max_area",
    label: "Max Triangle Area",
    type: "number",
    default: 100,
    min: 1,
    step: 10,
    unit: "m²",
  },
  {
    key: "duration",
    label: "Duration",
    type: "number",
    default: 3600,
    min: 60,
    step: 60,
    unit: "s",
  },
  {
    key: "output_timestep",
    label: "Output Timestep",
    type: "number",
    default: 60,
    min: 1,
    step: 10,
    unit: "s",
  },
  {
    key: "manning_default",
    label: "Default Friction (Manning n)",
    type: "number",
    default: 0.03,
    min: 0.001,
    max: 0.2,
    step: 0.001,
  },
  {
    key: "flow_algorithm",
    label: "Flow Algorithm",
    type: "select",
    default: "DE0",
    options: [
      { value: "DE0", label: "DE0 (default)" },
      { value: "DE1", label: "DE1 (2nd order)" },
    ],
  },
];

/** Build default config values */
export function defaultSimConfig(): Record<string, any> {
  const cfg: Record<string, any> = {};
  for (const p of SIMULATION_PARAMS) {
    cfg[p.key] = p.default;
  }
  return cfg;
}
